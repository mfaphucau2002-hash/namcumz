const crypto = require('node:crypto');
const { createHmac, timingSafeEqual } = crypto;
const consentCookie = 'namcumz_ai_adult_consent';
const requestWindows = new Map();
const CONSENT_TTL_SECONDS = 30 * 60;

// Sign a short-lived, HttpOnly cookie after the visitor confirms age and data processing.
function consentSignature(timestamp) {
  return createHmac('sha256', process.env.GEMINI_API_KEY).update(timestamp).digest('hex');
}

// Check that the signed adult and privacy acknowledgement is recent.
function hasValidConsent(req) {
  const entry = String(req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${consentCookie}=`));
  if (!entry) return false;
  const token = entry.slice(consentCookie.length + 1);
  const [timestamp, signature] = token.split('.');
  if (!/^\d{10}$/.test(timestamp || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (ageSeconds < 0 || ageSeconds > CONSENT_TTL_SECONDS) return false;
  const expected = Buffer.from(consentSignature(timestamp));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Limit requests per client IP for this serverless instance to reduce accidental bursts.
function overLimit(req) {
  const now = Date.now();
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 80);
  const recent = (requestWindows.get(ip) || []).filter(time => now - time < 60_000);
  if (recent.length >= 12) return true;
  recent.push(now);
  requestWindows.set(ip, recent);
  if (requestWindows.size > 5000) {
    for (const [key, times] of requestWindows) if (!times.some(time => now - time < 60_000)) requestWindows.delete(key);
  }
  return false;
}

// Handle the public support chat while keeping the Gemini key and prompts server-side.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Phương thức không được hỗ trợ.' });
  }
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ message: 'Trợ lý AI chưa được cấu hình.' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  if (body.action === 'consent') {
    if (body.adult !== true || body.googleProcessing !== true) {
      return res.status(400).json({ message: 'Cần xác nhận đủ 18 tuổi và đồng ý xử lý tin nhắn qua Google Gemini.' });
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const cookieValue = `${timestamp}.${consentSignature(timestamp)}`;
    res.setHeader('Set-Cookie', `${consentCookie}=${cookieValue}; Path=/api/ai/chat; Max-Age=${CONSENT_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`);
    return res.status(200).json({ success: true });
  }

  if (!hasValidConsent(req)) return res.status(403).json({ message: 'Vui lòng xác nhận cổng 18+ và thông tin xử lý dữ liệu trước khi chat.' });
  if (overLimit(req)) return res.status(429).json({ message: 'Bạn gửi hơi nhanh. Vui lòng đợi một phút rồi thử lại.' });

  const messages = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
  const contents = messages
    .filter(message => message && ['user', 'model'].includes(message.role) && typeof message.text === 'string')
    .map(message => ({ role: message.role, parts: [{ text: message.text.trim().slice(0, 600) }] }))
    .filter(message => message.parts[0].text);
  if (!contents.length || contents.at(-1).role !== 'user' || contents.reduce((size, item) => size + item.parts[0].text.length, 0) > 4000) {
    return res.status(400).json({ message: 'Nội dung chat không hợp lệ hoặc quá dài.' });
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const resultResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: 'Bạn là trợ lý hỗ trợ khách hàng NAMCUMZ, trả lời ngắn gọn bằng tiếng Việt. Chỉ dựa vào thông tin đã biết: NAMCUMZ hỗ trợ dịch vụ cày thuê và nạp game; giờ hỗ trợ công bố trên website là 07:00–23:00; Zalo chính thức là 0763550673 tại https://zalo.me/0763550673; xem câu hỏi thường gặp tại https://namcumz.io.vn/faq.html và điều khoản tại https://namcumz.io.vn/terms.html. Không bịa giá, tình trạng đơn, cam kết hoàn tiền, đảm bảo an toàn hay chính sách chưa được cung cấp. Không yêu cầu khách gửi mật khẩu, OTP hoặc thông tin đăng nhập game; nếu khách cần xem đơn, thanh toán, xử lý tài khoản hoặc vấn đề nhạy cảm, hướng dẫn đăng nhập và dùng trang hồ sơ hoặc liên hệ Zalo. Nhắc rằng bạn là AI và có thể sai khi phù hợp.' }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 }
      })
    });
    const payload = await resultResponse.json().catch(() => ({}));
    if (!resultResponse.ok) {
      const providerError = payload.error || {};
      console.error('Public Gemini API rejected request:', JSON.stringify({
        httpStatus: resultResponse.status,
        providerStatus: providerError.status || null,
        providerCode: providerError.code || null,
        providerMessage: String(providerError.message || '').slice(0, 300)
      }));
      return res.status(resultResponse.status === 429 ? 503 : 502).json({ message: resultResponse.status === 429 ? 'Trợ lý AI đang bận. Vui lòng thử lại sau.' : 'Chưa kết nối được trợ lý AI.' });
    }
    const text = (payload.candidates || []).flatMap(candidate => candidate.content?.parts || []).map(part => part.text || '').join('').trim();
    if (!text) return res.status(502).json({ message: 'Trợ lý AI chưa trả lời được. Bạn có thể liên hệ Zalo CSKH.' });
    return res.status(200).json({ text });
  } catch (error) {
    console.error('Public AI chat failed:', error?.message || 'unknown error');
    return res.status(500).json({ message: 'Không thể kết nối trợ lý AI lúc này.' });
  }
};
