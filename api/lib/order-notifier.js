/**
 * Multi-channel Order Notification Dispatcher (Server-side only)
 * Currently dispatches to Telegram Bot API and provides a clean channel
 * interface to plug in Discord (or other channels) later without changing callers.
 *
 * Security invariant: NEVER reads or transmits game account credentials/passwords.
 */

const { escapeTelegramHtml, sendTelegramMessage } = require('./telegram-notifier');

const SAFE_ORDER_SELECT = [
  'id',
  'order_code',
  'kind',
  'renter_name',
  'content',
  'game_server',
  'price',
  'paid_amount',
  'required_amount',
  'payment_status',
  'payment_method',
  'payment_reference',
  'status',
  'cancelled',
  'created_at',
  'updated_at',
  'paid_at'
].join(', ');

const DEFAULT_SITE_URL = 'https://namcumz.io.vn';
const DEFAULT_DEDUPE_TTL_MS = 10 * 60 * 1000;
const MAX_DEDUPE_ENTRIES = 1000;

/**
 * Strip any non-whitelisted or potentially sensitive fields from an order object.
 */
function sanitizeOrderForNotification(rawOrder = {}) {
  const order = rawOrder && typeof rawOrder === 'object' ? rawOrder : {};
  const kindRaw = String(order.kind || '').trim().toLowerCase();
  const kind = ['topup', 'boost', 'deposit'].includes(kindRaw)
    ? kindRaw
    : (String(order.content || '').includes('[Nạp Game]') ? 'topup' : 'boost');

  return {
    id: order.id ? String(order.id).trim() : '',
    order_code: order.order_code ? String(order.order_code).trim() : '',
    kind,
    renter_name: order.renter_name ? String(order.renter_name).trim().slice(0, 100) : 'Khách hàng',
    content: order.content ? String(order.content).trim().slice(0, 420) : '',
    game_server: order.game_server ? String(order.game_server).trim().slice(0, 40) : '',
    price: Number.isFinite(Number(order.price)) ? Number(order.price) : 0,
    paid_amount: Number.isFinite(Number(order.paid_amount)) ? Number(order.paid_amount) : 0,
    required_amount: Number.isFinite(Number(order.required_amount)) ? Number(order.required_amount) : 0,
    payment_status: order.payment_status ? String(order.payment_status).trim().toUpperCase() : 'PENDING',
    payment_method: order.payment_method ? String(order.payment_method).trim() : '',
    payment_reference: order.payment_reference ? String(order.payment_reference).trim().slice(0, 64) : '',
    status: order.status ? String(order.status).trim() : 'cho_xu_ly',
    cancelled: Boolean(order.cancelled),
    created_at: order.created_at || null,
    paid_at: order.paid_at || null
  };
}

function formatVnd(amount) {
  const num = Number(amount || 0);
  if (!Number.isFinite(num) || num <= 0) return '0 VNĐ';
  return `${Math.round(num).toLocaleString('vi-VN')} VNĐ`;
}

function formatVietnamDateTime(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false
    }).format(date);
  } catch (_) {
    return date.toISOString();
  }
}

function getKindLabel(kind) {
  if (kind === 'topup') return '💎 Nạp Game (Login)';
  if (kind === 'deposit') return '💳 Nạp Ví Namcumz';
  return '⚔️ Cày Thuê';
}

function getPaymentMethodLabel(method, provider) {
  const m = String(method || '').toLowerCase();
  const p = String(provider || '').toLowerCase();
  if (m === 'wallet') return 'Số dư ví Namcumz';
  if (p === 'sepay' || p === 'casso' || m === 'bank_transfer') return 'Chuyển khoản VietQR';
  if (m === 'manual') return 'Admin xác nhận thủ công';
  return 'Chuyển khoản VietQR';
}

function getPaymentStatusLabel(status) {
  if (status === 'PAID') return '✅ Đã thanh toán';
  if (status === 'VERIFYING') return '🔄 Đang xác minh';
  if (status === 'EXPIRED') return '⌛ Hết hạn';
  if (status === 'FAILED') return '❌ Thất bại';
  return '⏳ Chờ thanh toán';
}

function resolveSiteBaseUrl(rawUrl) {
  const value = String(rawUrl || process.env.SITE_BASE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');
  return /^https?:\/\/[^/\s]+/i.test(value) ? value : DEFAULT_SITE_URL;
}

/**
 * Format a clean, HTML-safe Telegram notification for an order event.
 */
function formatOrderTelegramHtml(event, rawOrder, meta = {}) {
  const order = sanitizeOrderForNotification(rawOrder);
  const baseUrl = resolveSiteBaseUrl(meta.siteBaseUrl);
  const isPayment = event === 'payment_confirmed';

  let heading = '📦 <b>THÔNG BÁO ĐƠN HÀNG</b>';
  if (isPayment) {
    heading = order.kind === 'deposit'
      ? '💰 <b>NẠP VÍ THÀNH CÔNG</b>'
      : '✅ <b>ĐƠN HÀNG ĐÃ THANH TOÁN</b>';
  } else if (order.kind === 'topup') {
    heading = '💎 <b>ĐƠN NẠP GAME MỚI</b>';
  } else if (order.kind === 'deposit') {
    heading = '💳 <b>YÊU CẦU NẠP VÍ MỚI</b>';
  } else {
    heading = '⚔️ <b>ĐƠN CÀY THUÊ MỚI</b>';
  }

  const displayAmount = isPayment
    ? formatVnd(meta.amount || order.paid_amount || order.price)
    : (order.price > 0 ? formatVnd(order.price) : 'Chờ shop báo giá');

  const lines = [
    heading,
    `• <b>Mã đơn:</b> <code>${escapeTelegramHtml(order.order_code || order.id || '—')}</code>`,
    `• <b>Loại:</b> ${escapeTelegramHtml(getKindLabel(order.kind))}`,
    `• <b>Khách hàng:</b> ${escapeTelegramHtml(order.renter_name)}`
  ];

  if (order.kind !== 'deposit' && order.game_server) {
    lines.push(`• <b>Máy chủ:</b> ${escapeTelegramHtml(order.game_server)}`);
  }

  lines.push(`• <b>${isPayment ? 'Số tiền đã nhận' : 'Tổng tiền'}:</b> <b>${escapeTelegramHtml(displayAmount)}</b>`);

  if (order.payment_reference) {
    lines.push(`• <b>Mã CK (Ref):</b> <code>${escapeTelegramHtml(order.payment_reference)}</code>`);
  }

  if (isPayment) {
    lines.push(`• <b>Phương thức:</b> ${escapeTelegramHtml(getPaymentMethodLabel(order.payment_method, meta.provider))}`);
  } else {
    lines.push(`• <b>Thanh toán:</b> ${escapeTelegramHtml(getPaymentStatusLabel(order.payment_status))}`);
  }

  if (order.content) {
    lines.push(`• <b>Nội dung:</b> ${escapeTelegramHtml(order.content)}`);
  }

  lines.push(`• <b>Thời gian:</b> ${escapeTelegramHtml(formatVietnamDateTime(isPayment ? (order.paid_at || new Date()) : order.created_at))}`);

  const adminUrl = `${baseUrl}/admin.html`;
  const detailUrl = order.id
    ? `${baseUrl}/dashboard.html?order=${encodeURIComponent(order.id)}`
    : `${baseUrl}/dashboard.html`;

  lines.push(`🔗 <a href="${escapeTelegramHtml(adminUrl)}">Mở Admin Panel</a> | <a href="${escapeTelegramHtml(detailUrl)}">Chi tiết đơn</a>`);

  if (order.kind === 'topup') {
    lines.push('🔒 <i>TK/MK nạp game được mã hóa Vault — mở Admin/Dashboard để xem an toàn.</i>');
  }

  return lines.join('\n');
}

class OrderNotifier {
  constructor(options = {}) {
    this.siteBaseUrl = resolveSiteBaseUrl(options.siteBaseUrl);
    this.dedupeTtlMs = Number(options.dedupeTtlMs) > 0 ? Number(options.dedupeTtlMs) : DEFAULT_DEDUPE_TTL_MS;
    this.dedupeMap = options.dedupeMap instanceof Map ? options.dedupeMap : new Map();

    // Pluggable channel registry (Telegram active now; Discord adapter plugs in here next).
    if (Array.isArray(options.channels) && options.channels.length > 0) {
      this.channels = options.channels;
    } else {
      const telegramOptions = options.telegramOptions || {};
      this.channels = [
        {
          name: 'telegram',
          send: async ({ event, order, meta }) => {
            const text = formatOrderTelegramHtml(event, order, { ...meta, siteBaseUrl: this.siteBaseUrl });
            return sendTelegramMessage({ ...telegramOptions, text });
          }
        }
      ];
    }
  }

  pruneDedupe(now) {
    for (const [key, expiresAt] of this.dedupeMap.entries()) {
      if (expiresAt <= now) this.dedupeMap.delete(key);
    }
    while (this.dedupeMap.size > MAX_DEDUPE_ENTRIES) {
      const oldestKey = this.dedupeMap.keys().next().value;
      if (oldestKey === undefined) break;
      this.dedupeMap.delete(oldestKey);
    }
  }

  async notify(event, rawOrder, meta = {}) {
    const order = sanitizeOrderForNotification(rawOrder);
    const dedupeId = order.id || order.order_code;
    const dedupeKey = dedupeId ? `${event}:${dedupeId}` : null;
    const now = Date.now();

    if (dedupeKey && !meta.bypassDedupe) {
      this.pruneDedupe(now);
      const existing = this.dedupeMap.get(dedupeKey);
      if (existing && existing > now) {
        return { ok: true, skipped: true, reason: 'DUPLICATE_NOTIFICATION', channels: [] };
      }
      this.dedupeMap.set(dedupeKey, now + this.dedupeTtlMs);
    }

    const settled = await Promise.allSettled(
      this.channels.map(async channel => {
        const result = await channel.send({ event, order, meta });
        return { name: channel.name, ...result };
      })
    );

    const channelResults = settled.map((item, idx) => {
      if (item.status === 'fulfilled') return item.value;
      return {
        name: this.channels[idx]?.name || 'unknown',
        sent: false,
        skipped: false,
        reason: 'CHANNEL_EXCEPTION'
      };
    });

    const anySent = channelResults.some(ch => ch.sent);
    const allSkipped = channelResults.length > 0 && channelResults.every(ch => ch.skipped);

    // Release dedupe key if every non-skipped channel failed so a retry can succeed.
    if (dedupeKey && !anySent && !allSkipped) {
      this.dedupeMap.delete(dedupeKey);
    }

    return {
      ok: anySent || allSkipped,
      sent: anySent,
      skipped: allSkipped,
      channels: channelResults
    };
  }

  notifyOrderCreated(order, meta = {}) {
    return this.notify('order_created', order, meta);
  }

  notifyPaymentConfirmed(order, meta = {}) {
    return this.notify('payment_confirmed', order, meta);
  }
}

const defaultOrderNotifier = new OrderNotifier();

module.exports = {
  SAFE_ORDER_SELECT,
  OrderNotifier,
  defaultOrderNotifier,
  sanitizeOrderForNotification,
  formatOrderTelegramHtml
};
