/**
 * Vercel Serverless Function: /api/ai/chat
 * Trợ lý AI Namcumz - Tích hợp Gemini (multi-model 2.5/2.0 Flash) cho người dùng đã đăng nhập
 * + Smart Knowledge Base Namcumz ($0, tức thì) cho khách vãng lai & dự phòng.
 * Bảo vệ anti-abuse: Origin/Referer allowlist, giới hạn payload 4096 bytes (413),
 * kiểm tra nghiêm đầu vào (400), IP rate limit 8 req/phút (429 + Retry-After),
 * và giới hạn Gemini 10 req/giờ/user đã xác thực Supabase JWT.
 */
const crypto = require('node:crypto');
const { createHmac, timingSafeEqual } = crypto;
const { createClient } = require('@supabase/supabase-js');

const consentCookie = 'namcumz_ai_adult_consent';
const CONSENT_TTL_SECONDS = 30 * 60;
const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

const MAX_BODY_BYTES = 4096;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 600;
const MAX_TOTAL_CHARS = 2000;
const IP_RATE_WINDOW_MS = 60_000;
const IP_RATE_MAX_REQUESTS = 8;
const USER_GEMINI_WINDOW_MS = 60 * 60 * 1000;
const USER_GEMINI_MAX_REQUESTS = 10;
const VERCEL_APP_HOST_RE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app$/;

const SYSTEM_INSTRUCTION = [
    'Bạn là Trợ lý AI Namcumz cho website nạp game & cày thuê chính hãng https://namcumz.com.',
    'Phong cách trả lời: lịch sự, nhiệt tình, ngắn gọn (2-5 câu), rõ ràng theo từng bước.',
    '',
    'THÔNG TIN DỊCH VỤ CHÍNH THỨC TẠI NAMCUMZ:',
    '1. CÁCH NẠP TIỀN VÀO TÀI KHOẢN WEB NAMCUMZ:',
    '   - Bước 1: Đăng nhập tài khoản trên web Namcumz (nút Đăng nhập góc phải trên).',
    '   - Bước 2: Bấm nút "+ Nạp Tiền" trên thanh menu (hoặc vào Hồ sơ cá nhân -> Nạp tiền / chọn phương thức VietQR khi đặt đơn).',
    '   - Bước 3: Quét mã QR Ngân hàng tự động (VietQR) hoặc chuyển khoản đúng Nội dung chuyển khoản hiển thị trên màn hình.',
    '   - Bước 4: Hệ thống tự động cộng số dư trong 1 - 3 phút. Nếu quá 5 phút chưa cộng, nhắn Zalo CSKH 0763.550.673 kèm ảnh bill để được hỗ trợ ngay.',
    '',
    '2. DỊCH VỤ ĐANG MỞ BÁN (HOẠT ĐỘNG 24/7):',
    '   - Nạp Genshin Impact (Login):',
    '     + Không Nguyệt Chúc Phúc (Thẻ tháng): 85.000đ (Khuyến mãi -29%).',
    '     + Nhật Ký Hành Trình Trân Châu (BP thường): 190.000đ.',
    '     + Bài Ca Trân Châu (BP nâng cấp +20 cấp + danh thiếp): 380.000đ.',
    '     + Đá Sáng Thế: 60 Đá (20.000đ), 300+30 Đá (90.000đ), 980+110 Đá (270.000đ), 1980+260 Đá (570.000đ), 3280+600 Đá (950.000đ), 6480+1600 Đá (1.850.000đ), Full Pack (3.800.000đ).',
    '   - Cày Thuê Genshin Impact (Cày tay 100%, bảo mật tuyệt đối):',
    '     + Điểm dịch chuyển: Lẻ từng quốc gia 25.000đ - 65.000đ/vùng; Full Teyvat 200.000đ.',
    '     + Thần Đồng: Phong/Cá Chép/Mã Não/Lưu Minh Thạch 30k, Nham 50k, Lôi 70k, Thủy 90k, Hỏa/Băng 100k, Thảo 140k.',
    '     + Explore Map 100%: Long Tích 50k, Trầm Ngọc Cốc 90k, Mondstadt/Vực Đá Sâu 120k, Liyue/Enkanomiya/Biển Kỷ Nguyên/Núi Thánh 150k, Sương Nguyệt 250k, Inazuma 300k, Sumeru Rừng Mưa 400k, Sumeru Sa Mạc/Fontaine/Nod-Krai 450k.',
    '     + Content Game: La Hoàn tầng 12 (30.000đ), Ảo Cảnh Diff 6 (45.000đ), Nhà Hát Full 12 Tầng (80.000đ), Combo cả 3 chế độ (130.000đ).',
    '     + Chăm Acc: Daily ngày 5.000đ, Daily + Xả nhựa 140.000đ/tháng.',
    '',
    '3. CÁC DỊCH VỤ TẠM NGƯNG (ĐANG BẢO TRÌ):',
    '   - Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves và Mua Thẻ Game hiện đang TẠM NGƯNG để nâng cấp cổng thanh toán.',
    '',
    '4. NGUYÊN TẮC BẢO MẬT & HỖ TRỢ:',
    '   - Tuyệt đối KHÔNG yêu cầu khách gửi mật khẩu hoặc mã OTP vào khung chat AI.',
    '   - Cần kiểm tra đơn gấp hoặc xử lý sự cố: liên hệ Zalo CSKH 0763.550.673 (hoạt động 07:00 - 23:00 hàng ngày).'
].join('\n');

function buildLocalNamcumzReply(rawMessage) {
    const text = String(rawMessage || '').trim();
    const q = text.toLowerCase();

    if (/nạp tiền|nap tien|vào tk|vao tk|số dư|so du|chuyển khoản|chuyen khoan|vietqr|qr|bank|ngân hàng/.test(q)) {
        return [
            '💳 Hướng dẫn nạp tiền vào tài khoản Namcumz (Tự động 1 - 3 phút):',
            '1️⃣ Đăng nhập tài khoản trên web Namcumz (góc phải trên màn hình).',
            '2️⃣ Bấm nút "+ Nạp Tiền" trên thanh menu hoặc vào mục Hồ sơ cá nhân -> Nạp tiền.',
            '3️⃣ Nhập số tiền cần nạp và quét mã QR Ngân hàng (VietQR) với đúng Nội dung chuyển khoản hiển thị.',
            '4️⃣ Hệ thống sẽ tự động cộng số dư sau 1 - 3 phút. Bạn cũng có thể chọn thanh toán QR trực tiếp ngay ở bước Đặt đơn!',
            '📞 Nếu cần hỗ trợ kiểm tra giao dịch nhanh, nhắn Zalo CSKH: 0763.550.673.'
        ].join('\n');
    }

    if (/thẻ tháng|the thang|không nguyệt|khong nguyet|welkin|nhật ký|nhat ky|trân châu|tran chau|battle pass|bp|bài ca/.test(q)) {
        return [
            '🌙 Bảng giá Thẻ Tháng & Nhật Ký Hành Trình Genshin Impact (Nạp Login chính hãng):',
            '• Không Nguyệt Chúc Phúc (Thẻ tháng): 85.000đ (tiết kiệm 29%).',
            '• Nhật Ký Hành Trình Trân Châu (BP thường): 190.000đ.',
            '• Bài Ca Trân Châu (BP nâng cấp +20 cấp + danh thiếp): 380.000đ.',
            '👉 Đặt đơn tại mục "Genshin Impact (Login)" ở trang chủ. Xử lý siêu tốc 5 - 15 phút!'
        ].join('\n');
    }

    if (/đá sáng thế|da sang the|nguyên thạch|nguyen thach|nạp genshin|nap genshin|gói nạp|goi nap|bảng giá nạp|bang gia nap/.test(q)) {
        return [
            '💎 Bảng giá Nạp Genshin Impact (Login) chính hãng tại Namcumz:',
            '• Không Nguyệt Chúc Phúc: 85.000đ | BP Trân Châu: 190.000đ | Bài Ca Trân Châu: 380.000đ',
            '• 60 Đá: 20.000đ | 300+30 Đá: 90.000đ | 980+110 Đá: 270.000đ',
            '• 1980+260 Đá: 570.000đ | 3280+600 Đá: 950.000đ | 6480+1600 Đá: 1.850.000đ | Full Pack: 3.800.000đ',
            '✅ Cam kết nạp chính hãng 100% có hóa đơn, bảo hành không âm nguyên thạch. Lưu ý: KHÔNG gửi mật khẩu/OTP vào chat này nhé!'
        ].join('\n');
    }

    if (/cày thuê|cay thue|full map|thần đồng|than dong|la hoàn|la hoan|nhà hát|nha hat|chăm acc|cham acc|nod-krai|nod krai|natlan|fontaine|sumeru/.test(q)) {
        return [
            '⚔️ Bảng giá Cày Thuê Genshin Impact (Cày tay 100% - Bảo mật tuyệt đối):',
            '• Mở Điểm Dịch Chuyển: 25.000đ - 65.000đ/vùng | Full Teyvat: 200.000đ.',
            '• Nhặt Full Thần Đồng: Phong 30k, Nham 50k, Lôi 70k, Thủy 90k, Hỏa/Băng 100k, Thảo 140k.',
            '• Explore Map 100%: Long Tích 50k, Trầm Ngọc Cốc 90k, Mondstadt từ 120k, Liyue từ 150k, Inazuma 300k, Sumeru từ 400k, Fontaine/Nod-Krai 450k.',
            '• La Hoàn Tầng 12 (30k) | Ảo Cảnh Diff 6 (45k) | Nhà Hát Full (80k) | Combo cả 3 chỉ 130.000đ.',
            '• Chăm Acc: Ngày 5k | Daily + Xả nhựa: 140.000đ/tháng.'
        ].join('\n');
    }

    if (/đơn hàng|don hang|kiểm tra đơn|kiem tra don|lịch sử|lich su|bao lâu|bao lau|xử lý|xu ly|chưa nhận|chua nhan/.test(q)) {
        return [
            '📦 Cách kiểm tra tiến độ đơn hàng tại Namcumz:',
            '• Thời gian xử lý đơn Nạp Game: 5 - 15 phút sau khi thanh toán thành công.',
            '• Xem trạng thái đơn: Bấm vào tên tài khoản (góc phải trên) -> chọn "Hồ sơ cá nhân" -> tab "Đơn Nạp Game" hoặc "Đơn Cày Thuê".',
            '• Cần thúc đơn gấp hoặc gửi mã OTP đăng nhập game: Nhắn trực tiếp Zalo CSKH 0763.550.673 kèm Mã đơn hàng nhé!'
        ].join('\n');
    }

    if (/star rail|hsr|zenless|zzz|wuthering|wuwa|thẻ game|the game|zing|garena/.test(q)) {
        return [
            '🔔 Thông báo trạng thái dịch vụ:',
            '• Hiện tại Namcumz đang mở hoạt động 100% cho 2 dịch vụ trọng điểm: Nạp Genshin Impact (Login) và Cày Thuê Genshin Impact.',
            '• Các mục Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves và Mua Thẻ Game đang tạm ngưng bảo trì cổng thanh toán.',
            '📞 Bạn cần tư vấn thêm có thể nhắn Zalo CSKH: 0763.550.673 nhé!'
        ].join('\n');
    }

    if (/uy tín|uy tin|an toàn|an toan|bảo hành|bao hanh|âm nguyên thạch|am nguyen thach|bảo mật|bao mat/.test(q)) {
        return [
            '🛡️ Cam kết An Toàn & Bảo Hành tại Namcumz:',
            '• Nạp Chính Hãng 100%: Đầy đủ hóa đơn thanh toán, bảo hành vĩnh viễn không âm Nguyên Thạch.',
            '• Cày Tay 100%: Tuyệt đối không dùng tool/hack/cheat, xóa nhật ký thiết bị sau khi hoàn tất đơn.',
            '• Hỗ trợ tận tâm từ 07:00 - 23:00 mỗi ngày qua Zalo CSKH: 0763.550.673.'
        ].join('\n');
    }

    return [
        '✨ Xin chào! Trợ lý AI Namcumz sẵn sàng hỗ trợ bạn các thông tin chính:',
        '1️⃣ Cách nạp tiền vào TK: Đăng nhập -> bấm "+ Nạp Tiền" trên menu -> Quét mã VietQR tự động (1-3 phút).',
        '2️⃣ Nạp Genshin Impact (Login): Thẻ tháng 85.000đ, BP Trân Châu 190.000đ, Bài Ca Trân Châu 380.000đ, Đá Sáng Thế từ 20.000đ.',
        '3️⃣ Cày Thuê Genshin: Explore Map 100%, Thần Đồng, Điểm Dịch Chuyển, La Hoàn & Chăm Acc chỉ từ 5.000đ.',
        '💬 Bạn muốn hỏi chi tiết về mục nào, hoặc nhắn Zalo CSKH 0763.550.673 để được hỗ trợ trực tiếp nhé!'
    ].join('\n');
}

class PayloadTooLargeError extends Error {
    constructor(message = 'Payload too large') {
        super(message);
        this.name = 'PayloadTooLargeError';
        this.statusCode = 413;
    }
}

class InvalidBodyError extends Error {
    constructor(message = 'Invalid JSON body') {
        super(message);
        this.name = 'InvalidBodyError';
        this.statusCode = 400;
    }
}

// Read an HTTP header value case-insensitively.
function getHeader(headers = {}, name) {
    const target = String(name || '').toLowerCase();
    for (const [key, value] of Object.entries(headers || {})) {
        if (key.toLowerCase() === target) {
            return Array.isArray(value) ? String(value[0] || '') : String(value || '');
        }
    }
    return '';
}

// Validate Origin or Referer against the strict Namcumz/Vercel/local preview allowlist.
function isAllowedOrigin(rawValue, { allowPath = false } = {}) {
    const trimmed = String(rawValue || '').trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') return false;
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch (_err) {
        return false;
    }
    if (!allowPath) {
        if (
            parsed.username ||
            parsed.password ||
            parsed.search ||
            parsed.hash ||
            parsed.pathname !== '/' ||
            trimmed.endsWith('/')
        ) {
            return false;
        }
    }
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port;

    if (protocol === 'https:' && port === '') {
        if (hostname === 'namcumz.io.vn' || hostname === 'www.namcumz.io.vn') {
            return true;
        }
        if (VERCEL_APP_HOST_RE.test(hostname)) {
            return true;
        }
    }
    if ((protocol === 'http:' || protocol === 'https:') && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        return true;
    }
    return false;
}

// Reject requests carrying a foreign Origin or foreign Referer header.
function isOriginAllowed(req) {
    const origin = getHeader(req.headers, 'origin').trim();
    const referer = getHeader(req.headers, 'referer').trim();
    if (origin && !isAllowedOrigin(origin, { allowPath: false })) {
        return false;
    }
    if (referer && !isAllowedOrigin(referer, { allowPath: true })) {
        return false;
    }
    return true;
}

function getClientIp(req) {
    const raw =
        getHeader(req.headers, 'x-vercel-forwarded-for') ||
        getHeader(req.headers, 'x-real-ip') ||
        getHeader(req.headers, 'x-forwarded-for') ||
        req.socket?.remoteAddress ||
        'unknown';
    return String(raw).split(',')[0].trim().slice(0, 80) || 'unknown';
}

function consentSecret(geminiApiKey) {
    return process.env.AI_CONSENT_SECRET || geminiApiKey || RUNTIME_FALLBACK_SECRET;
}

function consentSignature(timestamp, geminiApiKey) {
    return createHmac('sha256', consentSecret(geminiApiKey)).update(timestamp).digest('hex');
}

function hasValidConsent(req, nowMs, geminiApiKey) {
    const entry = getHeader(req.headers, 'cookie')
        .split(';')
        .map(part => part.trim())
        .find(part => part.startsWith(`${consentCookie}=`));
    if (!entry) return false;
    const token = entry.slice(consentCookie.length + 1);
    const [timestamp, signature] = token.split('.');
    if (!/^\d{10}$/.test(timestamp || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return false;
    const ageSeconds = Math.floor(nowMs / 1000) - Number(timestamp);
    if (ageSeconds < 0 || ageSeconds > CONSENT_TTL_SECONDS) return false;
    const expected = Buffer.from(consentSignature(timestamp, geminiApiKey));
    const received = Buffer.from(signature);
    return expected.length === received.length && timingSafeEqual(expected, received);
}

// Enforce MAX_BODY_BYTES across Content-Length, rawBody, pre-parsed req.body, and request stream.
function readJsonBody(req) {
    const rawContentLength = getHeader(req.headers, 'content-length').trim();
    if (rawContentLength !== '') {
        if (!/^\d+$/.test(rawContentLength)) {
            return Promise.reject(new InvalidBodyError('Invalid Content-Length header'));
        }
        if (Number(rawContentLength) > MAX_BODY_BYTES) {
            return Promise.reject(new PayloadTooLargeError('Content-Length exceeds limit'));
        }
    }

    if (req.rawBody !== undefined && req.rawBody !== null) {
        const rawBytes = Buffer.isBuffer(req.rawBody) || req.rawBody instanceof Uint8Array
            ? req.rawBody.byteLength
            : Buffer.byteLength(String(req.rawBody), 'utf8');
        if (rawBytes > MAX_BODY_BYTES) {
            return Promise.reject(new PayloadTooLargeError('Raw body exceeds limit'));
        }
    }

    if (req.body !== undefined) {
        if (Buffer.isBuffer(req.body) || req.body instanceof Uint8Array) {
            if (req.body.byteLength > MAX_BODY_BYTES) {
                return Promise.reject(new PayloadTooLargeError('Body buffer exceeds limit'));
            }
            const text = Buffer.from(req.body).toString('utf8');
            try {
                return Promise.resolve(text ? JSON.parse(text) : {});
            } catch (_err) {
                return Promise.reject(new InvalidBodyError());
            }
        }
        if (typeof req.body === 'string') {
            if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) {
                return Promise.reject(new PayloadTooLargeError('Body string exceeds limit'));
            }
            try {
                return Promise.resolve(req.body ? JSON.parse(req.body) : {});
            } catch (_err) {
                return Promise.reject(new InvalidBodyError());
            }
        }
        if (req.body && typeof req.body === 'object') {
            let serialized;
            try {
                serialized = JSON.stringify(req.body);
            } catch (_err) {
                return Promise.reject(new InvalidBodyError());
            }
            if (typeof serialized !== 'string') {
                return Promise.reject(new InvalidBodyError());
            }
            if (Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) {
                return Promise.reject(new PayloadTooLargeError('Serialized body exceeds limit'));
            }
            return Promise.resolve(req.body);
        }
        return Promise.reject(new InvalidBodyError());
    }

    if (typeof req.on !== 'function') {
        return Promise.resolve({});
    }

    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalBytes = 0;
        let settled = false;

        req.on('data', chunk => {
            if (settled) return;
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
            totalBytes += buf.length;
            if (totalBytes > MAX_BODY_BYTES) {
                settled = true;
                reject(new PayloadTooLargeError('Streamed payload exceeds limit'));
                return;
            }
            chunks.push(buf);
        });
        req.on('end', () => {
            if (settled) return;
            settled = true;
            const raw = Buffer.concat(chunks).toString('utf8');
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (_err) {
                reject(new InvalidBodyError());
            }
        });
        req.on('error', err => {
            if (settled) return;
            settled = true;
            reject(err);
        });
    });
}

// Strictly validate chat input without silently truncating oversized arrays or strings.
function validateChatContents(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { valid: false, contents: [] };
    }

    const contents = [];

    if (body.messages !== undefined) {
        if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
            return { valid: false, contents: [] };
        }
        for (const item of body.messages) {
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return { valid: false, contents: [] };
            }
            if (item.role !== 'user' && item.role !== 'model') {
                return { valid: false, contents: [] };
            }
            if (typeof item.text !== 'string') {
                return { valid: false, contents: [] };
            }
            const trimmed = item.text.trim();
            if (!trimmed || item.text.length > MAX_MESSAGE_CHARS || trimmed.length > MAX_MESSAGE_CHARS) {
                return { valid: false, contents: [] };
            }
            contents.push({ role: item.role, parts: [{ text: trimmed }] });
        }
    } else if (body.message !== undefined) {
        if (typeof body.message !== 'string') {
            return { valid: false, contents: [] };
        }
        const trimmed = body.message.trim();
        if (!trimmed || body.message.length > MAX_MESSAGE_CHARS || trimmed.length > MAX_MESSAGE_CHARS) {
            return { valid: false, contents: [] };
        }
        contents.push({ role: 'user', parts: [{ text: trimmed }] });
    } else {
        return { valid: false, contents: [] };
    }

    if (!contents.length || contents.at(-1).role !== 'user') {
        return { valid: false, contents: [] };
    }

    const totalChars = contents.reduce((sum, item) => sum + item.parts[0].text.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
        return { valid: false, contents: [] };
    }

    return { valid: true, contents };
}

async function tryGeminiModels(apiKey, contents, { fetchImpl, preferredModel }) {
    if (typeof fetchImpl !== 'function') return null;
    const models = [
        preferredModel,
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest'
    ].filter(Boolean);
    const uniqueModels = [...new Set(models)];

    for (const model of uniqueModels) {
        if (model === 'gemini-1.5-flash') continue; // Deprecated on v1beta
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8500);
        try {
            const response = await fetchImpl(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                        contents,
                        generationConfig: { temperature: 0.35, maxOutputTokens: 450 }
                    }),
                    signal: controller.signal
                }
            );
            if (!response || !response.ok) continue;
            const payload = await response.json().catch(() => ({}));
            const text = (payload.candidates || [])
                .flatMap(candidate => candidate.content?.parts || [])
                .map(part => part.text || '')
                .join('')
                .trim();
            if (text) return { text, model };
        } catch (_err) {
            // Try next model
        } finally {
            clearTimeout(timeout);
        }
    }
    return null;
}

// Create an isolated /api/ai/chat handler with injectable dependencies for offline testing.
function createHandler(deps = {}) {
    const ipRateWindows = deps.ipRateWindows instanceof Map ? deps.ipRateWindows : new Map();
    const userGeminiWindows = deps.userGeminiWindows instanceof Map ? deps.userGeminiWindows : new Map();
    const nowFn = typeof deps.now === 'function' ? deps.now : () => Date.now();
    const fetchImpl = deps.fetch || deps.fetchImpl || globalThis.fetch;
    const createSupabaseClient =
        deps.createSupabaseClient ||
        (deps.supabaseClient ? () => deps.supabaseClient : createClient);

    function checkIpRateLimit(req) {
        const now = nowFn();
        const ip = getClientIp(req);
        const recent = (ipRateWindows.get(ip) || []).filter(time => now - time < IP_RATE_WINDOW_MS);
        if (recent.length >= IP_RATE_MAX_REQUESTS) {
            const oldest = recent[0];
            const retryAfterSeconds = Math.max(1, Math.ceil((IP_RATE_WINDOW_MS - (now - oldest)) / 1000));
            ipRateWindows.set(ip, recent);
            return { allowed: false, retryAfterSeconds };
        }
        recent.push(now);
        ipRateWindows.set(ip, recent);
        if (ipRateWindows.size > 5000) {
            for (const [key, times] of ipRateWindows) {
                if (!times.some(time => now - time < IP_RATE_WINDOW_MS)) ipRateWindows.delete(key);
            }
        }
        return { allowed: true, retryAfterSeconds: 0 };
    }

    function consumeUserGeminiQuota(userId) {
        const now = nowFn();
        const key = String(userId);
        const recent = (userGeminiWindows.get(key) || []).filter(time => now - time < USER_GEMINI_WINDOW_MS);
        if (recent.length >= USER_GEMINI_MAX_REQUESTS) {
            userGeminiWindows.set(key, recent);
            return false;
        }
        recent.push(now);
        userGeminiWindows.set(key, recent);
        if (userGeminiWindows.size > 5000) {
            for (const [k, times] of userGeminiWindows) {
                if (!times.some(time => now - time < USER_GEMINI_WINDOW_MS)) userGeminiWindows.delete(k);
            }
        }
        return true;
    }

    async function verifySupabaseUser(token, supabaseUrl, supabaseAnonKey) {
        if (!token || !supabaseUrl || !supabaseAnonKey || typeof createSupabaseClient !== 'function') {
            return null;
        }
        try {
            const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: `Bearer ${token}` } },
                auth: { persistSession: false, autoRefreshToken: false }
            });
            if (typeof supabase?.auth?.getUser !== 'function') return null;
            const { data, error } = await supabase.auth.getUser(token);
            if (error || !data?.user?.id) return null;
            return data.user;
        } catch (_err) {
            return null;
        }
    }

    return async function handler(req, res) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Vary', 'Origin');

        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return res.status(405).json({ message: 'Phương thức không được hỗ trợ.' });
        }

        if (!isOriginAllowed(req)) {
            return res.status(403).json({ message: 'Nguồn yêu cầu không được phép.' });
        }

        let body = {};
        try {
            body = await readJsonBody(req);
        } catch (err) {
            if (err && (err instanceof PayloadTooLargeError || err.statusCode === 413)) {
                return res.status(413).json({ message: 'Dữ liệu gửi lên vượt quá giới hạn 4096 bytes.' });
            }
            return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ.' });
        }

        const rateCheck = checkIpRateLimit(req);
        if (!rateCheck.allowed) {
            res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
            return res.status(429).json({
                message: 'Bạn gửi hơi nhanh. Vui lòng đợi ít giây rồi thử lại.',
                retryAfter: rateCheck.retryAfterSeconds
            });
        }

        const apiKey = 'geminiApiKey' in deps ? deps.geminiApiKey : process.env.GEMINI_API_KEY;
        const preferredModel = 'geminiModel' in deps ? deps.geminiModel : process.env.GEMINI_MODEL;
        const supabaseUrl = 'supabaseUrl' in deps
            ? deps.supabaseUrl
            : (process.env.SUPABASE_URL || process.env.NAMCUMZ_STAGING_URL);
        const supabaseAnonKey = 'supabaseAnonKey' in deps
            ? deps.supabaseAnonKey
            : (process.env.SUPABASE_ANON_KEY || process.env.NAMCUMZ_STAGING_KEY);

        const nowMs = nowFn();

        if (body && typeof body === 'object' && !Array.isArray(body) && body.action === 'consent') {
            const timestamp = String(Math.floor(nowMs / 1000));
            const cookieValue = `${timestamp}.${consentSignature(timestamp, apiKey)}`;
            res.setHeader(
                'Set-Cookie',
                `${consentCookie}=${cookieValue}; Path=/api/ai/chat; Max-Age=${CONSENT_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`
            );
            return res.status(200).json({ success: true });
        }

        if (!hasValidConsent(req, nowMs, apiKey)) {
            const timestamp = String(Math.floor(nowMs / 1000));
            const cookieValue = `${timestamp}.${consentSignature(timestamp, apiKey)}`;
            res.setHeader(
                'Set-Cookie',
                `${consentCookie}=${cookieValue}; Path=/api/ai/chat; Max-Age=${CONSENT_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`
            );
        }

        const validation = validateChatContents(body);
        if (!validation.valid) {
            return res.status(400).json({ message: 'Nội dung chat không hợp lệ hoặc vượt quá giới hạn cho phép.' });
        }

        const { contents } = validation;
        const latestUserQuestion = contents.at(-1).parts[0].text;

        // Option 3A ($0 guest safety): only verified Supabase users can invoke Gemini within 10 req/hr/user.
        const authHeader = getHeader(req.headers, 'authorization').trim();
        const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
        const token = bearerMatch ? bearerMatch[1].trim() : '';

        if (token && apiKey && supabaseUrl && supabaseAnonKey) {
            const user = await verifySupabaseUser(token, supabaseUrl, supabaseAnonKey);
            if (user && consumeUserGeminiQuota(user.id)) {
                const geminiResult = await tryGeminiModels(apiKey, contents, { fetchImpl, preferredModel });
                if (geminiResult && geminiResult.text) {
                    return res.status(200).json({
                        text: geminiResult.text,
                        reply: geminiResult.text,
                        source: geminiResult.model
                    });
                }
            }
        }

        // Luôn có câu trả lời chuẩn xác từ Smart Knowledge Base của Namcumz ($0, không bao giờ lỗi 502/503)
        const fallbackText = buildLocalNamcumzReply(latestUserQuestion);
        return res.status(200).json({
            text: fallbackText,
            reply: fallbackText,
            source: 'namcumz-smart-kb'
        });
    };
}

const defaultHandler = createHandler();
defaultHandler.createHandler = createHandler;
defaultHandler.buildLocalNamcumzReply = buildLocalNamcumzReply;

module.exports = defaultHandler;
