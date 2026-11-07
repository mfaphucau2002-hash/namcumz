-- =====================================================================
-- NAMCUMZ PRODUCTION MIGRATION: 011_GENSHIN_BATTLEPASS
-- Bổ sung 2 gói Battle Pass thật của Genshin Impact:
--   1. Nhật Ký Hành Trình Trân Châu (190.000đ)
--   2. Bài Ca Trân Châu (380.000đ)
-- Đồng thời đồng bộ bảng giá chính thức Genshin Impact.
-- =====================================================================

BEGIN;

INSERT INTO public.packages (id, game, name, price, active, type) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Genshin Impact', 'Không Nguyệt Chúc Phúc (Thẻ Tháng)', 85000, true, 'login'),
  ('10000000-0000-0000-0000-000000000002', 'Genshin Impact', '60 Đá Sáng Thế', 20000, true, 'login'),
  ('10000000-0000-0000-0000-000000000003', 'Genshin Impact', '300 + 30 Đá Sáng Thế', 90000, true, 'login'),
  ('10000000-0000-0000-0000-000000000004', 'Genshin Impact', '980 + 110 Đá Sáng Thế', 270000, true, 'login'),
  ('10000000-0000-0000-0000-000000000005', 'Genshin Impact', '1980 + 260 Đá Sáng Thế', 570000, true, 'login'),
  ('10000000-0000-0000-0000-000000000006', 'Genshin Impact', '3280 + 600 Đá Sáng Thế', 950000, true, 'login'),
  ('10000000-0000-0000-0000-000000000007', 'Genshin Impact', '6480 + 1600 Đá Sáng Thế', 1850000, true, 'login'),
  ('10000000-0000-0000-0000-000000000008', 'Genshin Impact', 'FULL PACK GENSHIN IMPACT', 3800000, true, 'login'),
  ('10000000-0000-0000-0000-000000000009', 'Genshin Impact', 'Nhật Ký Hành Trình Trân Châu', 190000, true, 'login'),
  ('10000000-0000-0000-0000-000000000010', 'Genshin Impact', 'Bài Ca Trân Châu', 380000, true, 'login')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  active = EXCLUDED.active,
  type = EXCLUDED.type,
  updated_at = now();

INSERT INTO namcumz_private.migrations(version) VALUES ('production_011_genshin_battlepass')
ON CONFLICT (version) DO UPDATE SET applied_at = now();

COMMIT;
