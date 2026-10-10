import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import PaymentProvider from '../assets/js/payment-provider.js';
import PaymentService from '../api/lib/payment-service.js';
import mockSimulator from '../api/payment/mock-simulate.js';

const read = name => readFile(new URL('../_db/' + name, import.meta.url), 'utf8');

test('webhook providers reject missing secrets and accept exact configured credentials', () => {
  for (const provider of ['sepay', 'casso', 'mock']) {
    assert.equal(PaymentProvider.verifyWebhook(provider, {}, '{}', ''), false, `${provider} must reject a missing secret`);
  }
  assert.equal(PaymentProvider.verifyWebhook('sepay', { authorization: 'Apikey test-secret' }, '{}', 'test-secret'), true);
  assert.equal(PaymentProvider.verifyWebhook('casso', { 'secure-token': 'test-secret' }, '{}', 'test-secret'), true);
  assert.equal(PaymentProvider.verifyWebhook('mock', { 'x-mock-secret': 'prefix-test-secret-suffix' }, '{}', 'test-secret'), false);
  assert.equal(PaymentProvider.verifyWebhook('mock', { 'x-mock-secret': 'test-secret' }, '{}', 'test-secret'), true);
});

test('payment simulator remains disabled on Vercel production even with mock provider configured', async () => {
  const previous = {
    node: process.env.NODE_ENV,
    vercel: process.env.VERCEL_ENV,
    provider: process.env.PAYMENT_PROVIDER
  };
  process.env.NODE_ENV = 'production';
  process.env.VERCEL_ENV = 'production';
  process.env.PAYMENT_PROVIDER = 'mock';
  const response = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  try {
    await mockSimulator({ method: 'POST', body: {} }, response);
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error, 'FORBIDDEN');
  } finally {
    if (previous.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.node;
    if (previous.vercel === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = previous.vercel;
    if (previous.provider === undefined) delete process.env.PAYMENT_PROVIDER; else process.env.PAYMENT_PROVIDER = previous.provider;
  }
});
test('Automated VietQR Payment, Transaction Verification, Anti-Duplicate & Wallet Test Suite', async t => {
  const db = new PGlite();

  // 1. Setup Postgres mocks & run migrations
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
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

  // Create test users
  const customerId = crypto.randomUUID();
  const customer2Id = crypto.randomUUID();
  const adminId = crypto.randomUUID();

  for (const [id, name, role] of [
    [customerId, 'customer1', 'customer'],
    [customer2Id, 'customer2', 'customer'],
    [adminId, 'adminuser', 'admin']
  ]) {
    await db.query('INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES($1, $2, $3::jsonb)', [
      id,
      name + '@example.test',
      JSON.stringify({ username: name, display_name: name })
    ]);
  }
  await db.query("UPDATE public.user_roles SET role = 'admin' WHERE id = $1", [adminId]);

  // Auth helper
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
    webhookSecret: 'test-secret-123',
    pgClient: db
  });

  let createdOrder = null;

  // TEST 1: Create Order & Auto-generate Payment Reference + VietQR
  await t.test('1. Tạo đơn hàng sinh mã payment_reference và hạn thanh toán tự động', async () => {
    const pkgRes = await db.query(
      "INSERT INTO public.packages(game, name, price, active, type) VALUES ('Genshin Impact', 'Gói Welkin Test', 85000, true, 'login') RETURNING id"
    );
    const pkgId = pkgRes.rows[0].id;

    const orderRes = await asUser(customerId, async () => {
      const res = await db.query(
        `SELECT * FROM public.create_topup_order(
          $1::uuid, $2::uuid, 'Asia', 'Hoyoverse', 'account_test', 'pass123', '0763550673', 'ghi chu'
        )`,
        [crypto.randomUUID(), pkgId]
      );
      return res.rows[0];
    });

    assert.ok(orderRes.id);
    assert.ok(orderRes.order_code.startsWith('DH-'));
    assert.ok(orderRes.payment_reference.startsWith('NCZ'), 'payment_reference phải có prefix NCZ');
    assert.equal(orderRes.price, 85000);
    assert.equal(orderRes.payment_status, 'PENDING');
    assert.ok(new Date(orderRes.expires_at) > new Date(), 'expires_at phải ở tương lai');

    createdOrder = orderRes;
  });

  // TEST 2: VietQR Generation
  await t.test('2. Sinh mã VietQR (QuickLink & EMVCo standard payload)', async () => {
    const qrUrl = PaymentProvider.VietQR.generateQuickLink({
      bankBin: '970422',
      accountNumber: '0763550673',
      accountName: 'NGUYEN HOANG NAM',
      amount: createdOrder.price,
      transferContent: createdOrder.payment_reference
    });

    assert.ok(qrUrl.includes('img.vietqr.io'));
    assert.ok(qrUrl.includes('970422-0763550673'));
    assert.ok(qrUrl.includes('amount=85000'));
    assert.ok(qrUrl.includes(createdOrder.payment_reference));

    const emvco = PaymentProvider.VietQR.generateEmvCoPayload({
      bankBin: '970422',
      accountNumber: '0763550673',
      amount: createdOrder.price,
      transferContent: createdOrder.payment_reference
    });

    assert.ok(emvco.startsWith('000201'), 'EMVCo payload phải bắt đầu bằng Tag 00');
    assert.ok(emvco.includes('A000000727'), 'Chứa GUID Napas VietQR');
    assert.ok(emvco.includes(createdOrder.payment_reference), 'Chứa nội dung chuyển khoản');
  });

  // TEST 3: Reject Invalid Webhook Signature
  await t.test('3. Từ chối webhook có chữ ký / secret không hợp lệ (HTTP 401)', async () => {
    const res = await paymentService.processWebhook(
      { authorization: 'Apikey WRONG_KEY' },
      {
        id: 'TXN-FAIL-SIG',
        transferAmount: 85000,
        content: `NCZ ${createdOrder.payment_reference}`
      }
    );

    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'INVALID_SIGNATURE');

    // Order must remain PENDING
    const checkOrder = (await db.query('SELECT payment_status FROM public.orders WHERE id = $1', [createdOrder.id])).rows[0];
    assert.equal(checkOrder.payment_status, 'PENDING');
  });

  // TEST 4: Reject Incorrect Transfer Content
  await t.test('4. Từ chối giao dịch có nội dung chuyển khoản không khớp', async () => {
    const res = await paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: 'TXN-WRONG-MEMO',
        transferAmount: 85000,
        content: 'Chuyen tien mua do khong co ma'
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'ORDER_NOT_FOUND');

    const checkOrder = (await db.query('SELECT payment_status FROM public.orders WHERE id = $1', [createdOrder.id])).rows[0];
    assert.equal(checkOrder.payment_status, 'PENDING');
  });

  // TEST 5: Reject Insufficient Amount
  await t.test('5. Từ chối giao dịch thiếu tiền (INSUFFICIENT_AMOUNT)', async () => {
    const res = await paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: 'TXN-UNDERPAY',
        transferAmount: 20000, // Expected 85000
        content: `Chuyen khoan ${createdOrder.payment_reference}`
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'INSUFFICIENT_AMOUNT');

    const checkOrder = (await db.query('SELECT payment_status FROM public.orders WHERE id = $1', [createdOrder.id])).rows[0];
    assert.equal(checkOrder.payment_status, 'PENDING');
  });

  // TEST 6: Successful Webhook -> Order transitions to PAID
  await t.test('6. Xử lý webhook hợp lệ: khớp amount, content và chuyển đơn sang PAID', async () => {
    const txnId = 'SEPAY-TXN-' + Date.now();
    const res = await paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: txnId,
        gateway: 'MB',
        accountNumber: '0763550673',
        transferAmount: 85000,
        content: `CK DON HANG ${createdOrder.payment_reference}`,
        transactionDate: new Date().toISOString()
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.matched, true);
    assert.equal(res.body.order_id, createdOrder.id);

    // Verify DB order state
    const orderInDb = (await db.query('SELECT * FROM public.orders WHERE id = $1', [createdOrder.id])).rows[0];
    assert.equal(orderInDb.payment_status, 'PAID');
    assert.equal(orderInDb.paid_amount, 85000);
    assert.ok(orderInDb.paid_at !== null);

    // Verify payment_transactions table
    const txnInDb = (
      await db.query('SELECT * FROM public.payment_transactions WHERE provider_transaction_id = $1', [txnId])
    ).rows[0];
    assert.ok(txnInDb);
    assert.equal(txnInDb.matched_order_id, createdOrder.id);
    assert.equal(txnInDb.status, 'matched');
  });

  // TEST 7: Duplicate Transaction ID Idempotency
  await t.test('7. Gửi lại webhook cùng mã giao dịch (Idempotent Replay)', async () => {
    const existingTxnId = (
      await db.query('SELECT provider_transaction_id FROM public.payment_transactions WHERE matched_order_id = $1 LIMIT 1', [createdOrder.id])
    ).rows[0].provider_transaction_id;

    const res = await paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: existingTxnId,
        transferAmount: 85000,
        content: `CK DON HANG ${createdOrder.payment_reference}`
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.is_idempotent_replay, true, 'Phải nhận diện replay idempotent');
  });

  // TEST 8: Cannot pay an already paid order with a new transaction
  await t.test('8. Ngăn chặn nạp tiền thừa / đơn đã thanh toán (ORDER_ALREADY_PAID)', async () => {
    const newTxnId = 'SEPAY-TXN-EXTRA-' + Date.now();
    const res = await paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: newTxnId,
        transferAmount: 85000,
        content: `CK THU ${createdOrder.payment_reference}`
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'ORDER_ALREADY_PAID');
  });

  // TEST 9: Concurrent Webhooks Race Condition Test
  await t.test('9. Race Condition: 2 Webhooks đồng thời cho cùng 1 đơn hàng chỉ tạo 1 lần xác nhận', async () => {
    // Create new pending order
    const pkgRes = await db.query('SELECT id FROM public.packages WHERE active = true LIMIT 1');
    const newOrder = (
      await asUser(customerId, async () => {
        const r = await db.query(
          `SELECT * FROM public.create_topup_order(
            $1::uuid, $2::uuid, 'Asia', 'Hoyoverse', 'race_acc', 'pass', '0763550673', ''
          )`,
          [crypto.randomUUID(), pkgRes.rows[0].id]
        );
        return r.rows[0];
      })
    );

    // Fire 2 simultaneous webhooks
    const p1 = paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: 'RACE-1-' + Date.now(),
        transferAmount: 85000,
        content: `NCZ ${newOrder.payment_reference}`
      }
    );

    const p2 = paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: 'RACE-2-' + Date.now(),
        transferAmount: 85000,
        content: `NCZ ${newOrder.payment_reference}`
      }
    );

    const [r1, r2] = await Promise.all([p1, p2]);

    // Exactly one should succeed in marking the order PAID, the other must see ORDER_ALREADY_PAID
    const successes = [r1.body.success, r2.body.success].filter(Boolean).length;
    assert.equal(successes, 1, 'Chỉ duy nhất 1 webhook được xác nhận thanh toán thành công');

    const updated = (await db.query('SELECT paid_amount FROM public.orders WHERE id = $1', [newOrder.id])).rows[0];
    assert.equal(updated.paid_amount, 85000, 'Số tiền đã trả không bị cộng dồn 2 lần');
  });

  // TEST 10: Expired Order Handling
  await t.test('10. Đơn hàng hết hạn không tự động kích hoạt (ORDER_EXPIRED)', async () => {
    const pkgRes = await db.query('SELECT id FROM public.packages WHERE active = true LIMIT 1');
    const expOrder = (
      await asUser(customerId, async () => {
        const r = await db.query(
          `SELECT * FROM public.create_topup_order(
            $1::uuid, $2::uuid, 'Asia', 'Hoyoverse', 'exp_acc', 'pass', '0763550673', ''
          )`,
          [crypto.randomUUID(), pkgRes.rows[0].id]
        );
        return r.rows[0];
      })
    );

    // Force order expiration back in time (> 15 minutes ago)
    await db.query("UPDATE public.orders SET expires_at = now() - INTERVAL '20 minutes' WHERE id = $1", [expOrder.id]);

    const res = await paymentService.processWebhook(
      { authorization: 'Apikey test-secret-123' },
      {
        id: 'EXP-TXN-' + Date.now(),
        transferAmount: 85000,
        content: `NCZ ${expOrder.payment_reference}`
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'ORDER_EXPIRED');

    const check = (await db.query('SELECT payment_status FROM public.orders WHERE id = $1', [expOrder.id])).rows[0];
    assert.notEqual(check.payment_status, 'PAID');
  });

  // TEST 11: Wallet Payment - Insufficient Balance
  await t.test('11. Thanh toán ví: Báo lỗi khi số dư ví không đủ', async () => {
    const pkgRes = await db.query('SELECT id FROM public.packages WHERE active = true LIMIT 1');
    const orderForWallet = (
      await asUser(customerId, async () => {
        const r = await db.query(
          `SELECT * FROM public.create_topup_order(
            $1::uuid, $2::uuid, 'Asia', 'Hoyoverse', 'wallet_acc', 'pass', '0763550673', ''
          )`,
          [crypto.randomUUID(), pkgRes.rows[0].id]
        );
        return r.rows[0];
      })
    );

    // Set user balance to only 10,000 (order price is 85,000)
    await db.query(
      'INSERT INTO public.user_wallets(user_id, balance) VALUES($1, 10000) ON CONFLICT(user_id) DO UPDATE SET balance = 10000',
      [customerId]
    );

    await assert.rejects(
      asUser(customerId, async () => {
        await db.query('SELECT public.pay_order_by_wallet($1::uuid)', [orderForWallet.id]);
      }),
      /Số dư ví không đủ/
    );
  });

  // TEST 12: Wallet Payment - Successful Atomic Settlement
  await t.test('12. Thanh toán ví: Thành công khi đủ số dư, trừ tiền nguyên tử và chuyển đơn sang PAID', async () => {
    const pkgRes = await db.query('SELECT id FROM public.packages WHERE active = true LIMIT 1');
    const orderForWallet = (
      await asUser(customerId, async () => {
        const r = await db.query(
          `SELECT * FROM public.create_topup_order(
            $1::uuid, $2::uuid, 'Asia', 'Hoyoverse', 'wallet_ok_acc', 'pass', '0763550673', ''
          )`,
          [crypto.randomUUID(), pkgRes.rows[0].id]
        );
        return r.rows[0];
      })
    );

    // Deposit 200,000 to user wallet
    await db.query('UPDATE public.user_wallets SET balance = 200000 WHERE user_id = $1', [customerId]);

    const res = await asUser(customerId, async () => {
      const r = await db.query('SELECT public.pay_order_by_wallet($1::uuid) AS res', [orderForWallet.id]);
      return typeof r.rows[0].res === 'string' ? JSON.parse(r.rows[0].res) : r.rows[0].res;
    });

    assert.equal(res.success, true);
    assert.equal(res.paid_amount, 85000);
    assert.equal(res.new_wallet_balance, 115000, 'Số dư ví còn lại phải là 200000 - 85000 = 115000');

    // Check order status in DB
    const orderDb = (await db.query('SELECT * FROM public.orders WHERE id = $1', [orderForWallet.id])).rows[0];
    assert.equal(orderDb.payment_status, 'PAID');
    assert.equal(orderDb.payment_method, 'wallet');
    assert.equal(orderDb.paid_amount, 85000);

    // Check wallet transaction history
    const wTxn = (
      await db.query('SELECT * FROM public.wallet_transactions WHERE order_id = $1', [orderForWallet.id])
    ).rows[0];
    assert.ok(wTxn);
    assert.equal(wTxn.amount, -85000);
    assert.equal(wTxn.balance_after, 115000);
  });

  // TEST 13: Public Checkout Query Protection
  await t.test('13. API get_order_payment_info bảo vệ dữ liệu nhạy cảm (không expose mật khẩu game)', async () => {
    const info = (
      await db.query('SELECT public.get_order_payment_info($1) AS info', [createdOrder.order_code])
    ).rows[0].info;

    const data = typeof info === 'string' ? JSON.parse(info) : info;
    assert.equal(data.order_code, createdOrder.order_code);
    assert.equal(data.price, 85000);
    assert.equal(data.payment_status, 'PAID');
    assert.equal(data.account_password, undefined, 'Không bao giờ trả mật khẩu tài khoản');
  });
});
