// ==========================================
// AI COPILOT (GEMINI INTEGRATION)
// ==========================================

let currentAiOrder = null;

// Ensure markdown css exists for the AI result
document.head.insertAdjacentHTML('beforeend', 
<style>
.markdown-body h3 { color: #60a5fa; margin-top: 15px; margin-bottom: 8px; font-size: 1.1rem; }
.markdown-body ul { padding-left: 20px; margin-bottom: 15px; }
.markdown-body li { margin-bottom: 5px; }
.markdown-body strong { color: #fff; }
</style>
);

window.toggleAiSettings = function() {
    const block = document.getElementById('aiSettingsBlock');
    if (block.style.display === 'none' || !block.style.display) {
        block.style.display = 'block';
        const key = localStorage.getItem('gemini_api_key');
        if (key) document.getElementById('geminiApiKey').value = key;
    } else {
        block.style.display = 'none';
    }
};

window.saveGeminiKey = function() {
    const val = document.getElementById('geminiApiKey').value.trim();
    if (val) {
        localStorage.setItem('gemini_api_key', val);
        alert('Đã lưu API Key thành công!');
        document.getElementById('aiSettingsBlock').style.display = 'none';
        if (currentAiOrder) window.analyzeOrderWithAI(false);
    } else {
        alert('Vui lòng nhập API Key!');
    }
};

window.openAiCopilot = function(orderId) {
    let order = null;
    if (window.ordersList) {
        order = window.ordersList.find(o => o.id === orderId);
    } else if (window.allOrders) {
        order = window.allOrders.find(o => o.id === orderId);
    }
    
    if (!order) {
        alert('Không tìm thấy thông tin đơn hàng!');
        return;
    }

    currentAiOrder = { id: order.id, code: order.order_code, content: order.content || '', aiPlan: order.ai_plan };
    
    document.getElementById('aiOrderCode').innerText = order.order_code;
    document.getElementById('aiCopilotModal').classList.add('active');
    document.getElementById('aiSettingsBlock').style.display = 'none';
    
    const key = localStorage.getItem('gemini_api_key');
    if (!key && !order.ai_plan) {
        document.getElementById('aiSettingsBlock').style.display = 'block';
        document.getElementById('aiLoading').style.display = 'none';
        document.getElementById('aiResultContent').style.display = 'none';
        return;
    }

    if (order.ai_plan) {
        showAiResult(order.ai_plan);
    } else {
        window.analyzeOrderWithAI(false);
    }
};

window.analyzeOrderWithAI = async function(forceReanalyze = false) {
    if (!currentAiOrder) return;
    
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        window.toggleAiSettings();
        return;
    }

    document.getElementById('aiLoading').style.display = 'block';
    document.getElementById('aiResultContent').style.display = 'none';

    try {
        const prompt = Bạn là một chuyên gia Cày thuê game (Booster) chuyên nghiệp.
Hãy phân tích yêu cầu đơn hàng sau và lập kế hoạch làm việc chi tiết.
Yêu cầu của khách:
"""
 + currentAiOrder.content + 
"""

Hãy trình bày bằng Markdown (ngắn gọn, dễ hiểu):
1. Tóm tắt nhanh mục tiêu (1 câu).
2. Checklist công việc cần làm (chia theo giai đoạn hoặc ngày nếu có thể).
3. Đề xuất thời gian hoàn thành (Timeline/Deadline ước tính bao nhiêu giờ/ngày).
4. Cảnh báo rủi ro (yêu cầu cấp thế giới, tốn nhựa, yêu cầu đăng nhập mã bảo mật, v.v.) nếu có.
Không cần chào hỏi, đi thẳng vào nội dung phân tích.;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const aiText = data.candidates[0].content.parts[0].text;
        showAiResult(aiText);

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { error } = await supabaseClient
                .from('orders')
                .update({ ai_plan: aiText })
                .eq('id', currentAiOrder.id);
                
            if (error) {
                console.warn("Không thể lưu ai_plan vào DB:", error);
            } else {
                if (window.ordersList) {
                    const orderInList = window.ordersList.find(o => o.id === currentAiOrder.id);
                    if (orderInList) orderInList.ai_plan = aiText;
                }
                if (window.allOrders) {
                    const orderInAll = window.allOrders.find(o => o.id === currentAiOrder.id);
                    if (orderInAll) orderInAll.ai_plan = aiText;
                }
            }
        }

    } catch (err) {
        console.error('Lỗi gọi AI:', err);
        document.getElementById('aiLoading').style.display = 'none';
        document.getElementById('aiResultContent').style.display = 'block';
        document.getElementById('aiResultContent').innerHTML = <div style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi khi gọi API:  + err.message + </div>;
    }
};

function showAiResult(markdownText) {
    document.getElementById('aiLoading').style.display = 'none';
    const contentDiv = document.getElementById('aiResultContent');
    contentDiv.style.display = 'block';
    
    if (typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(markdownText);
        contentDiv.classList.add('markdown-body');
    } else {
        contentDiv.innerText = markdownText;
    }
}
