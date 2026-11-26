import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import chatHandler from '../api/ai/chat.js';

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
      this.headers[key.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createMockSupabaseFactory(validTokens = { 'valid-jwt': { id: 'user-1' } }) {
  const calls = [];
  const createSupabaseClient = (url, anonKey, opts) => ({
    auth: {
      getUser: async (token) => {
        calls.push({ url, anonKey, token, authHeader: opts?.global?.headers?.Authorization });
        const user = validTokens[token];
        if (user) return { data: { user }, error: null };
        return { data: { user: null }, error: { message: 'Invalid JWT' } };
      }
    }
  });
  return { createSupabaseClient, calls };
}

function createMockGeminiFetch(replyText = 'Xin chào từ Gemini AI Namcumz!') {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: replyText }] } }]
      })
    };
  };
  return { fetchImpl, calls };
}

test('rejects payloads > 4096 bytes with HTTP 413 (pre-parsed object, Content-Length, string, and stream)', async () => {
  const gemini = createMockGeminiFetch();
  const supa = createMockSupabaseFactory();
  const handler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    createSupabaseClient: supa.createSupabaseClient,
    fetch: gemini.fetchImpl
  });

  // 1. 60KB pre-parsed object body without Content-Length (Vercel default behavior)
  const resPreParsed = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '10.0.0.1' },
    body: { message: 'a'.repeat(60 * 1024) }
  }, resPreParsed);
  assert.equal(resPreParsed.statusCode, 413);

  // 2. Content-Length header > 4096 bytes
  const resHeader = createMockRes();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://namcumz.io.vn',
      'content-length': String(60 * 1024),
      'x-forwarded-for': '10.0.0.2'
    },
    body: { message: 'hi' }
  }, resHeader);
  assert.equal(resHeader.statusCode, 413);

  // 3. Raw string body > 4096 bytes
  const resString = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '10.0.0.3' },
    body: JSON.stringify({ message: 'b'.repeat(5000) })
  }, resString);
  assert.equal(resString.statusCode, 413);

  // 4. Streamed request body > 4096 bytes
  const streamReq = new EventEmitter();
  streamReq.method = 'POST';
  streamReq.headers = { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '10.0.0.4' };
  const resStream = createMockRes();
  const pending = handler(streamReq, resStream);
  streamReq.emit('data', Buffer.from('{"message":"' + 'c'.repeat(5000) + '"}'));
  streamReq.emit('end');
  await pending;
  assert.equal(resStream.statusCode, 413);

  assert.equal(gemini.calls.length, 0);
});

test('rejects invalid/oversized inputs with HTTP 400 instead of silently truncating (>600 chars, >8 messages, >2000 total chars)', async () => {
  const gemini = createMockGeminiFetch();
  const supa = createMockSupabaseFactory();
  const handler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    createSupabaseClient: supa.createSupabaseClient,
    fetch: gemini.fetchImpl
  });

  // Single message > 600 chars
  const resOver600Single = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt', 'x-forwarded-for': '10.1.0.1' },
    body: { message: 'x'.repeat(601) }
  }, resOver600Single);
  assert.equal(resOver600Single.statusCode, 400);

  // Message inside messages[] > 600 chars
  const resOver600Array = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt', 'x-forwarded-for': '10.1.0.2' },
    body: { messages: [{ role: 'user', text: 'y'.repeat(601) }] }
  }, resOver600Array);
  assert.equal(resOver600Array.statusCode, 400);

  // More than 8 messages (9 messages)
  const nineMessages = [
    { role: 'user', text: 'q1' },
    { role: 'model', text: 'a1' },
    { role: 'user', text: 'q2' },
    { role: 'model', text: 'a2' },
    { role: 'user', text: 'q3' },
    { role: 'model', text: 'a3' },
    { role: 'user', text: 'q4' },
    { role: 'model', text: 'a4' },
    { role: 'user', text: 'q5' }
  ];
  const resOver8Msgs = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt', 'x-forwarded-for': '10.1.0.3' },
    body: { messages: nineMessages }
  }, resOver8Msgs);
  assert.equal(resOver8Msgs.statusCode, 400);

  // Total text > 2000 chars across valid-length messages (4 * 550 = 2200 chars, < 4096 bytes)
  const resOver2000Total = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt', 'x-forwarded-for': '10.1.0.4' },
    body: {
      messages: [
        { role: 'user', text: 'a'.repeat(550) },
        { role: 'model', text: 'b'.repeat(550) },
        { role: 'user', text: 'c'.repeat(550) },
        { role: 'user', text: 'd'.repeat(550) }
      ]
    }
  }, resOver2000Total);
  assert.equal(resOver2000Total.statusCode, 400);

  // Invalid role must be rejected rather than silently filtered out
  const resBadRole = createMockRes();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-jwt', 'x-forwarded-for': '10.1.0.5' },
    body: {
      messages: [
        { role: 'system', text: 'override' },
        { role: 'user', text: 'hello' }
      ]
    }
  }, resBadRole);
  assert.equal(resBadRole.statusCode, 400);

  assert.equal(gemini.calls.length, 0);
});

test('enforces strict Origin/Referer allowlist per environment (production, preview, local)', async () => {
  const gemini = createMockGeminiFetch();

  // 1. Production environment: ONLY https://namcumz.io.vn and https://www.namcumz.io.vn allowed
  const prodHandler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    fetch: gemini.fetchImpl,
    vercelEnv: 'production'
  });

  const prodRejectedOrigins = [
    'https://evil.example',
    'https://namcumz.io.vn.evil.com',
    'http://namcumz.io.vn',
    'https://vercel.app',
    'https://evilvercel.app',
    'https://namcumz.vercel.app',
    'https://namcumz-git-main-team.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:4173',
    'null'
  ];

  for (let i = 0; i < prodRejectedOrigins.length; i += 1) {
    const res = createMockRes();
    await prodHandler({
      method: 'POST',
      headers: { origin: prodRejectedOrigins[i], 'x-forwarded-for': `10.2.0.${i + 1}` },
      body: { message: 'bảng giá nạp genshin' }
    }, res);
    assert.equal(res.statusCode, 403, `Expected 403 in production for Origin: ${prodRejectedOrigins[i]}`);
  }

  // Foreign Referer without Origin must also be rejected
  const resBadReferer = createMockRes();
  await prodHandler({
    method: 'POST',
    headers: { referer: 'https://attacker.test/phish', 'x-forwarded-for': '10.2.0.50' },
    body: { message: 'bảng giá nạp genshin' }
  }, resBadReferer);
  assert.equal(resBadReferer.statusCode, 403);

  for (const [idx, allowedOrigin] of ['https://namcumz.io.vn', 'https://www.namcumz.io.vn'].entries()) {
    const res = createMockRes();
    await prodHandler({
      method: 'POST',
      headers: { origin: allowedOrigin, 'x-forwarded-for': `10.2.1.${idx + 1}` },
      body: { message: 'bảng giá nạp genshin' }
    }, res);
    assert.equal(res.statusCode, 200, `Expected 200 in production for Origin: ${allowedOrigin}`);
    assert.equal(res.body.source, 'namcumz-smart-kb');
  }

  // 2. Preview environment: only the exact deployment VERCEL_URL host (+ production domains)
  const previewHandler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    fetch: gemini.fetchImpl,
    vercelEnv: 'preview',
    vercelUrl: 'namcumz-git-main-team.vercel.app'
  });

  const resExactPreview = createMockRes();
  await previewHandler({
    method: 'POST',
    headers: { origin: 'https://namcumz-git-main-team.vercel.app', 'x-forwarded-for': '10.2.2.1' },
    body: { message: 'bảng giá nạp genshin' }
  }, resExactPreview);
  assert.equal(resExactPreview.statusCode, 200);

  for (const foreignPreview of ['https://other-project.vercel.app', 'https://namcumz.vercel.app']) {
    const res = createMockRes();
    await previewHandler({
      method: 'POST',
      headers: { origin: foreignPreview, 'x-forwarded-for': '10.2.2.2' },
      body: { message: 'bảng giá nạp genshin' }
    }, res);
    assert.equal(res.statusCode, 403, `Preview must reject unrelated vercel origin: ${foreignPreview}`);
  }

  // 3. Local/development environment: allows localhost & 127.0.0.1
  const localHandler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    fetch: gemini.fetchImpl,
    vercelEnv: ''
  });
  for (const [idx, localOrigin] of ['http://localhost:3000', 'http://127.0.0.1:4173'].entries()) {
    const res = createMockRes();
    await localHandler({
      method: 'POST',
      headers: { origin: localOrigin, 'x-forwarded-for': `10.2.3.${idx + 1}` },
      body: { message: 'bảng giá nạp genshin' }
    }, res);
    assert.equal(res.statusCode, 200, `Expected 200 in local dev for Origin: ${localOrigin}`);
  }

  assert.equal(gemini.calls.length, 0);
});

test('out-of-scope guest questions get polite scope guidance instead of welcome menu ($0)', async () => {
  const gemini = createMockGeminiFetch();
  const handler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    fetch: gemini.fetchImpl,
    vercelEnv: 'production'
  });

  const resMath = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '10.2.9.1' },
    body: { message: '2 + 2 bằng mấy?' }
  }, resMath);
  assert.equal(resMath.statusCode, 200);
  assert.equal(resMath.body.source, 'namcumz-smart-kb');
  assert.ok(resMath.body.text.includes('ngoài phạm vi cửa hàng'));
  assert.ok(!resMath.body.text.includes('Xin chào! Trợ lý AI Namcumz sẵn sàng'));

  const resGreet = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '10.2.9.2' },
    body: { message: 'Xin chào shop' }
  }, resGreet);
  assert.equal(resGreet.statusCode, 200);
  assert.ok(resGreet.body.text.includes('Xin chào! Trợ lý AI Namcumz'));

  assert.equal(gemini.calls.length, 0);
});

test('enforces IP rate limit of 8 requests/minute/IP and returns 429 with Retry-After', async () => {
  let currentTime = 1_700_000_000_000;
  const handler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    now: () => currentTime,
    fetch: async () => { throw new Error('Gemini must not be called for guests'); }
  });

  for (let i = 1; i <= 8; i += 1) {
    const res = createMockRes();
    await handler({
      method: 'POST',
      headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '203.0.113.10' },
      body: { message: `câu hỏi ${i}` }
    }, res);
    assert.equal(res.statusCode, 200, `Request ${i} should succeed`);
  }

  // 9th request within the same minute -> 429 + Retry-After
  const resLimited = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '203.0.113.10' },
    body: { message: 'câu hỏi 9' }
  }, resLimited);
  assert.equal(resLimited.statusCode, 429);
  const retryAfter = Number(resLimited.headers['retry-after']);
  assert.ok(Number.isInteger(retryAfter) && retryAfter >= 1 && retryAfter <= 60, `Invalid Retry-After: ${resLimited.headers['retry-after']}`);

  // Different IP is unaffected
  const resOtherIp = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '203.0.113.11' },
    body: { message: 'câu hỏi khác' }
  }, resOtherIp);
  assert.equal(resOtherIp.statusCode, 200);

  // Original IP recovers after 60s window expires
  currentTime += 61_000;
  const resRecovered = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '203.0.113.10' },
    body: { message: 'câu hỏi sau 1 phút' }
  }, resRecovered);
  assert.equal(resRecovered.statusCode, 200);
});

test('guest and invalid-JWT requests return Smart KB ($0) without calling Gemini fetch', async () => {
  const gemini = createMockGeminiFetch();
  const supa = createMockSupabaseFactory({ 'real-user-jwt': { id: 'user-real' } });
  const handler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    createSupabaseClient: supa.createSupabaseClient,
    fetch: gemini.fetchImpl
  });

  // 1. Guest without Authorization header
  const resGuest = createMockRes();
  await handler({
    method: 'POST',
    headers: { origin: 'https://namcumz.io.vn', 'x-forwarded-for': '198.51.100.1' },
    body: { message: 'Bảng giá nạp Genshin Impact' }
  }, resGuest);
  assert.equal(resGuest.statusCode, 200);
  assert.equal(resGuest.body.source, 'namcumz-smart-kb');
  assert.ok(resGuest.body.text.includes('90.000đ'));
  assert.ok(resGuest.body.text.includes('570.000đ'));
  assert.ok(resGuest.body.text.includes('950.000đ'));
  assert.equal(resGuest.body.reply, resGuest.body.text);
  assert.equal(supa.calls.length, 0);
  assert.equal(gemini.calls.length, 0);

  // 2. Forged/expired Bearer JWT still falls back cleanly to Smart KB and NEVER calls Gemini
  const resInvalidJwt = createMockRes();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://namcumz.io.vn',
      authorization: 'Bearer forged-jwt',
      'x-forwarded-for': '198.51.100.2'
    },
    body: { message: 'Bảng giá cày thuê Genshin Impact' }
  }, resInvalidJwt);
  assert.equal(resInvalidJwt.statusCode, 200);
  assert.equal(resInvalidJwt.body.source, 'namcumz-smart-kb');
  assert.ok(resInvalidJwt.body.text.includes('140.000đ/tháng'));
  assert.equal(supa.calls.length, 1);
  assert.equal(gemini.calls.length, 0);
});

test('authenticated Supabase user calls Gemini and respects 10 requests/hour/user cap with Smart KB fallback', async () => {
  let currentTime = 1_700_000_000_000;
  const gemini = createMockGeminiFetch('Trả lời từ Gemini 2.5 Flash cho khách đã đăng nhập.');
  const supa = createMockSupabaseFactory({
    'jwt-alice': { id: 'user-alice' },
    'jwt-bob': { id: 'user-bob' }
  });
  const handler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    geminiModel: 'gemini-2.5-flash',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    createSupabaseClient: supa.createSupabaseClient,
    fetch: gemini.fetchImpl,
    now: () => currentTime
  });

  // First 8 requests in minute 1 -> Gemini called
  for (let i = 1; i <= 8; i += 1) {
    const res = createMockRes();
    await handler({
      method: 'POST',
      headers: {
        origin: 'https://namcumz.io.vn',
        authorization: 'Bearer jwt-alice',
        'x-forwarded-for': '198.51.100.20'
      },
      body: { message: `Hỏi Gemini lần ${i}` }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.source, 'gemini-2.5-flash');
    assert.equal(res.body.text, 'Trả lời từ Gemini 2.5 Flash cho khách đã đăng nhập.');
  }
  assert.equal(gemini.calls.length, 8);

  // Advance 2 minutes (IP window resets, same hour window for user-alice)
  currentTime += 120_000;

  // Requests 9 and 10 -> still within 10/hr cap -> Gemini called
  for (let i = 9; i <= 10; i += 1) {
    const res = createMockRes();
    await handler({
      method: 'POST',
      headers: {
        origin: 'https://namcumz.io.vn',
        authorization: 'Bearer jwt-alice',
        'x-forwarded-for': '198.51.100.20'
      },
      body: { message: `Hỏi Gemini lần ${i}` }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.source, 'gemini-2.5-flash');
  }
  assert.equal(gemini.calls.length, 10);

  // 11th request in same hour (even from a different IP!) -> hits 10/hr user cap -> Smart KB fallback without calling Gemini
  const resOverQuota = createMockRes();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://namcumz.io.vn',
      authorization: 'Bearer jwt-alice',
      'x-forwarded-for': '198.51.100.21'
    },
    body: { message: 'cách nạp tiền vào tk' }
  }, resOverQuota);
  assert.equal(resOverQuota.statusCode, 200);
  assert.equal(resOverQuota.body.source, 'namcumz-smart-kb');
  assert.ok(resOverQuota.body.text.includes('VietQR'));
  assert.equal(gemini.calls.length, 10);

  // Another authenticated user (bob) has an independent 10/hr quota
  const resBob = createMockRes();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://namcumz.io.vn',
      authorization: 'Bearer jwt-bob',
      'x-forwarded-for': '198.51.100.22'
    },
    body: { message: 'Xin chào' }
  }, resBob);
  assert.equal(resBob.statusCode, 200);
  assert.equal(resBob.body.source, 'gemini-2.5-flash');
  assert.equal(gemini.calls.length, 11);

  // Advance > 1 hour -> alice quota resets
  currentTime += 61 * 60 * 1000;
  const resReset = createMockRes();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://namcumz.io.vn',
      authorization: 'Bearer jwt-alice',
      'x-forwarded-for': '198.51.100.20'
    },
    body: { message: 'Hỏi sau 1 giờ' }
  }, resReset);
  assert.equal(resReset.statusCode, 200);
  assert.equal(resReset.body.source, 'gemini-2.5-flash');
  assert.equal(gemini.calls.length, 12);

  // Gemini upstream failure falls back cleanly to Smart KB
  const failingHandler = chatHandler.createHandler({
    geminiApiKey: 'test-gemini-key',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    createSupabaseClient: supa.createSupabaseClient,
    fetch: async () => ({ ok: false, status: 503, json: async () => ({}) })
  });
  const resGeminiFail = createMockRes();
  await failingHandler({
    method: 'POST',
    headers: {
      origin: 'https://namcumz.io.vn',
      authorization: 'Bearer jwt-alice',
      'x-forwarded-for': '198.51.100.23'
    },
    body: { message: 'Bảng giá nạp Genshin Impact' }
  }, resGeminiFail);
  assert.equal(resGeminiFail.statusCode, 200);
  assert.equal(resGeminiFail.body.source, 'namcumz-smart-kb');
});

test('client assets/js/ai-chat.js enforces 600-char max length and attaches Bearer JWT only when signed in', async () => {
  const clientSrc = readFileSync(new URL('../assets/js/ai-chat.js', import.meta.url), 'utf8');

  function mountClient({ supabaseClient = null, fetchImpl }) {
    const listeners = new Map();
    const appendedMessages = [];
    const makeEl = (id) => {
      const el = {
        id,
        value: '',
        hidden: true,
        disabled: false,
        maxLength: 0,
        scrollHeight: 24,
        scrollTop: 0,
        style: {},
        attrs: {},
        setAttribute(k, v) { this.attrs[k] = v; },
        getAttribute(k) { return this.attrs[k] ?? null; },
        addEventListener(type, fn) {
          if (!listeners.has(id)) listeners.set(id, {});
          listeners.get(id)[type] = fn;
        },
        focus() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        insertBefore() {},
        appendChild(child) { appendedMessages.push(child); return child; },
        requestSubmit() {
          const fn = listeners.get(id)?.submit;
          if (fn) return fn({ preventDefault() {} });
        }
      };
      return el;
    };

    const elements = {
      'nc-ai-chat': makeEl('nc-ai-chat'),
      'nc-ai-chat-toggle': makeEl('nc-ai-chat-toggle'),
      'nc-ai-chat-close': makeEl('nc-ai-chat-close'),
      'nc-ai-chat-body': makeEl('nc-ai-chat-body'),
      'nc-ai-chat-form': makeEl('nc-ai-chat-form'),
      'nc-ai-chat-input': makeEl('nc-ai-chat-input'),
      'nc-ai-chat-send': makeEl('nc-ai-chat-send'),
      'nc-ai-chat-messages': makeEl('nc-ai-chat-messages')
    };

    const windowObj = { supabaseClient };
    const context = {
      window: windowObj,
      document: {
        getElementById: (id) => elements[id] || null,
        createElement: () => ({
          className: '',
          style: {},
          textContent: '',
          innerHTML: '',
          setAttribute() {},
          querySelectorAll() { return []; }
        }),
        addEventListener() {}
      },
      fetch: fetchImpl,
      TextEncoder,
      setTimeout,
      clearTimeout
    };

    vm.runInNewContext(clientSrc, context);
    return {
      elements,
      listeners,
      appendedMessages,
      submit: () => listeners.get('nc-ai-chat-form').submit({ preventDefault() {} })
    };
  }

  // 1. Guest mode: maxLength=600 enforced, >600 blocked client-side, valid prompt sent without Authorization
  const guestFetchCalls = [];
  const guest = mountClient({
    supabaseClient: null,
    fetchImpl: async (url, init) => {
      guestFetchCalls.push({ url, init });
      return {
        ok: true,
        headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => ({ text: 'Trả lời Smart KB', source: 'namcumz-smart-kb' })
      };
    }
  });

  assert.equal(guest.elements['nc-ai-chat-input'].maxLength, 600);
  assert.equal(guest.elements['nc-ai-chat-input'].attrs.maxlength, '600');

  guest.elements['nc-ai-chat-input'].value = 'z'.repeat(601);
  await guest.submit();
  assert.equal(guestFetchCalls.length, 0);
  assert.ok(guest.appendedMessages.at(-1).textContent.includes('600'));

  guest.elements['nc-ai-chat-input'].value = 'cách nạp tiền';
  await guest.submit();
  assert.equal(guestFetchCalls.length, 1);
  assert.equal(guestFetchCalls[0].url, '/api/ai/chat');
  assert.equal(guestFetchCalls[0].init.headers.Authorization, undefined);

  // 2. Signed-in user: attaches Authorization: Bearer <access_token>
  const authFetchCalls = [];
  const authed = mountClient({
    supabaseClient: {
      auth: {
        getSession: async () => ({ data: { session: { access_token: 'supa-access-token-123' } } })
      }
    },
    fetchImpl: async (url, init) => {
      authFetchCalls.push({ url, init });
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ text: 'Trả lời Gemini', source: 'gemini-2.5-flash' })
      };
    }
  });

  authed.elements['nc-ai-chat-input'].value = 'Tư vấn gói nạp Genshin';
  await authed.submit();
  assert.equal(authFetchCalls.length, 1);
  assert.equal(authFetchCalls[0].init.headers.Authorization, 'Bearer supa-access-token-123');

  // 3. Failing getSession never blocks chat
  const resilientCalls = [];
  const resilient = mountClient({
    supabaseClient: {
      auth: {
        getSession: async () => { throw new Error('session storage locked'); }
      }
    },
    fetchImpl: async (url, init) => {
      resilientCalls.push({ url, init });
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ text: 'Smart KB fallback', source: 'namcumz-smart-kb' })
      };
    }
  });
  resilient.elements['nc-ai-chat-input'].value = 'Giá thẻ tháng';
  await resilient.submit();
  assert.equal(resilientCalls.length, 1);
  assert.equal(resilientCalls[0].init.headers.Authorization, undefined);
});
