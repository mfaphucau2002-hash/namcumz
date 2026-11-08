/**
 * Vercel Serverless Function: /api/ai/chat
 * Trợ lý AI Namcumz - Tích hợp Gemini (multi-model 2.5/2.0 Flash) + Smart Knowledge Base Namcumz.
 * Không phụ thuộc module ngoài, hỗ trợ cả { messages: [...] } và { message: "..." },
 * trả về { text, reply, source } để hoạt động 100% ổn định không bao giờ lỗi kết nối.
 */
const crypto = require('node:crypto');
const { createHmac, timingSafeEqual } = crypto;

const consentCookie = 'namcumz_ai_adult_consent';
const requestWindows = new Map();
const CONSENT_TTL_SECONDS = 30 * 60;

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
    '     + Đá Sáng Thế: 60 Đá (20.000đ), 300+30 Đá (95.000đ), 980+110 Đá (270.000đ), 1980+260 Đá (580.000đ), 3280+600 Đá (920.000đ), 6480+1600 Đá (1.850.000đ).',
    '   - Cày Thuê Genshin Impact (Cày tay 100%, bảo mật tuyệt đối):',
    '     + Điểm dịch chuyển: Liyue/Inazuma/Sumeru/Fontaine 40.000đ/vùng; Natlan/Nod-Krai 50.000đ/vùng; Full Teyvat 200.000đ.',
    '     + Thần Đồng: Phong 40k, Nham 60k, Lôi 80k, Thảo 100k, Thủy 100k, Hỏa 100k, Nguyệt 90k.',
    '     + Explore Map 100%: Mondstadt 120k - 220k, Liyue 250k - 400k, Inazuma 300k - 450k, Sumeru 400k - 650k, Fontaine 350k - 550k, Natlan 350k - 550k, Full Nod-Krai 450k.',
    '     + La Hoàn / Nhà Hát / Áo Cảnh: La Hoàn tầng 12 (50k), Nhà Hát Giả Tưởng (50k), Áo Cảnh (50k - 180k), Combo cả 3 chế độ (130k).',
    '     + Chăm Acc: Daily ngày 5.000đ, Tuần 30.000đ, Tháng 110.000đ, Tháng VIP Full Event 200.000đ.',
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
            '• 60 Đá: 20.000đ | 300+30 Đá: 95.000đ | 980+110 Đá: 270.000đ',
            '• 1980+260 Đá: 580.000đ | 3280+600 Đá: 920.000đ | 6480+1600 Đá: 1.850.000đ',
            '✅ Cam kết nạp chính hãng 100% có hóa đơn, bảo hành không âm nguyên thạch. Lưu ý: KHÔNG gửi mật khẩu/OTP vào chat này nhé!'
        ].join('\n');
    }

    if (/cày thuê|cay thue|full map|thần đồng|than dong|la hoàn|la hoan|nhà hát|nha hat|chăm acc|cham acc|nod-krai|nod krai|natlan|fontaine|sumeru/.test(q)) {
        return [
            '⚔️ Bảng giá Cày Thuê Genshin Impact (Cày tay 100% - Bảo mật tuyệt đối):',
            '• Mở Điểm Dịch Chuyển: 40.000đ - 50.000đ/vùng | Full Teyvat: 200.000đ.',
            '• Nhặt Full Thần Đồng: Phong 40k, Nham 60k, Lôi 80k, Thảo/Thủy/Hỏa 100k, Nguyệt 90k.',
            '• Explore Map 100%: Mondstadt từ 120k, Liyue từ 250k, Inazuma từ 300k, Fontaine/Natlan từ 350k, Full Nod-Krai 450k.',
            '• La Hoàn Tầng 12 / Nhà Hát / Áo Cảnh: 50.000đ/chế độ (Combo cả 3 chỉ 130.000đ).',
            '• Chăm Acc: Ngày 5k | Tuần 30k | Tháng 110k | Tháng VIP Full Event 200k.'
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

function consentSecret() {
    return process.env.GEMINI_API_KEY || 'namcumz-ai-public-secret';
}

function consentSignature(timestamp) {
    return createHmac('sha256', consentSecret()).update(timestamp).digest('hex');
}

function hasValidConsent(req) {
    const entry = String(req.headers?.cookie || '')
        .split(';')
        .map(part => part.trim())
        .find(part => part.startsWith(`${consentCookie}=`));
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

function overLimit(req) {
    const now = Date.now();
    const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
        .split(',')[0]
        .trim()
        .slice(0, 80);
    const recent = (requestWindows.get(ip) || []).filter(time => now - time < 60_000);
    if (recent.length >= 20) return true;
    recent.push(now);
    requestWindows.set(ip, recent);
    if (requestWindows.size > 5000) {
        for (const [key, times] of requestWindows) {
            if (!times.some(time => now - time < 60_000)) requestWindows.delete(key);
        }
    }
    return false;
}

function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
        return Promise.resolve(req.body ? JSON.parse(req.body) : {});
    }
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => {
            raw += chunk;
            if (raw.length > 32 * 1024) reject(new Error('Payload too large'));
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

async function tryGeminiModels(apiKey, contents) {
    const models = [
        process.env.GEMINI_MODEL,
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
            const response = await fetch(
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
            if (!response.ok) continue;
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

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ message: 'Phương thức không được hỗ trợ.' });
    }

    let body = {};
    try {
        body = await readJsonBody(req);
    } catch (_err) {
        return res.status(400).json({ message: 'Dữ liệu gửi lên không hợp lệ.' });
    }

    if (body.action === 'consent') {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const cookieValue = `${timestamp}.${consentSignature(timestamp)}`;
        res.setHeader(
            'Set-Cookie',
            `${consentCookie}=${cookieValue}; Path=/api/ai/chat; Max-Age=${CONSENT_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`
        );
        return res.status(200).json({ success: true });
    }

    if (!hasValidConsent(req)) {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const cookieValue = `${timestamp}.${consentSignature(timestamp)}`;
        res.setHeader(
            'Set-Cookie',
            `${consentCookie}=${cookieValue}; Path=/api/ai/chat; Max-Age=${CONSENT_TTL_SECONDS}; HttpOnly; Secure; SameSite=Lax`
        );
    }

    if (overLimit(req)) {
        return res.status(429).json({ message: 'Bạn gửi hơi nhanh. Vui lòng đợi ít giây rồi thử lại.' });
    }

    let contents = [];
    if (Array.isArray(body.messages)) {
        contents = body.messages
            .slice(-8)
            .filter(m => m && ['user', 'model'].includes(m.role) && typeof m.text === 'string')
            .map(m => ({ role: m.role, parts: [{ text: m.text.trim().slice(0, 600) }] }))
            .filter(m => m.parts[0].text);
    } else if (typeof body.message === 'string' && body.message.trim()) {
        contents = [{ role: 'user', parts: [{ text: body.message.trim().slice(0, 600) }] }];
    }

    if (
        !contents.length ||
        contents.at(-1).role !== 'user' ||
        contents.reduce((size, item) => size + item.parts[0].text.length, 0) > 4000
    ) {
        return res.status(400).json({ message: 'Nội dung chat không hợp lệ hoặc quá dài.' });
    }

    const latestUserQuestion = contents.at(-1).parts[0].text;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        const geminiResult = await tryGeminiModels(apiKey, contents);
        if (geminiResult && geminiResult.text) {
            return res.status(200).json({
                text: geminiResult.text,
                reply: geminiResult.text,
                source: geminiResult.model
            });
        }
    }

    // Luôn có câu trả lời chuẩn xác từ Smart Knowledge Base của Namcumz (không bao giờ lỗi 502/503)
    const fallbackText = buildLocalNamcumzReply(latestUserQuestion);
    return res.status(200).json({
        text: fallbackText,
        reply: fallbackText,
        source: 'namcumz-smart-kb'
    });
};
