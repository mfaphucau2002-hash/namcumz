-- =====================================================================
-- NAMCUMZ PRODUCTION MIGRATION: 008_GENSHIN_BATTLEPASS
-- Seed 2 gói Battle Pass (Nhật Ký Hành Trình) cho Genshin Impact
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

INSERT INTO public.packages (id, game, name, price, active, type) VALUES
  ('10000000-0000-0000-0000-000000000009', 'Genshin Impact', 'Nhật Ký Hành Trình Trân Châu', 190000, true, 'login'),
  ('10000000-0000-0000-0000-000000000010', 'Genshin Impact', 'Bài Ca Trân Châu', 380000, true, 'login')
ON CONFLICT (id) DO UPDATE SET
  game = EXCLUDED.game,
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  active = EXCLUDED.active,
  type = EXCLUDED.type,
  updated_at = now();

COMMIT;
