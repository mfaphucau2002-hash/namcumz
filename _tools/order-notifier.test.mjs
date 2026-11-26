import { test } from 'node:test';
import assert from 'node:assert/strict';
import telegramNotifier from '../api/lib/telegram-notifier.js';
import orderNotifierModule from '../api/lib/order-notifier.js';
import orderNotificationHandler from '../api/notifications/order.js';
import PaymentService from '../api/lib/payment-service.js';

const { escapeTelegramHtml, parseChatIds, sendTelegramMessage } = telegramNotifier;
const { OrderNotifier, SAFE_ORDER_SELECT, formatOrderTelegramHtml } = orderNotifierModule;

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

test('telegram-notifier escapes HTML, handles multiple chats, skips unconfigured, and isolates network failures', async () => {
  assert.equal(escapeTelegramHtml('<script>&"test"</script>'), '&lt;script&gt;&amp;&quot;test&quot;&lt;/script&gt;');
  assert.deepEqual(parseChatIds('12345, -100999888 '), ['12345', '-100999888']);

  const skipped = await sendTelegramMessage({ botToken: '', chatId: '', text: 'hello' });
  assert.equal(skipped.sent, false);
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.reason, 'TELEGRAM_NOT_CONFIGURED');

  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ ok: true, result: { message_id: 1 } }) };
  };

  const sent = await sendTelegramMessage({
    botToken: '999:fake_token',
    chatId: '111, -100222',
    threadId: '42',
    text: '<b>Test</b>',
    fetchImpl: mockFetch
  });

  assert.equal(sent.sent, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.chat_id, '111');
  assert.equal(calls[1].body.chat_id, '-100222');
  assert.equal(calls[0].body.message_thread_id, 42);
  assert.equal(calls[0].body.parse_mode, 'HTML');

  const networkFail = await sendTelegramMessage({
    botToken: '999:fake_token',
    chatId: '111',
    text: 'Test',
    fetchImpl: async () => { throw new Error('ECONNRESET'); }
  });
  assert.equal(networkFail.sent, false);
  assert.equal(networkFail.reason, 'NETWORK_ERROR');
});

test('formatOrderTelegramHtml renders all order types safely and never leaks sensitive fields', () => {
  const topupText = formatOrderTelegramHtml('order_created', {
    id: '11111111-1111-4111-8111-111111111111',
    order_code: 'DH-TOPUP-01',
    kind: 'topup',
    renter_name: '<b>NAMCUM</b>',
    game_server: 'Asia',
    price: 85000,
    payment_reference: 'NCZABC1234',
    payment_status: 'PENDING',
    content: '[Asia] [Genshin Impact] Không Nguyệt Chúc Phúc',
    account_password: 'SUPER_SECRET_PASSWORD_DO_NOT_LEAK',
    account_password_ciphertext: 'CIPHER_TEXT_DO_NOT_LEAK',
    secret_code: 'NAM-SECRET',
    created_at: new Date().toISOString()
  }, { siteBaseUrl: 'https://namcumz.io.vn' });

  assert.ok(topupText.includes('ĐƠN NẠP GAME MỚI'));
  assert.ok(topupText.includes('DH-TOPUP-01'));
  assert.ok(topupText.includes('&lt;b&gt;NAMCUM&lt;/b&gt;'));
  assert.ok(topupText.includes('NCZABC1234'));
  assert.ok(topupText.includes('https://namcumz.io.vn/admin.html'));
  assert.ok(!topupText.includes('SUPER_SECRET_PASSWORD_DO_NOT_LEAK'));
  assert.ok(!topupText.includes('CIPHER_TEXT_DO_NOT_LEAK'));
  assert.ok(!topupText.includes('NAM-SECRET'));

  const boostText = formatOrderTelegramHtml('order_created', {
    id: '22222222-2222-4222-8222-222222222222',
    order_code: 'DH-BOOST-01',
    kind: 'boost',
    renter_name: 'Traveler',
    game_server: 'Asia',
    price: 0,
    content: 'La Hoàn tầng 12'
  });
  assert.ok(boostText.includes('ĐƠN CÀY THUÊ MỚI'));
  assert.ok(boostText.includes('Chờ shop báo giá'));

  const depositPaidText = formatOrderTelegramHtml('payment_confirmed', {
    id: '33333333-3333-4333-8333-333333333333',
    order_code: 'DH-DEP-01',
    kind: 'deposit',
    renter_name: 'Traveler',
    price: 200000,
    paid_amount: 200000,
    payment_status: 'PAID',
    payment_method: 'bank_transfer'
  }, { provider: 'sepay', amount: 200000 });
  assert.ok(depositPaidText.includes('NẠP VÍ THÀNH CÔNG'));
  assert.ok(depositPaidText.includes('200.000 VNĐ'));
});

test('OrderNotifier deduplicates repeated events, supports multi-channel isolation, and retries after failure', async () => {
  let telegramCalls = 0;
  let shouldFail = true;

  const notifier = new OrderNotifier({
    channels: [
      {
        name: 'telegram',
        send: async () => {
          telegramCalls += 1;
          if (shouldFail) return { sent: false, skipped: false, reason: 'TIMEOUT' };
          return { sent: true, skipped: false, reason: null };
        }
      },
      {
        name: 'discord_future_stub',
        send: async () => { throw new Error('simulated channel crash'); }
      }
    ]
  });

  const order = { id: '44444444-4444-4444-8444-444444444444', order_code: 'DH-DEDUPE', kind: 'topup', price: 85000 };

  // Failed send must release dedupe lock so retry can succeed.
  const first = await notifier.notifyOrderCreated(order);
  assert.equal(first.sent, false);
  assert.equal(telegramCalls, 1);

  shouldFail = false;
  const second = await notifier.notifyOrderCreated(order);
  assert.equal(second.sent, true);
  assert.equal(telegramCalls, 2);

  // Subsequent duplicate call within TTL must be skipped.
  const third = await notifier.notifyOrderCreated(order);
  assert.equal(third.skipped, true);
  assert.equal(third.reason, 'DUPLICATE_NOTIFICATION');
  assert.equal(telegramCalls, 2);
});

test('POST /api/notifications/order enforces auth, RLS safe query, freshness, and webhook secret', async () => {
  const sentEvents = [];
  const queriedTables = [];
  const queriedSelects = [];
  const mockNotifier = {
    async notify(event, order, meta) {
      sentEvents.push({ event, order, meta });
      return { ok: true, sent: true, skipped: false, channels: [{ name: 'telegram', sent: true }] };
    },
    async notifyOrderCreated(order, meta) { return this.notify('order_created', order, meta); },
    async notifyPaymentConfirmed(order, meta) { return this.notify('payment_confirmed', order, meta); }
  };

  let mockOrderRow = {
    id: '55555555-5555-4555-8555-555555555555',
    order_code: 'DH-555',
    kind: 'topup',
    renter_name: 'NAMCUM',
    content: '[Asia] [Genshin Impact] Welkin',
    game_server: 'Asia',
    price: 85000,
    paid_amount: 0,
    payment_status: 'PENDING',
    created_at: new Date().toISOString()
  };

  const handler = orderNotificationHandler.createHandler({
    notifier: mockNotifier,
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'public-anon-key',
    webhookSecret: 'super-webhook-secret',
    createSupabaseClient: () => ({
      auth: {
        getUser: async (token) => token === 'valid-jwt'
          ? { data: { user: { id: 'user-1' } }, error: null }
          : { data: { user: null }, error: { message: 'invalid' } }
      },
      from: (table) => {
        queriedTables.push(table);
        return {
          select: (cols) => {
            queriedSelects.push(cols);
            return {
              eq: () => ({
                maybeSingle: async () => ({ data: mockOrderRow, error: null })
              })
            };
          }
        };
      }
    })
  });

  // Method guard
  const resGet = createMockRes();
  await handler({ method: 'GET', headers: {} }, resGet);
  assert.equal(resGet.statusCode, 405);
  assert.equal(resGet.headers['Cache-Control'], 'private, no-store');

  // Missing auth
  const resNoAuth = createMockRes();
  await handler({ method: 'POST', headers: {}, body: { orderId: mockOrderRow.id } }, resNoAuth);
  assert.equal(resNoAuth.statusCode, 401);

  // Invalid UUID
  const resBadId = createMockRes();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid-jwt' }, body: { orderId: 'not-a-uuid' } }, resBadId);
  assert.equal(resBadId.statusCode, 400);

  // Valid fresh order_created
  const resOk = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt' },
    body: { orderId: mockOrderRow.id, event: 'order_created' }
  }, resOk);
  assert.equal(resOk.statusCode, 200);
  assert.equal(resOk.body.sent, true);
  assert.deepEqual(queriedTables, ['orders']);
  assert.equal(queriedSelects[0], SAFE_ORDER_SELECT);
  assert.ok(!queriedSelects[0].includes('account_password'));

  // Stale order skipped
  mockOrderRow = { ...mockOrderRow, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() };
  const resStale = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt' },
    body: { orderId: mockOrderRow.id, event: 'order_created' }
  }, resStale);
  assert.equal(resStale.statusCode, 200);
  assert.equal(resStale.body.skipped, true);
  assert.equal(resStale.body.reason, 'ORDER_NOT_FRESH');

  // Unpaid order cannot trigger payment_confirmed
  const resUnpaid = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt' },
    body: { orderId: mockOrderRow.id, event: 'payment_confirmed' }
  }, resUnpaid);
  assert.equal(resUnpaid.statusCode, 200);
  assert.equal(resUnpaid.body.reason, 'ORDER_NOT_PAID');

  // Manually settled order with null paid_at still enforces freshness via updated_at/created_at
  mockOrderRow = {
    ...mockOrderRow,
    paid_amount: 85000,
    paid_at: null,
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  };
  const resStalePayment = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt' },
    body: { orderId: mockOrderRow.id, event: 'payment_confirmed' }
  }, resStalePayment);
  assert.equal(resStalePayment.statusCode, 200);
  assert.equal(resStalePayment.body.skipped, true);
  assert.equal(resStalePayment.body.reason, 'PAYMENT_NOT_FRESH');

  // Wrong webhook secret rejected
  const resBadSecret = createMockRes();
  await handler({
    method: 'POST',
    headers: { 'x-webhook-secret': 'wrong-secret' },
    body: { type: 'INSERT', table: 'orders', record: mockOrderRow }
  }, resBadSecret);
  assert.equal(resBadSecret.statusCode, 401);

  // Valid Supabase DB Webhook INSERT
  const resWebhook = createMockRes();
  await handler({
    method: 'POST',
    headers: { 'x-webhook-secret': 'super-webhook-secret' },
    body: { type: 'INSERT', table: 'orders', record: mockOrderRow }
  }, resWebhook);
  assert.equal(resWebhook.statusCode, 200);
  assert.equal(sentEvents[sentEvents.length - 1].meta.source, 'supabase_webhook');
});

test('PaymentService notifies on newly matched payment and still succeeds if notifier throws', async () => {
  const notified = [];
  const baseService = new PaymentService({
    provider: 'sepay',
    webhookSecret: 'sec-123',
    supabaseClient: {
      rpc: async () => ({
        data: {
          success: true,
          matched: true,
          is_idempotent_replay: false,
          order_id: '66666666-6666-4666-8666-666666666666',
          order_code: 'DH-666',
          payment_reference: 'NCZ6666666',
          amount: 85000,
          is_deposit: false
        },
        error: null
      }),
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: '66666666-6666-4666-8666-666666666666',
                order_code: 'DH-666',
                kind: 'topup',
                renter_name: 'NAMCUM',
                content: '[Asia] [Genshin Impact] Welkin',
                game_server: 'Asia',
                price: 85000,
                paid_amount: 85000,
                payment_status: 'PAID',
                payment_reference: 'NCZ6666666'
              }
            })
          })
        })
      })
    },
    orderNotifier: {
      notifyPaymentConfirmed: async (order, meta) => { notified.push({ order, meta }); }
    }
  });

  const payload = {
    id: 'SEPAY-1001',
    gateway: 'Sacombank',
    transferType: 'in',
    accountNumber: '79202012546',
    transferAmount: 85000,
    content: 'CK NCZ6666666'
  };

  const res = await baseService.processWebhook({ authorization: 'Apikey sec-123' }, payload);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(notified.length, 1);
  assert.equal(notified[0].order.order_code, 'DH-666');
  assert.equal(notified[0].meta.amount, 85000);

  // Throwing notifier must NEVER fail webhook settlement response
  const failingNotifierService = new PaymentService({
    provider: 'sepay',
    webhookSecret: 'sec-123',
    supabaseClient: baseService.supabaseClient,
    orderNotifier: {
      notifyPaymentConfirmed: async () => { throw new Error('Telegram down'); }
    }
  });
  const resResilient = await failingNotifierService.processWebhook({ authorization: 'Apikey sec-123' }, payload);
  assert.equal(resResilient.status, 200);
  assert.equal(resResilient.body.success, true);
});
