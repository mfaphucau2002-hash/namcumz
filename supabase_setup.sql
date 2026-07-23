
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
