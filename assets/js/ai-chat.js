// Public homepage support chat. Conversation stays in memory for this page session.
(function () {
    const endpoint = '/api/ai/chat';
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

    // Add a text-only message bubble to prevent HTML injection from model output or user input.
    function appendMessage(text, role, extraClass) {
        const item = document.createElement('div');
        item.className = `nc-ai-chat-message ${role === 'user' ? 'is-user' : 'is-assistant'}${extraClass ? ` ${extraClass}` : ''}`;
        item.textContent = text;
        messageList.appendChild(item);
        messageList.scrollTop = messageList.scrollHeight;
        return item;
    }

    // Open the panel directly into the chat conversation.
    function openChat() {
        chat.hidden = false;
        if (body) body.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        if (tooltip) tooltip.style.display = 'none';
        input.focus();
    }

    // Close the chat panel and restore focus to the launcher.
    function closeChat() {
        chat.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
    }

    // Send one bounded user turn and retain only successful conversation turns in memory.
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

    // Let the existing floating avatar open the AI panel.
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
})();
