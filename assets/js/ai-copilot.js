// AI is unavailable until server-side credentials and private-data filtering are ready.
// Do not read or remove previously saved browser keys.
(function () {
    function showUnavailable() {
        alert('AI đang được nâng cấp bảo mật. Bạn vẫn có thể xử lý đơn hàng bình thường.');
    }
    window.openAiCopilot = showUnavailable;
    window.toggleAiSettings = showUnavailable;
    window.saveGeminiKey = showUnavailable;
    window.analyzeOrderWithAI = showUnavailable;
})();
