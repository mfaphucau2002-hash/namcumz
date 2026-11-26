/**
 * Vercel Serverless Function: POST /api/notifications/order
 * Sends order lifecycle alerts to configured notification channels (Telegram now, Discord ready).
 *
 * Supports two verified modes:
 * 1. Authenticated Client Trigger: verifies caller Supabase JWT and fetches the order via RLS.
 *    Client only passes { orderId, event } and can never spoof content, price, or another user's order.
 * 2. Supabase Database Webhook (optional): verifies X-Webhook-Secret via timingSafeEqual on INSERT/UPDATE
 *    of public.orders for 100% server-side guarantee even if a browser tab closes immediately.
 */

const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { SAFE_ORDER_SELECT, defaultOrderNotifier } = require('../lib/order-notifier');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_EVENTS = new Set(['order_created', 'payment_confirmed']);
const MAX_ORDER_AGE_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 20;

function timingSafeMatch(provided, expected) {
  const a = Buffer.from(String(provided || ''), 'utf8');
  const b = Buffer.from(String(expected || ''), 'utf8');
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getHeader(headers = {}, name) {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? String(value[0] || '') : String(value || '');
    }
  }
  return '';
}

function parseJsonBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (_) { return {}; }
  }
  return typeof body === 'object' ? body : {};
}

function isFreshTimestamp(isoValue, maxAgeMs = MAX_ORDER_AGE_MS, now = Date.now()) {
  if (!isoValue) return true;
  const ts = new Date(isoValue).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts <= maxAgeMs && ts - now <= 60 * 1000;
}

function createOrderNotificationHandler(deps = {}) {
  const notifier = deps.notifier || defaultOrderNotifier;
  const createSupabaseClient = deps.createSupabaseClient || createClient;
  const rateWindows = deps.rateWindows instanceof Map ? deps.rateWindows : new Map();

  function checkRateLimit(userId) {
    const now = Date.now();
    if (rateWindows.size > 1000) {
      for (const [k, entry] of rateWindows.entries()) {
        if (now - entry.start > RATE_WINDOW_MS) rateWindows.delete(k);
      }
    }
    const existing = rateWindows.get(userId);
    if (!existing || now - existing.start > RATE_WINDOW_MS) {
      rateWindows.set(userId, { start: now, count: 1 });
      return true;
    }
    existing.count += 1;
    return existing.count <= RATE_MAX_REQUESTS;
  }

  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    }

    const body = parseJsonBody(req.body);
    const webhookSecret = String(deps.webhookSecret ?? process.env.ORDER_NOTIFY_WEBHOOK_SECRET ?? '').trim();
    const incomingSecret = getHeader(req.headers, 'x-webhook-secret') || getHeader(req.headers, 'x-namcumz-webhook-secret');

    // Path 1: Supabase Database Webhook (server-to-server)
    if (incomingSecret) {
      if (!webhookSecret || !timingSafeMatch(incomingSecret, webhookSecret)) {
        return res.status(401).json({ ok: false, error: 'INVALID_WEBHOOK_SECRET' });
      }
      if (body.table && body.table !== 'orders') {
        return res.status(200).json({ ok: true, skipped: true, reason: 'IGNORED_TABLE' });
      }

      const webhookType = String(body.type || '').toUpperCase();
      const record = body.record && typeof body.record === 'object' ? body.record : null;
      const oldRecord = body.old_record && typeof body.old_record === 'object' ? body.old_record : null;

      if (!record || !record.id) {
        return res.status(400).json({ ok: false, error: 'INVALID_WEBHOOK_PAYLOAD' });
      }

      if (webhookType === 'INSERT') {
        const result = await notifier.notifyOrderCreated(record, { source: 'supabase_webhook' });
        return res.status(200).json({ ok: true, event: 'order_created', ...result });
      }

      if (
        webhookType === 'UPDATE'
        && String(oldRecord?.payment_status || '').toUpperCase() !== 'PAID'
        && String(record.payment_status || '').toUpperCase() === 'PAID'
      ) {
        const result = await notifier.notifyPaymentConfirmed(record, { source: 'supabase_webhook' });
        return res.status(200).json({ ok: true, event: 'payment_confirmed', ...result });
      }

      return res.status(200).json({ ok: true, skipped: true, reason: 'IGNORED_EVENT' });
    }

    // Path 2: Authenticated Client Trigger (default zero-SQL mode)
    const notifyMode = String(deps.notifyMode ?? process.env.ORDER_NOTIFY_MODE ?? 'auto').trim().toLowerCase();
    if (notifyMode === 'webhook') {
      return res.status(200).json({ ok: true, skipped: true, reason: 'WEBHOOK_MODE_ENABLED' });
    }

    const token = getHeader(req.headers, 'authorization').replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({ ok: false, error: 'AUTH_REQUIRED' });
    }

    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const event = typeof body.event === 'string' ? body.event.trim() : 'order_created';
    if (!UUID_REGEX.test(orderId) || !VALID_EVENTS.has(event)) {
      return res.status(400).json({ ok: false, error: 'INVALID_REQUEST' });
    }

    const supabaseUrl = deps.supabaseUrl ?? (process.env.SUPABASE_URL || process.env.NAMCUMZ_STAGING_URL);
    const supabaseAnonKey = deps.supabaseAnonKey ?? (process.env.SUPABASE_ANON_KEY || process.env.NAMCUMZ_STAGING_KEY);
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({ ok: false, error: 'NOT_CONFIGURED' });
    }

    try {
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false }
      });

      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData?.user?.id) {
        return res.status(401).json({ ok: false, error: 'AUTH_REQUIRED' });
      }

      if (!checkRateLimit(authData.user.id)) {
        return res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
      }

      // Query ONLY safe columns of public.orders under caller's RLS. Never touches order_credentials.
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(SAFE_ORDER_SELECT)
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) {
        return res.status(503).json({ ok: false, error: 'ORDER_LOOKUP_FAILED' });
      }
      if (!order) {
        return res.status(404).json({ ok: false, error: 'ORDER_NOT_FOUND' });
      }

      if (event === 'order_created' && !isFreshTimestamp(order.created_at)) {
        return res.status(200).json({ ok: true, skipped: true, reason: 'ORDER_NOT_FRESH' });
      }

      if (event === 'payment_confirmed') {
        const isPaid = String(order.payment_status || '').toUpperCase() === 'PAID'
          || (Number(order.price) > 0 && Number(order.paid_amount) >= Number(order.price));
        if (!isPaid) {
          return res.status(200).json({ ok: true, skipped: true, reason: 'ORDER_NOT_PAID' });
        }
        const paymentTimestamp = order.paid_at || order.updated_at || order.created_at;
        if (!isFreshTimestamp(paymentTimestamp)) {
          return res.status(200).json({ ok: true, skipped: true, reason: 'PAYMENT_NOT_FRESH' });
        }
      }

      const result = await notifier.notify(event, order, { source: 'client_rpc' });
      return res.status(200).json({ ok: true, event, ...result });
    } catch (_) {
      return res.status(503).json({ ok: false, error: 'NOTIFICATION_UNAVAILABLE' });
    }
  };
}

const defaultHandler = createOrderNotificationHandler();
defaultHandler.createHandler = createOrderNotificationHandler;

module.exports = defaultHandler;
