const { createClient } = require('@supabase/supabase-js');

// Authenticate each request and use Supabase RLS to limit the order data read.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Phương thức không được hỗ trợ.' });
  }

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : '';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NAMCUMZ_STAGING_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NAMCUMZ_STAGING_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!token || !orderId || orderId.length > 80) {
    return res.status(400).json({ message: 'Yêu cầu không hợp lệ.' });
  }
  if (!supabaseUrl || !anonKey || !geminiKey) {
    return res.status(503).json({ message: 'AI chưa được cấu hình đầy đủ ở môi trường server.' });
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ message: 'Vui lòng đăng nhập lại.' });

    const { data: profile, error: profileError } = await supabase
      .from('user_roles').select('role, active').eq('id', authData.user.id).maybeSingle();
    if (profileError || !profile || profile.active === false || !['admin', 'super_admin'].includes(profile.role)) {
      return res.status(403).json({ message: 'Chỉ quản trị viên mới được dùng AI Copilot.' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_code, content, game_server, status, progress')
      .eq('id', orderId).maybeSingle();
    if (orderError || !order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: 'Bạn là trợ lý nội bộ cho nhân viên cửa hàng game Việt Nam. Chỉ phân tích dữ liệu đơn được cung cấp; nêu rõ điểm chưa đủ dữ liệu. Không bịa trạng thái, chính sách, cam kết bảo mật, bồi thường hoặc kết quả game. Đề xuất bước xử lý thực tế, ngắn gọn bằng tiếng Việt.' }] },
        contents: [{ role: 'user', parts: [{ text: `Phân tích đơn sau và lập kế hoạch xử lý ngắn gọn:\n${JSON.stringify(order)}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 700 }
      })
    });
    const result = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) {
      const status = aiResponse.status === 429 ? 503 : 502;
      return res.status(status).json({ message: aiResponse.status === 429 ? 'AI đang quá tải hoặc hết hạn mức. Thử lại sau.' : 'Dịch vụ AI chưa phản hồi thành công.' });
    }
    const text = (result.candidates || []).flatMap(c => c.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!text) return res.status(502).json({ message: 'AI không trả về nội dung phân tích.' });
    return res.status(200).json({ text });
  } catch (error) {
    console.error('AI Copilot request failed:', error?.message || 'unknown error');
    return res.status(500).json({ message: 'Không thể phân tích đơn lúc này.' });
  }
};
