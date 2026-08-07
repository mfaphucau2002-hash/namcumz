-- ==============================================================================
-- BẢN VÁ LỖI (HOTFIX) CHO NAMCUMZ
-- CHẠY SCRIPT NÀY TRONG SUPABASE SQL EDITOR ĐỂ VÁ LỖI BẢO MẬT VÀ LỖI ĐĂNG KÝ
-- ==============================================================================

-- 1. TẠO DATABASE TRIGGER ĐỂ TỰ ĐỘNG TẠO USER_ROLES KHI ĐĂNG KÝ
-- (Giải quyết triệt để lỗi đăng nhập Google OAuth bị mất quyền và đăng ký Email bị chặn bởi RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (id, username, role, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Xóa trigger cũ (nếu có) để tránh lỗi trùng lặp
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Gắn trigger vào bảng auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================

-- 2. BỊT LỖ HỔNG BẢO MẬT (RLS) TRÊN BẢNG ORDERS (Ngăn chặn lộ secret_code và thông tin)
-- Xóa policy cũ bị lỗi rò rỉ dữ liệu
DROP POLICY IF EXISTS "Cho phép đọc mọi đơn hàng" ON public.orders;

-- Tạo policy chuẩn phân quyền cho lệnh SELECT
-- (1) Khách tự xem đơn của mình
-- (2) Booster xem đơn được giao cho mình
-- (3) Tất cả mọi người đều thấy đơn đang 'Chờ xử lý' để nhận cày
-- (4) Admin xem tất cả
CREATE POLICY "Cho phép đọc đơn hàng an toàn" ON public.orders
FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = booster_id
    OR (status = 'cho_xu_ly' AND booster_id IS NULL)
    OR EXISTS (SELECT 1 FROM user_roles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- ==============================================================================

-- 3. BỔ SUNG QUYỀN CƠ BẢN BỊ THIẾU
-- Chặn Guest không được tạo đơn rác
DROP POLICY IF EXISTS "Cho phép tạo đơn hàng" ON public.orders;
CREATE POLICY "Chỉ người dùng đăng nhập được tạo đơn" ON public.orders
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
);

-- Khắc phục policy cũ của user_roles (Chỉ phòng ngừa, vì Insert giờ đã qua Trigger)
DROP POLICY IF EXISTS "Cho phép insert user_roles" ON public.user_roles;
CREATE POLICY "Cho phép insert user_roles" ON public.user_roles
FOR INSERT WITH CHECK ( auth.uid() = id );

-- ==============================================================================
-- KẾT THÚC BẢN VÁ - BẠN HÃY CHẠY TOÀN BỘ ĐOẠN CODE NÀY TRONG SUPABASE
