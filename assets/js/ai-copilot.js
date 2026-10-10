// Send only an order ID; the server authenticates the admin and fetches safe order fields.
(function () {
    let activeOrderId = null;
    let busy = false;

    function show(id, visible) {
        const element = document.getElementById(id);
        if (element) element.style.display = visible ? 'block' : 'none';
    }

    function setResult(message) {
        const result = document.getElementById('aiResultContent');
        if (!result) return;
        result.textContent = message;
        result.style.whiteSpace = 'pre-wrap';
        show('aiResultContent', true);
    }

    // Open the copilot modal and analyze the selected order.
    window.openAiCopilot = async function (orderId) {
        activeOrderId = String(orderId || '');
        const modal = document.getElementById('aiCopilotModal');
        if (modal) modal.classList.add('active');
        const code = document.getElementById('aiOrderCode');
        if (code) code.textContent = activeOrderId;
        await window.analyzeOrderWithAI();
    };

    // Explain that API keys are managed by the server, never entered in the browser.
    window.toggleAiSettings = function () {
        alert('Gemini được cấu hình bảo mật ở môi trường server, không nhập API key trên website.');
    };
    window.saveGeminiKey = window.toggleAiSettings;

    // Call the authenticated server endpoint and display its plain-text response safely.
    window.analyzeOrderWithAI = async function () {
        if (busy || !activeOrderId) return;
        const client = window.supabaseClient;
        if (!client?.auth?.getSession) return setResult('Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.');
        const { data, error } = await client.auth.getSession();
        const token = data?.session?.access_token;
        if (error || !token) return setResult('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');

        busy = true;
        const button = document.getElementById('btnReanalyze');
        if (button) button.disabled = true;
        show('aiResultContent', false);
        show('aiLoading', true);
        try {
            const response = await fetch('/api/ai/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ orderId: activeOrderId })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.message || 'Không thể phân tích đơn hàng.');
            setResult(payload.text || 'AI chưa trả về nội dung.');
        } catch (error) {
            setResult(error.message || 'Có lỗi khi kết nối AI. Vui lòng thử lại.');
        } finally {
            show('aiLoading', false);
            if (button) button.disabled = false;
            busy = false;
        }
    };
})();
