import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import PaymentProvider from '../assets/js/payment-provider.js';
import PaymentService from '../api/lib/payment-service.js';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');

test('SePay Sacombank 79202012546: migration 013 + verifier + topup/deposit settlement + security guards', async t => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, phone text, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
      CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT ON storage.objects TO authenticated;
    `);

    for (const file of [
      '_db/production_001_release.sql',
      '_db/production_005_order_identity.sql',
      '_db/production_006_vietqr_payment.sql',
      '_db/production_007_user_member_center.sql'
    ]) {
      await db.exec(await read(file));
    }

    // Metadata fixture for production_002 required by 009 preflight
    await db.exec(`
      ALTER TABLE public.order_credentials RENAME COLUMN account_password TO account_password_ciphertext;
      CREATE FUNCTION namcumz_private.credential_key() RETURNS text LANGUAGE sql AS $fixture$ SELECT repeat('x',32) $fixture$;
      REVOKE ALL ON FUNCTION namcumz_private.credential_key() FROM PUBLIC,anon,authenticated;
      CREATE FUNCTION public.get_order_credentials(uuid) RETURNS text LANGUAGE sql AS $fixture$ SELECT NULL::text $fixture$;
      REVOKE ALL ON FUNCTION public.get_order_credentials(uuid) FROM PUBLIC,anon,authenticated;
      GRANT EXECUTE ON FUNCTION public.get_order_credentials(uuid) TO authenticated;
      INSERT INTO namcumz_private.migrations(version) VALUES('production_002_credentials_encryption');
      REVOKE ALL ON public.order_credentials FROM authenticated;
    `);

    await db.exec(await read('_db/production_009_launch_access.sql'));
    await db.exec(await read('_db/production_012_security_hardening.sql'));
    await db.exec(await read('_db/production_013_sepay_sacombank.sql'));

    // 1. Verifier passes and rejects drift
    await t.test('1. production_013_verify.sql passes and rejects privilege/marker drift', async () => {
      const verifySql = await read('_db/production_013_verify.sql');
      await db.exec(verifySql);

      // app_contract_version remains production_009_launch_access for zero-downtime rollout
      const ver = (await db.query('SELECT public.app_contract_version() AS v')).rows[0].v;
      assert.equal(ver, 'production_009_launch_access');

      const body = verifySql.slice(verifySql.indexOf('DO $verify$'), verifySql.lastIndexOf('COMMIT;'));
      for (const drift of [
        "GRANT EXECUTE ON FUNCTION public.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb) TO authenticated",
        "UPDATE namcumz_private.migrations SET version='missing' WHERE version='production_013_sepay_sacombank'"
      ]) {
        await db.exec('BEGIN');
        await db.exec(drift);
        await assert.rejects(db.exec(body));
        await db.exec('ROLLBACK');
      }
    });

    const alice = crypto.randomUUID();
    await db.query('INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES($1, $2, $3::jsonb)', [
      alice,
      'alice@example.invalid',
      JSON.stringify({ username: 'alice', display_name: 'Alice' })
    ]);

    const asUser = async (uid, fn) => {
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
      await db.exec('SET ROLE ' + (uid ? 'authenticated' : 'anon'));
      try {
        return await fn();
      } finally {
        await db.exec('RESET ROLE');
      }
    };

    const notifications = [];
    // Uses default PaymentService bank config (must default to Sacombank 79202012546)
    const service = new PaymentService({
      provider: 'sepay',
      webhookSecret: 'sepay-live-test-key',
      pgClient: db,
      orderNotifier: {
        notifyPaymentConfirmed: async (order, meta) => {
          notifications.push({ order, meta });
        }
      }
    });
    assert.equal(service.bankConfig.bankBin, '970403');
    assert.equal(service.bankConfig.bankCode, 'Sacombank');
    assert.equal(service.bankConfig.accountNumber, '79202012546');

    // 2. Deposit order settlement with realistic SePay Sacombank payload (numeric id!)
    await t.test('2. SePay Sacombank payload settles deposit order, credits wallet, notifies once', async () => {
      const deposit = (
        await asUser(alice, () =>
          db.query('SELECT public.create_deposit_order($1, $2) AS data', [50000, crypto.randomUUID()])
        )
      ).rows[0].data;

      assert.ok(deposit.payment_reference.startsWith('NCZ'));

      const sepayPayload = {
        id: 92704,
        gateway: 'Sacombank',
        transactionDate: '2026-11-26 20:05:00',
        accountNumber: '79202012546',
        subAccount: '',
        code: deposit.payment_reference,
        content: `FT26330123456 ${deposit.payment_reference} NAP VI`,
        transferType: 'in',
        description: 'BankAPINotify',
        transferAmount: 50000,
        accumulated: 500000,
        referenceCode: 'FT26330123456'
      };

      const res = await service.processWebhook({ authorization: 'Apikey sepay-live-test-key' }, sepayPayload);
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.matched, true);
      assert.equal(res.body.is_deposit, true);
      assert.equal(res.body.new_wallet_balance, 50000);

      // Wallet credited + order marked PAID & hoan_thanh
      const wallet = (await db.query('SELECT balance FROM public.user_wallets WHERE user_id = $1', [alice])).rows[0];
      assert.equal(wallet.balance, 50000);
      const ord = (await db.query('SELECT status, payment_status, paid_amount FROM public.orders WHERE id = $1', [deposit.id])).rows[0];
      assert.equal(ord.payment_status, 'PAID');
      assert.equal(ord.status, 'hoan_thanh');
      assert.equal(ord.paid_amount, 50000);
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].order.kind, 'deposit');

      // Idempotent replay with same SePay integer id does NOT double-credit or double-notify
      const replay = await service.processWebhook({ authorization: 'Apikey sepay-live-test-key' }, sepayPayload);
      assert.equal(replay.status, 200);
      assert.equal(replay.body.is_idempotent_replay, true);
      assert.equal(notifications.length, 1);
      const walletAfter = (await db.query('SELECT balance FROM public.user_wallets WHERE user_id = $1', [alice])).rows[0];
      assert.equal(walletAfter.balance, 50000);
    });

    // 3. Rejects legacy MB account, outgoing transfer, bad auth, and handles unrelated transfer safely
    await t.test('3. Rejects legacy MB 0763550673, outgoing, invalid API key, and handles Nira Store transfer safely', async () => {
      // Invalid API key -> 401
      const badAuth = await service.processWebhook(
        { authorization: 'Apikey wrong-key' },
        { id: 92705, gateway: 'Sacombank', accountNumber: '79202012546', transferType: 'in', transferAmount: 50000, content: 'NCZTEST' }
      );
      assert.equal(badAuth.status, 401);

      // Legacy MB Bank account rejected before DB (400) AND at SQL level (22023)
      const legacyMb = await service.processWebhook(
        { authorization: 'Apikey sepay-live-test-key' },
        { id: 92706, gateway: 'MB', accountNumber: '0763550673', transferType: 'in', transferAmount: 50000, content: 'NCZTEST' }
      );
      assert.equal(legacyMb.status, 400);
      assert.equal(legacyMb.body.error, 'INVALID_PAYMENT_DESTINATION');

      await db.exec('SET ROLE service_role');
      await assert.rejects(
        db.query('SELECT public.confirm_payment_transaction($1,$2,$3,$4,$5,$6,$7::jsonb)', [
          'sepay', 'legacy-mb-sql', 'MB', '0763550673', 50000, 'NCZTEST', JSON.stringify({ transferType: 'in' })
        ]),
        /Invalid incoming bank transaction/
      );
      await db.exec('RESET ROLE');

      // Unrelated transfer on shared Sacombank account (e.g. Nira Store) returns 200 without crashing or spamming Telegram
      const beforeNotifCount = notifications.length;
      const unrelated = await service.processWebhook(
        { authorization: 'Apikey sepay-live-test-key' },
        { id: 92707, gateway: 'Sacombank', accountNumber: '79202012546', transferType: 'in', transferAmount: 120000, content: 'NIRA998877 MUA HANG' }
      );
      assert.equal(unrelated.status, 200);
      assert.equal(unrelated.body.success, false);
      assert.equal(unrelated.body.error, 'ORDER_NOT_FOUND');
      assert.equal(notifications.length, beforeNotifCount);

      // Missing/wrong gateway on Sacombank account is rejected BEFORE DB with HTTP 400 (no silent fabrication, no 500 retry)
      for (const badPayload of [
        { id: 92708, gateway: '', accountNumber: '79202012546', transferType: 'in', transferAmount: 50000, content: 'NCZTEST' },
        { id: 92709, gateway: 'VCB', accountNumber: '79202012546', transferType: 'in', transferAmount: 50000, content: 'NCZTEST' },
        { id: 92710, gateway: 'Sacombank', accountNumber: '79202012546', transferType: 'in', transferAmount: 49999.6, content: 'NCZTEST' },
        { id: 92711, gateway: 'Sacombank', accountNumber: '79202012546', transferType: 'in', transferAmount: '50000.4', content: 'NCZTEST' },
        { id: 92712, gateway: 'Sacombank', accountNumber: '79202012546', transferType: 'in', transferAmount: true, content: 'NCZTEST' }
      ]) {
        const rej = await service.processWebhook({ authorization: 'Apikey sepay-live-test-key' }, badPayload);
        assert.equal(rej.status, 400);
        assert.equal(rej.body.error, 'INVALID_PAYMENT_DESTINATION');
      }

      // Cross-store piggyback: SePay parsed code belongs to Nira Store while content appends a real unpaid Namcumz ref -> must NOT settle Namcumz order
      const openDep1 = (await asUser(alice, () => db.query('SELECT public.create_deposit_order($1, $2) AS data', [20000, crypto.randomUUID()]))).rows[0].data;
      const openDep2 = (await asUser(alice, () => db.query('SELECT public.create_deposit_order($1, $2) AS data', [20000, crypto.randomUUID()]))).rows[0].data;

      const piggyback = await service.processWebhook(
        { authorization: 'Apikey sepay-live-test-key' },
        {
          id: 92713,
          gateway: 'Sacombank',
          accountNumber: '79202012546',
          transferType: 'in',
          transferAmount: 20000,
          code: 'NIRA88888',
          content: `NIRA88888 ${openDep1.payment_reference}`
        }
      );
      assert.equal(piggyback.status, 200);
      assert.equal(piggyback.body.success, false);
      assert.equal(piggyback.body.error, 'ORDER_NOT_FOUND');

      // Ambiguous memo containing 2 distinct unpaid Namcumz refs -> rejected as AMBIGUOUS_ORDER_REFERENCE
      const ambiguous = await service.processWebhook(
        { authorization: 'Apikey sepay-live-test-key' },
        {
          id: 92714,
          gateway: 'Sacombank',
          accountNumber: '79202012546',
          transferType: 'in',
          transferAmount: 20000,
          code: '',
          content: `${openDep1.payment_reference} ${openDep2.payment_reference}`
        }
      );
      assert.equal(ambiguous.status, 200);
      assert.equal(ambiguous.body.success, false);
      assert.equal(ambiguous.body.error, 'AMBIGUOUS_ORDER_REFERENCE');

      // Replaying an expired/rejected transaction ID must NOT return success:true
      await db.query("UPDATE public.orders SET expires_at = now() - INTERVAL '20 minutes' WHERE id = $1", [openDep2.id]);
      const expRes = await service.processWebhook(
        { authorization: 'Apikey sepay-live-test-key' },
        { id: 92715, gateway: 'Sacombank', accountNumber: '79202012546', transferType: 'in', transferAmount: 20000, content: openDep2.payment_reference }
      );
      assert.equal(expRes.body.success, false);
      assert.equal(expRes.body.error, 'ORDER_EXPIRED');
      const expReplay = await service.processWebhook(
        { authorization: 'Apikey sepay-live-test-key' },
        { id: 92715, gateway: 'Sacombank', accountNumber: '79202012546', transferType: 'in', transferAmount: 20000, content: openDep2.payment_reference }
      );
      assert.equal(expReplay.body.success, false);
      assert.equal(expReplay.body.is_idempotent_replay, true);
      assert.equal(expReplay.body.error, 'TRANSACTION_ALREADY_REJECTED');

      // Non-object JSON body rejected with 400 after auth (and 401 before auth)
      const unauthBadJson = await service.processWebhook({ authorization: 'Apikey wrong' }, '{invalid-json');
      assert.equal(unauthBadJson.status, 401);
      const authArrayBody = await service.processWebhook({ authorization: 'Apikey sepay-live-test-key' }, [1, 2, 3]);
      assert.equal(authArrayBody.status, 400);
      assert.equal(authArrayBody.body.error, 'MALFORMED_PAYLOAD');
    });

    // 4. Case-insensitive Apikey header & dynamic VietQR URL generation
    await t.test('4. SePay Apikey verification and dynamic Sacombank VietQR URL', () => {
      assert.equal(PaymentProvider.verifyWebhook('sepay', { authorization: 'Apikey my-key-1' }, '{}', 'my-key-1'), true);
      assert.equal(PaymentProvider.verifyWebhook('sepay', { Authorization: 'apikey my-key-1' }, '{}', 'my-key-1'), true);
      assert.equal(PaymentProvider.verifyWebhook('sepay', { authorization: 'Basic my-key-1' }, '{}', 'my-key-1'), false);

      const url = PaymentProvider.VietQR.generateQuickLink({
        accountNumber: '79202012546',
        accountName: 'NGUYEN HOANG NAM',
        amount: 50000,
        transferContent: 'NCZABCD1234'
      });
      assert.equal(
        url,
        'https://img.vietqr.io/image/970403-79202012546-compact2.png?amount=50000&addInfo=NCZABCD1234&accountName=NGUYEN%20HOANG%20NAM'
      );
    });

    // 5. Frontend config & pages use Sacombank 970403 / 79202012546, no static MB QR, keep Zalo 0763550673
    await t.test('5. Frontend config/pages use Sacombank dynamic VietQR and preserve Zalo CSKH', async () => {
      const runtimeCfg = await read('assets/js/runtime-config.js');
      const checkoutJs = await read('assets/js/checkout.js');
      const profileJs = await read('assets/js/profile.js');
      const checkoutHtml = await read('checkout.html');
      const luuYHtml = await read('luu-y.html');

      for (const [name, src] of [
        ['runtime-config.js', runtimeCfg],
        ['checkout.js', checkoutJs],
        ['profile.js', profileJs]
      ]) {
        assert.ok(src.includes('970403'), `${name} must use Sacombank BIN 970403`);
        assert.ok(src.includes('79202012546'), `${name} must use Sacombank account 79202012546`);
        assert.ok(!src.includes('qr-nguyen-hoang-nam.jpg'), `${name} must not fall back to legacy MB static QR`);
      }

      assert.ok(checkoutHtml.includes('79202012546'));
      assert.ok(!checkoutHtml.includes('*******125'));
      assert.ok(checkoutHtml.includes('Zalo CSKH: <strong>0763550673</strong>'), 'Zalo CSKH must remain preserved');
      assert.ok(luuYHtml.includes('79202012546'));
      assert.ok(luuYHtml.includes('https://zalo.me/0763550673'), 'Zalo CSKH link in luu-y.html must remain preserved');
    });
  } finally {
    await db.close();
  }
});
