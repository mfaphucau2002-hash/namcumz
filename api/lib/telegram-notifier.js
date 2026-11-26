/**
 * Telegram Bot API Adapter (Server-side only)
 * Uses native Node.js fetch with AbortController timeout and zero external dependencies.
 * Never logs bot tokens or sensitive credentials.
 */

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Escape text safely for Telegram HTML parse_mode.
 */
function escapeTelegramHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Parse one or more comma-separated Telegram chat IDs.
 */
function parseChatIds(rawChatId) {
  if (Array.isArray(rawChatId)) {
    return rawChatId.map(item => String(item ?? '').trim()).filter(Boolean);
  }
  return String(rawChatId ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Parse an optional Telegram forum topic thread ID.
 */
function parseThreadId(rawThreadId) {
  const num = Number.parseInt(String(rawThreadId ?? '').trim(), 10);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}

/**
 * Send an HTML-formatted message to configured Telegram chat(s).
 */
async function sendTelegramMessage(options = {}) {
  const botToken = String(options.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const chatIds = parseChatIds(options.chatId ?? process.env.TELEGRAM_CHAT_ID ?? '');
  const threadId = parseThreadId(options.threadId ?? process.env.TELEGRAM_THREAD_ID ?? '');
  const text = String(options.text ?? '').trim();
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (!botToken || chatIds.length === 0) {
    return { sent: false, skipped: true, reason: 'TELEGRAM_NOT_CONFIGURED', results: [] };
  }
  if (!text) {
    return { sent: false, skipped: true, reason: 'EMPTY_MESSAGE', results: [] };
  }
  if (typeof fetchImpl !== 'function') {
    return { sent: false, skipped: false, reason: 'FETCH_UNAVAILABLE', results: [] };
  }

  const endpoint = `${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`;
  const results = [];

  for (const chatId of chatIds) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const payload = {
        chat_id: chatId,
        text: text.slice(0, 4096),
        parse_mode: 'HTML',
        disable_web_page_preview: options.disableWebPagePreview !== false
      };
      if (threadId) {
        payload.message_thread_id = threadId;
      }

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      let body = null;
      try {
        body = await response.json();
      } catch (_) {
        body = null;
      }

      const ok = Boolean(response.ok && body?.ok !== false);
      results.push({
        chatId,
        ok,
        status: response.status,
        error: ok ? null : (body?.description || `HTTP_${response.status}`)
      });
    } catch (err) {
      results.push({
        chatId,
        ok: false,
        status: 0,
        error: err?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR'
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const sent = results.some(item => item.ok);
  return {
    sent,
    skipped: false,
    reason: sent ? null : (results[0]?.error || 'SEND_FAILED'),
    results
  };
}

module.exports = {
  escapeTelegramHtml,
  parseChatIds,
  parseThreadId,
  sendTelegramMessage
};
