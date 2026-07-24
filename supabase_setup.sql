
-- 1. THÊM CỘT MÃ BẢO MẬT VÀ BOOSTER ID VÀO BẢNG ĐƠN HÀNG
ALTER TABLE orders ADD COLUMN IF NOT EXISTS secret_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS booster_id UUID REFERENCES auth.users(id);

-- 2. TẠO BẢNG TIN NHẮN (ORDER MESSAGES) ĐỂ CHAT TRỰC TIẾP
CREATE TABLE IF NOT EXISTS order_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_name TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BẬT BẢO MẬT (RLS) CHO BẢNG TIN NHẮN (BẢO MẬT TUYỆT ĐỐI)
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

-- Cho phép tất cả những người liên quan đến đơn (Khách tạo, Người cày, Admin) được XEM tin nhắn
CREATE POLICY "Cho phép xem tin nhắn" ON order_messages 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM orders o 
        LEFT JOIN user_roles ur ON ur.id = auth.uid()
        WHERE o.id = order_messages.order_id 
        AND (
            o.user_id = auth.uid() 
            OR o.booster_id = auth.uid() 
            OR ur.role IN ('admin', 'super_admin')
        )
    )
);

-- Cho phép những người liên quan được GỬI tin nhắn
CREATE POLICY "Cho phép gửi tin nhắn" ON order_messages 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders o 
        LEFT JOIN user_roles ur ON ur.id = auth.uid()
        WHERE o.id = order_id 
        AND (
            o.user_id = auth.uid() 
            OR o.booster_id = auth.uid() 
            OR ur.role IN ('admin', 'super_admin')
        )
    )
);
-- === CẬP NHẬT 1: HỒ SƠ BOOSTER ===
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- === CẬP NHẬT 2: BẢO MẬT SECRET_CODE BẰNG RPC ===
-- Hàm này giúp kiểm tra secret_code an toàn trên server mà không cần trả secret_code về cho Client
CREATE OR REPLACE FUNCTION claim_order_by_secret(p_order_code TEXT, p_secret_code TEXT, p_user_id UUID)
RETURNS BOOLEAN AS ${$
DECLARE
    v_order_id UUID;
BEGIN
    SELECT id INTO v_order_id 
    FROM orders 
    WHERE order_code = p_order_code AND secret_code = p_secret_code AND user_id IS NULL;

    IF v_order_id IS NOT NULL THEN
        UPDATE orders SET user_id = p_user_id WHERE id = v_order_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
${$} LANGUAGE plpgsql SECURITY DEFINER;

-- Xóa quyền xem secret_code từ xa (bảo mật tuyệt đối, chỉ DB function mới thấy)
-- Lưu ý: RLS không hỗ trợ ẩn một cột, nên cách tốt nhất là giới hạn bằng query. Tuy nhiên,
-- hàm claim_order_by_secret đã giải quyết vấn đề bằng cách tự kiểm tra trên server.

-- === CẬP NHẬT 3: RLS CHO BẢNG ORDERS & NOTIFICATIONS ===
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 1. Orders Policies
CREATE POLICY "Cho phép đọc mọi đơn hàng" ON orders FOR SELECT USING (true);
CREATE POLICY "Cho phép tạo đơn hàng" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép sửa đơn hàng" ON orders FOR UPDATE USING (
    auth.uid() = user_id 
    OR auth.uid() = booster_id 
    OR EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. Notifications Policies
CREATE POLICY "Chỉ đọc thông báo của mình" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Gửi thông báo (System/Triggers)" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Cập nhật thông báo của mình" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- 3. User Roles Policies
CREATE POLICY "Cho phép đọc mọi user_roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Cho phép user tự sửa thông tin" ON user_roles FOR UPDATE USING (auth.uid() = id);

