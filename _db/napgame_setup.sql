-- 🎮 BẢNG QUẢN LÝ ĐƠN NẠP GAME (NAMCUMZ)
-- Khởi tạo bảng napgame_orders và cấu hình bảo mật RLS

CREATE TABLE IF NOT EXISTS napgame_orders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id),     -- Null nếu khách không đăng nhập
  customer_name   TEXT,                               -- Tên khách hàng (nhập trên form)
  customer_phone  TEXT NOT NULL,                      -- SĐT / Zalo
  game_id         TEXT NOT NULL,                      -- 'genshin', 'hsr', 'wuwa'...
  game_name       TEXT NOT NULL,                      -- Tên game hiển thị
  package_id      TEXT NOT NULL,                      -- ID gói (ví dụ 'genshin-60')
  package_name    TEXT NOT NULL,                      -- Tên gói ('60 Đá Sáng Thế')
  price           BIGINT NOT NULL,                    -- Giá VNĐ (lưu kiểu số)
  uid_ingame      TEXT NOT NULL,                      -- UID trong game
  server          TEXT DEFAULT 'Asia',                -- Server game
  note            TEXT,                               -- Ghi chú của khách
  status          TEXT DEFAULT 'pending',             -- pending | processing | done | failed | refunded
  payment_method  TEXT DEFAULT 'manual',              -- Phương thức thanh toán
  admin_note      TEXT,                               -- Ghi chú nội bộ của admin
  is_public       BOOLEAN DEFAULT true                -- Có hiển thị trên Live Ticker không
);

-- ==========================================
-- INDEXES CHO TỐI ƯU HIỆU SUẤT TRUY VẤN
-- ==========================================

-- Index sắp xếp theo thời gian (dùng cho Ticker và Dashboard)
CREATE INDEX IF NOT EXISTS idx_napgame_orders_created ON napgame_orders(created_at DESC);

-- Index lọc theo trạng thái (dùng cho Admin Dashboard)
CREATE INDEX IF NOT EXISTS idx_napgame_orders_status ON napgame_orders(status);

-- ==========================================
-- BẢO MẬT: ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE napgame_orders ENABLE ROW LEVEL SECURITY;

-- 1. Cho phép bất kỳ ai (kể cả khách vãng lai) tạo đơn nạp game mới
CREATE POLICY "Allow public insert to napgame_orders" 
ON napgame_orders FOR INSERT 
WITH CHECK (true);

-- 2. Cho phép mọi người đọc các đơn public (để hiển thị lên Ticker)
CREATE POLICY "Allow public read for ticker" 
ON napgame_orders FOR SELECT 
USING (is_public = true AND status = 'done');

-- 3. Cho phép Admin đọc toàn bộ đơn hàng
CREATE POLICY "Allow admin read all" 
ON napgame_orders FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- 4. Cho phép User đọc các đơn họ đã đặt (nếu có đăng nhập)
CREATE POLICY "Allow user read own orders" 
ON napgame_orders FOR SELECT 
USING (user_id = auth.uid());

-- 5. Cho phép Admin cập nhật (sửa trạng thái) đơn hàng
CREATE POLICY "Allow admin update" 
ON napgame_orders FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- BẢNG PHỤ TRỢ (Phase sau mới dùng)
-- CREATE TABLE IF NOT EXISTS napgame_packages ( ... );
