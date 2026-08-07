-- Dùng d? admin ki?m tra tài kho?n namcum trong b?ng auth.users
-- Hãy copy toàn b? script này ch?y trong Supabase SQL Editor

CREATE OR REPLACE FUNCTION inspect_auth_user(p_username text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user json;
BEGIN
    SELECT row_to_json(u) INTO v_user
    FROM auth.users u
    WHERE u.email = p_username || '@namcumz.com'
       OR u.raw_user_meta_data->>'username' = p_username;
       
    RETURN v_user;
END;
$$;

-- Grant execute cho public (d? test)
GRANT EXECUTE ON FUNCTION inspect_auth_user(text) TO public;
GRANT EXECUTE ON FUNCTION inspect_auth_user(text) TO anon;
GRANT EXECUTE ON FUNCTION inspect_auth_user(text) TO authenticated;
