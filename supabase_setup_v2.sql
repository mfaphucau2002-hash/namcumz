-- === CẬP NHẬT 1: HỒ SƠ BOOSTER ===
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- === CẬP NHẬT 2: BẢO MẬT SECRET_CODE BẰNG RPC ===
CREATE OR REPLACE FUNCTION claim_order_by_secret(p_secret_code TEXT, p_user_id UUID)
RETURNS BOOLEAN AS ${$
DECLARE
    v_order_id UUID;
BEGIN
    SELECT id INTO v_order_id 
    FROM orders 
    WHERE secret_code = p_secret_code AND user_id IS NULL;

    IF v_order_id IS NOT NULL THEN
        UPDATE orders SET user_id = p_user_id, secret_code = NULL WHERE id = v_order_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
${$} LANGUAGE plpgsql SECURITY DEFINER;

-- === CẬP NHẬT 3: RLS CHO BẢNG ORDERS & NOTIFICATIONS ===
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cho phép đọc mọi đơn hàng" ON orders FOR SELECT USING (true);
CREATE POLICY "Cho phép tạo đơn hàng" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép sửa đơn hàng" ON orders FOR UPDATE USING (
    auth.uid() = user_id 
    OR auth.uid() = booster_id 
    OR EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Chỉ đọc thông báo của mình" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Gửi thông báo (System/Triggers)" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Cập nhật thông báo của mình" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Cho phép đọc mọi user_roles" ON user_roles FOR SELECT USING (true);
CREATE POLICY "Cho phép user tự sửa thông tin" ON user_roles FOR UPDATE USING (auth.uid() = id);
