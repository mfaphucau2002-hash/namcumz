import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import PaymentService from '../api/lib/payment-service.js';

const read = name => readFile(new URL('../_db/' + name, import.meta.url), 'utf8');

test('User Profile / Member Center: Check-in, Wallet Deposit, VIP and Security Test Suite', async t => {
  const db = new PGlite();

  // Setup Postgres schemas & mocks
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

  await db.exec(await read('staging_001_foundation.sql'));
  await db.exec(await read('staging_002_workflows.sql'));
  await db.exec(await read('staging_003_login_topup.sql'));
  await db.exec(await read('staging_005_vietqr_payment.sql'));
  await db.exec(await read('staging_006_user_member_center.sql'));

  const user1Id = crypto.randomUUID();
  const user2Id = crypto.randomUUID();

  for (const [id, name, email] of [
    [user1Id, 'duckcop', 'duckcop@example.test'],
    [user2Id, 'guest2', 'guest2@example.test']
  ]) {
    await db.query('INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES($1, $2, $3::jsonb)', [
      id,
      email,
      JSON.stringify({ username: name, display_name: name.toUpperCase() })
    ]);
  }

  const asUser = async (uid, fn) => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
    await db.exec('SET ROLE ' + (uid ? 'authenticated' : 'anon'));
    try {
      return await fn();
    } finally {
      await db.exec('RESET ROLE');
    }
  };

  const paymentService = new PaymentService({
    provider: 'sepay',
    webhookSecret: 'test-webhook-secret',
    pgClient: db
  });

  // TEST 1: Daily check-in gives reward and prevents duplicate check-in
  await t.test('1. Daily Check-in: Cộng thưởng 500đ lần đầu và chặn duplicate trong ngày', async () => {
    const res1 = await asUser(user1Id, async () => {
      const r = await db.query('SELECT public.claim_daily_checkin() AS res');
      return typeof r.rows[0].res === 'string' ? JSON.parse(r.rows[0].res) : r.rows[0].res;
    });

    assert.equal(res1.success, true);
    assert.equal(res1.reward, 500);
    assert.equal(res1.checkin_balance, 500);

    // Call second time -> MUST be rejected by backend
    const res2 = await asUser(user1Id, async () => {
      const r = await db.query('SELECT public.claim_daily_checkin() AS res');
      return typeof r.rows[0].res === 'string' ? JSON.parse(r.rows[0].res) : r.rows[0].res;
    });

    assert.equal(res2.success, false);
    assert.equal(res2.already_checked_in, true);

    // Verify wallet transaction record
    const tx = (await db.query("SELECT * FROM public.wallet_transactions WHERE user_id = $1 AND type = 'checkin'", [user1Id])).rows[0];
    assert.ok(tx);
    assert.equal(tx.amount, 500);
  });

  // TEST 2: Deposit Order Creation
  let depositOrder = null;
  await t.test('2. Deposit Order: Tạo đơn nạp tiền hợp lệ và chặn số tiền nhỏ hơn 10.000đ', async () => {
    // Under 10k must fail
    await assert.rejects(
      asUser(user1Id, async () => {
        await db.query('SELECT public.create_deposit_order(5000)');
      }),
      /Số tiền nạp tối thiểu là 10.000 VNĐ/
    );

    // Valid 200,000 VND
    const res = await asUser(user1Id, async () => {
      const r = await db.query('SELECT public.create_deposit_order(200000) AS res');
      return typeof r.rows[0].res === 'string' ? JSON.parse(r.rows[0].res) : r.rows[0].res;
    });

    assert.ok(res.id);
    assert.ok(res.order_code.startsWith('DH-'));
    assert.ok(res.payment_reference.startsWith('NCZ'));
    assert.equal(res.amount, 200000);

    depositOrder = res;
  });

  // TEST 3: Payment settlement credits user wallet atomically
  await t.test('3. Atomic Settlement: Webhook xác nhận nạp tiền tự động cộng số dư ví chính xác', async () => {
    const hookRes = await paymentService.processWebhook(
      { authorization: 'Apikey test-webhook-secret' },
      {
        id: 'DEPOSIT-TXN-' + Date.now(),
        transferAmount: 200000,
        content: `NCZ ${depositOrder.payment_reference}`
      }
    );

    assert.equal(hookRes.status, 200);
    assert.equal(hookRes.body.success, true);
    assert.equal(hookRes.body.is_deposit, true);
    assert.equal(hookRes.body.new_wallet_balance, 200000);

    // Check user_wallets in DB
    const w = (await db.query('SELECT balance FROM public.user_wallets WHERE user_id = $1', [user1Id])).rows[0];
    assert.equal(w.balance, 200000);

    // Check wallet_transactions
    const tx = (await db.query("SELECT * FROM public.wallet_transactions WHERE user_id = $1 AND type = 'deposit'", [user1Id])).rows[0];
    assert.ok(tx);
    assert.equal(tx.amount, 200000);
    assert.equal(tx.balance_after, 200000);
  });

  // TEST 4: Idempotency: Replaying webhook does NOT credit wallet twice
  await t.test('4. Anti-Duplicate: Webhook gửi lại lần 2 không cộng tiền lần nữa', async () => {
    const replayRes = await paymentService.processWebhook(
      { authorization: 'Apikey test-webhook-secret' },
      {
        id: 'DEPOSIT-TXN-REPLAY-999',
        transferAmount: 200000,
        content: `NCZ ${depositOrder.payment_reference}`
      }
    );

    assert.equal(replayRes.status, 200);
    assert.equal(replayRes.body.success, false);
    assert.equal(replayRes.body.error, 'ORDER_ALREADY_PAID');

    // Balance must remain 200,000, NOT 400,000
    const w = (await db.query('SELECT balance FROM public.user_wallets WHERE user_id = $1', [user1Id])).rows[0];
    assert.equal(w.balance, 200000);
  });

  // TEST 5: Game Accounts Directory RLS Isolation
  await t.test('5. Game Accounts Directory: Cô lập RLS giữa các người dùng', async () => {
    const accRes = await asUser(user1Id, async () => {
      const r = await db.query(
        `INSERT INTO public.user_game_accounts(user_id, game, uid, server, nickname, notes)
         VALUES($1, 'Genshin Impact', '812345678', 'Asia', 'DuckCop', 'Acc chinh')
         RETURNING id`,
        [user1Id]
      );
      return r.rows[0];
    });

    assert.ok(accRes.id);

    // User 1 can read
    const user1List = await asUser(user1Id, async () => {
      const r = await db.query('SELECT * FROM public.user_game_accounts');
      return r.rows;
    });
    assert.equal(user1List.length, 1);
    assert.equal(user1List[0].uid, '812345678');

    // User 2 cannot read user 1's game account
    const user2List = await asUser(user2Id, async () => {
      const r = await db.query('SELECT * FROM public.user_game_accounts');
      return r.rows;
    });
    assert.equal(user2List.length, 0);
  });

  // TEST 6: Profile Summary RPC returns accurate data and requires auth
  await t.test('6. Profile Summary RPC: Trả dữ liệu thực, tính VIP đúng và chặn guest', async () => {
    // Guest is rejected
    await assert.rejects(
      asUser(null, async () => {
        await db.query('SELECT public.get_user_profile_summary()');
      }),
      /permission denied|Vui lòng đăng nhập/
    );

    // Authenticated user summary
    const summary = await asUser(user1Id, async () => {
      const r = await db.query('SELECT public.get_user_profile_summary() AS s');
      return typeof r.rows[0].s === 'string' ? JSON.parse(r.rows[0].s) : r.rows[0].s;
    });

    assert.equal(summary.user.id, user1Id);
    assert.equal(summary.wallet.balance, 200000);
    assert.equal(summary.wallet.checkin_balance, 500);
    assert.equal(summary.checkin.checked_in_today, true);
    assert.equal(summary.vip.level, 'MEMBER');
  });
});
