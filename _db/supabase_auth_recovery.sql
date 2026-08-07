-- =====================================================================
-- KỊCH BẢN KHÔI PHỤC TÀI KHOẢN BỊ THIẾU (ORPHANED ACCOUNTS)
-- =====================================================================
-- Chạy script này trong Supabase SQL Editor.
-- Nó sẽ tự động tìm tất cả các tài khoản có trong auth.users (bao gồm namcum)
-- nhưng bị thiếu trong user_roles, và tự động liên kết lại.

INSERT INTO public.user_roles (id, username, role)
SELECT 
    u.id, 
    split_part(u.email, '@', 1) as username, 
    'customer'
FROM auth.users u
LEFT JOIN public.user_roles r ON u.id = r.id
WHERE r.id IS NULL
  AND u.email LIKE '%@namcumz.com'
ON CONFLICT (id) DO NOTHING;

-- Kiểm tra lại xem namcum đã có trong user_roles chưa
SELECT * FROM public.user_roles WHERE username = 'namcum';
