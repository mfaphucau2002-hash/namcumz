// Public homepage support chat. Conversation stays in memory for this page session.
(function () {
    const endpoint = '/api/ai/chat';
    const messages = [];
    let consentGranted = false;
    let sending = false;

    const chat = document.getElementById('nc-ai-chat');
    const toggle = document.getElementById('nc-ai-chat-toggle');
    const close = document.getElementById('nc-ai-chat-close');
    const gate = document.getElementById('nc-ai-chat-gate');
    const consentButton = document.getElementById('nc-ai-chat-consent');
    const body = document.getElementById('nc-ai-chat-body');
    const form = document.getElementById('nc-ai-chat-form');
    const input = document.getElementById('nc-ai-chat-input');
    const sendButton = document.getElementById('nc-ai-chat-send');
    const messageList = document.getElementById('nc-ai-chat-messages');
    const tooltip = document.getElementById('namcumz-support-tooltip');

    if (!chat || !toggle || !gate || !form || !input || !messageList) return;

    // Add a text-only message bubble to prevent HTML injection from model output or user input.
    function appendMessage(text, role, extraClass) {
        const item = document.createElement('div');
        item.className = `nc-ai-chat-message ${role === 'user' ? 'is-user' : 'is-assistant'}${extraClass ? ` ${extraClass}` : ''}`;
        item.textContent = text;
        messageList.appendChild(item);
        messageList.scrollTop = messageList.scrollHeight;
        return item;
    }

    // Open the panel and keep its age gate until server consent succeeds.
    function openChat() {
        chat.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        if (tooltip) tooltip.style.display = 'none';
        if (!consentGranted) {
            gate.hidden = false;
            body.hidden = true;
        }
    }

    // Close the chat panel and restore focus to the launcher.
    function closeChat() {
        chat.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    }

    // Store a server-signed, short-lived consent cookie after the visitor attests age and data processing.
    async function grantConsent() {
        consentButton.disabled = true;
        consentButton.textContent = 'Đang xác nhận…';
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'consent', adult: true, googleProcessing: true })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message || 'Không thể xác nhận lúc này.');
            consentGranted = true;
            gate.hidden = true;
            body.hidden = false;
            input.focus();
        } catch (error) {
            appendMessage(error.message || 'Không thể kết nối. Vui lòng thử lại.', 'assistant', 'is-error');
        } finally {
            consentButton.disabled = false;
            consentButton.textContent = 'Tôi đủ 18 tuổi và đồng ý tiếp tục';
        }
    }

    // Send one bounded user turn and retain only successful conversation turns in memory.
    async function sendMessage(event) {
        event.preventDefault();
        const text = input.value.trim();
        if (!text || sending || !consentGranted) return;
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
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message || 'Chưa gửi được tin nhắn.');
            pending.textContent = payload.text || 'Trợ lý AI chưa trả lời được.';
            messages.push({ role: 'user', text }, { role: 'model', text: pending.textContent });
        } catch (error) {
            pending.textContent = `${error.message || 'Có lỗi khi gửi tin nhắn.'} Cần hỗ trợ nhanh? Liên hệ Zalo 0763.550.673.`;
            pending.classList.add('is-error');
        } finally {
            messageList.scrollTop = messageList.scrollHeight;
            sendButton.disabled = false;
            sending = false;
            input.focus();
        }
    }

    // Let the existing floating avatar open the AI panel instead of sending visitors straight to Zalo.
    window.toggleNamcumzSupportWindow = openChat;
    toggle.addEventListener('click', openChat);
    close?.addEventListener('click', closeChat);
    consentButton?.addEventListener('click', grantConsent);
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
})();
