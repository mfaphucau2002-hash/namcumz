// Public homepage support chat (#nc-ai-chat).
// Kết nối /api/ai/chat kèm hệ thống Smart Knowledge Base Namcumz dự phòng tức thì
// để đảm bảo hoạt động 100% trên cả Vercel Production và Local Preview.
(function () {
    'use strict';

    const endpoint = '/api/ai/chat';
    const ZALO_PHONE = '0763.550.673';
    const messages = [];
    let sending = false;

    const chat = document.getElementById('nc-ai-chat');
    const toggle = document.getElementById('nc-ai-chat-toggle');
    const close = document.getElementById('nc-ai-chat-close');
    const body = document.getElementById('nc-ai-chat-body');
    const form = document.getElementById('nc-ai-chat-form');
    const input = document.getElementById('nc-ai-chat-input');
    const sendButton = document.getElementById('nc-ai-chat-send');
    const messageList = document.getElementById('nc-ai-chat-messages');
    const tooltip = document.getElementById('namcumz-support-tooltip');

    if (!chat || !toggle || !form || !input || !messageList) return;

    function buildSmartLocalReply(rawMessage) {
        const q = String(rawMessage || '').trim().toLowerCase();

        if (/nạp tiền|nap tien|vào tk|vao tk|số dư|so du|chuyển khoản|chuyen khoan|vietqr|qr|bank|ngân hàng/.test(q)) {
            return [
                '💳 Hướng dẫn nạp tiền vào tài khoản Namcumz (Tự động 1 - 3 phút):',
                '1️⃣ Đăng nhập tài khoản trên web Namcumz (góc phải trên màn hình).',
                '2️⃣ Bấm nút "+ Nạp Tiền" trên thanh menu hoặc vào Hồ sơ cá nhân -> Nạp tiền.',
                '3️⃣ Nhập số tiền cần nạp và quét mã QR Ngân hàng (VietQR) với đúng Nội dung chuyển khoản hiển thị.',
                '4️⃣ Hệ thống tự động cộng số dư sau 1 - 3 phút. Ngoài ra bạn có thể quét QR thanh toán trực tiếp ngay lúc Đặt đơn!',
                '📞 Cần kiểm tra giao dịch nhanh, nhắn Zalo CSKH: ' + ZALO_PHONE + '.'
            ].join('\n');
        }

        if (/thẻ tháng|the thang|không nguyệt|khong nguyet|welkin|nhật ký|nhat ky|trân châu|tran chau|battle pass|bp|bài ca/.test(q)) {
            return [
                '🌙 Bảng giá Thẻ Tháng & Nhật Ký Hành Trình Genshin Impact (Nạp Login chính hãng):',
                '• Không Nguyệt Chúc Phúc (Thẻ tháng): 85.000đ (Khuyến mãi -29%).',
                '• Nhật Ký Hành Trình Trân Châu (BP thường): 190.000đ.',
                '• Bài Ca Trân Châu (BP nâng cấp +20 cấp + danh thiếp): 380.000đ.',
                '👉 Bạn bấm vào mục "Genshin Impact (Login)" trên trang chủ để đặt đơn nhé (xử lý 5 - 15 phút)!'
            ].join('\n');
        }

        if (/đá sáng thế|da sang the|nguyên thạch|nguyen thach|nạp genshin|nap genshin|gói nạp|goi nap|bảng giá nạp|bang gia nap/.test(q)) {
            return [
                '💎 Bảng giá Nạp Genshin Impact (Login) chính hãng tại Namcumz:',
                '• Không Nguyệt Chúc Phúc: 85.000đ | BP Trân Châu: 190.000đ | Bài Ca Trân Châu: 380.000đ',
                '• 60 Đá: 20.000đ | 300+30 Đá: 95.000đ | 980+110 Đá: 270.000đ',
                '• 1980+260 Đá: 580.000đ | 3280+600 Đá: 920.000đ | 6480+1600 Đá: 1.850.000đ',
                '✅ Nạp chính hãng 100% có hóa đơn, bảo hành không âm nguyên thạch.'
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
                '📦 Hướng dẫn kiểm tra tiến độ đơn hàng tại Namcumz:',
                '• Thời gian hoàn thành đơn Nạp Game: 5 - 15 phút.',
                '• Xem trạng thái đơn: Bấm vào tên tài khoản (góc phải trên) -> chọn "Hồ sơ cá nhân" -> tab "Đơn Nạp Game" hoặc "Đơn Cày Thuê".',
                '• Cần hỗ trợ đơn gấp hoặc cấp OTP đăng nhập: Nhắn Zalo CSKH ' + ZALO_PHONE + ' kèm Mã đơn hàng nhé!'
            ].join('\n');
        }

        if (/star rail|hsr|zenless|zzz|wuthering|wuwa|thẻ game|the game|zing|garena/.test(q)) {
            return [
                '🔔 Thông báo trạng thái dịch vụ:',
                '• Hiện tại Namcumz đang mở hoạt động 100% cho 2 dịch vụ trọng điểm: Nạp Genshin Impact (Login) và Cày Thuê Genshin Impact.',
                '• Các mục Honkai: Star Rail, Zenless Zone Zero, Wuthering Waves và Mua Thẻ Game đang tạm ngưng bảo trì cổng thanh toán.',
                '📞 Cần hỗ trợ thêm bạn nhắn Zalo CSKH: ' + ZALO_PHONE + ' nhé!'
            ].join('\n');
        }

        return [
            '✨ Trợ lý AI Namcumz xin hướng dẫn nhanh cho bạn:',
            '• 💳 Nạp tiền vào TK web: Đăng nhập -> bấm nút "+ Nạp Tiền" trên thanh menu -> Quét mã QR ngân hàng tự động (1 - 3 phút).',
            '• 💎 Nạp Genshin (Login): Thẻ tháng 85.000đ, BP Trân Châu 190.000đ, Bài Ca Trân Châu 380.000đ, Đá Sáng Thế từ 20.000đ.',
            '• ⚔️ Cày Thuê Genshin: Full Map, Thần Đồng, Điểm Dịch Chuyển, La Hoàn & Chăm Acc chỉ từ 5.000đ.',
            '📞 Hỗ trợ trực tiếp 07:00 - 23:00 qua Zalo CSKH: ' + ZALO_PHONE + '.'
        ].join('\n');
    }

    // Gắn thanh gợi ý câu hỏi nhanh (Quick Prompt Chips) ngay dưới khung tin nhắn
    if (body && !document.getElementById('nc-ai-quick-prompts')) {
        const chipBar = document.createElement('div');
        chipBar.id = 'nc-ai-quick-prompts';
        chipBar.className = 'nc-ai-quick-prompts';
        chipBar.setAttribute('aria-label', 'Gợi ý câu hỏi nhanh');
        chipBar.innerHTML = [
            '<button type="button" class="nc-ai-chip" data-prompt="cách nạp tiền vào tk">💳 Cách nạp tiền vào TK</button>',
            '<button type="button" class="nc-ai-chip" data-prompt="Bảng giá nạp Genshin Impact">💎 Giá Nạp Genshin</button>',
            '<button type="button" class="nc-ai-chip" data-prompt="Bảng giá cày thuê Genshin Impact">⚔️ Giá Cày Thuê</button>',
            '<button type="button" class="nc-ai-chip" data-prompt="Cách kiểm tra tiến độ đơn hàng">📦 Kiểm tra đơn</button>'
        ].join('');

        const securityTip = body.querySelector('.nc-ai-chat-security-tip');
        if (securityTip) {
            body.insertBefore(chipBar, securityTip);
        } else {
            body.insertBefore(chipBar, form);
        }

        chipBar.querySelectorAll('.nc-ai-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const promptText = btn.getAttribute('data-prompt');
                if (promptText && !sending) {
                    input.value = promptText;
                    form.requestSubmit();
                }
            });
        });
    }

    function appendMessage(text, role, extraClass) {
        const item = document.createElement('div');
        item.className = `nc-ai-chat-message ${role === 'user' ? 'is-user' : 'is-assistant'}${extraClass ? ` ${extraClass}` : ''}`;
        item.style.whiteSpace = 'pre-line';
        item.textContent = text;
        messageList.appendChild(item);
        messageList.scrollTop = messageList.scrollHeight;
        return item;
    }

    function openChat() {
        chat.hidden = false;
        if (body) body.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        if (tooltip) tooltip.style.display = 'none';
        input.focus();
    }

    function closeChat() {
        chat.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    }

    async function sendMessage(event) {
        event.preventDefault();
        const text = input.value.trim();
        if (!text || sending) return;
        sending = true;
        input.value = '';
        input.style.height = '';
        appendMessage(text, 'user');
        const pending = appendMessage('Đang soạn câu trả lời…', 'assistant');
        sendButton.disabled = true;
        try {
            const history = [...messages.slice(-5), { role: 'user', text }];
            if (history[0]?.role === 'model') history.shift();
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history })
            });
            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
                const payload = await response.json().catch(() => ({}));
                const replyText = payload.text || payload.reply;
                if (replyText) {
                    pending.textContent = replyText;
                    messages.push({ role: 'user', text }, { role: 'model', text: replyText });
                    return;
                }
            }
            // Fallback thông minh ngay tại trình duyệt nếu local preview hoặc mạng gián đoạn
            const localReply = buildSmartLocalReply(text);
            pending.textContent = localReply;
            messages.push({ role: 'user', text }, { role: 'model', text: localReply });
        } catch (_error) {
            const localReply = buildSmartLocalReply(text);
            pending.textContent = localReply;
            messages.push({ role: 'user', text }, { role: 'model', text: localReply });
        } finally {
            messageList.scrollTop = messageList.scrollHeight;
            sendButton.disabled = false;
            sending = false;
            input.focus();
        }
    }

    window.toggleNamcumzSupportWindow = openChat;
    toggle.addEventListener('click', openChat);
    close?.addEventListener('click', closeChat);
    form.addEventListener('submit', sendMessage);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !chat.hidden) closeChat();
    });

    if (new URLSearchParams(window.location.search).get('demoAi') === '1') {
        document.getElementById('lpIntroSkip')?.click();
        document.getElementById('lp-intro-screen')?.remove();
        document.documentElement.classList.remove('lp-intro-active');
        document.documentElement.classList.add('lp-intro-done');
        openChat();
        input.value = 'cách nạp tiền vào tk';
        form.requestSubmit();
    }
})();
