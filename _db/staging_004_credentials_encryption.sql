-- =====================================================================
-- NAMCUMZ STAGING MIGRATION: 004_CREDENTIALS_ENCRYPTION
-- Requires a Supabase Vault secret named namcumz-order-credentials-key.
-- The key is never stored in this repository or returned to clients.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
DO $staging_preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version = 'staging_003_login_topup') THEN
    RAISE EXCEPTION 'staging_003_login_topup must be installed first';
  END IF;
  IF to_regclass('public.order_credentials') IS NULL THEN
    RAISE EXCEPTION 'order_credentials table missing';
  END IF;
END $staging_preflight$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION namcumz_private.credential_key()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  secret text;
BEGIN
  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'namcumz-order-credentials-key'
  LIMIT 1;
  IF secret IS NULL OR char_length(secret) < 32 THEN
    RAISE EXCEPTION 'Credential encryption key is not configured';
  END IF;
  RETURN secret;
END $fn$;

REVOKE ALL ON FUNCTION namcumz_private.credential_key() FROM PUBLIC, anon, authenticated;

DO $preflight$
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE EXCEPTION 'Supabase Vault is required before installing credential encryption';
  END IF;
  PERFORM namcumz_private.credential_key();
END $preflight$;

ALTER TABLE public.order_credentials
  ADD COLUMN IF NOT EXISTS account_password_ciphertext text;

DO $migrate_existing$
DECLARE
  key text;
  remaining integer;
  has_plaintext boolean;
BEGIN
  key := namcumz_private.credential_key();
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_credentials' AND column_name = 'account_password'
  ) INTO has_plaintext;
  IF has_plaintext THEN
    EXECUTE $sql$
      UPDATE public.order_credentials
      SET account_password_ciphertext = encode(
        extensions.pgp_sym_encrypt(account_password, $1, 'cipher-algo=aes256'),
        'base64'
      )
      WHERE account_password_ciphertext IS NULL
    $sql$ USING key;
    EXECUTE 'SELECT count(*) FROM public.order_credentials WHERE account_password_ciphertext IS NULL'
      INTO remaining;
    IF remaining <> 0 THEN
      RAISE EXCEPTION 'Credential encryption migration left % rows without ciphertext', remaining;
    END IF;
    ALTER TABLE public.order_credentials DROP COLUMN account_password;
  END IF;
END $migrate_existing$;

ALTER TABLE public.order_credentials
  ALTER COLUMN account_password_ciphertext SET NOT NULL;

DROP POLICY IF EXISTS credentials_read ON public.order_credentials;
REVOKE ALL ON public.order_credentials FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_order_credentials(p_order_id uuid)
RETURNS TABLE(
  order_id uuid,
  login_method text,
  account_username text,
  account_password text,
  contact_phone text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  uid uuid := namcumz_private.require_user();
BEGIN
  IF p_order_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND (o.user_id = uid OR o.booster_id = uid OR namcumz_private.is_admin())
  ) THEN
    RAISE EXCEPTION 'Credential access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.order_id,
         c.login_method,
         c.account_username,
         extensions.pgp_sym_decrypt(decode(c.account_password_ciphertext, 'base64'), namcumz_private.credential_key()),
         c.contact_phone,
         c.notes,
         c.created_at
  FROM public.order_credentials c
  WHERE c.order_id = p_order_id;
END $fn$;

REVOKE ALL ON FUNCTION public.get_order_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_credentials(uuid) TO authenticated;

-- Replace top-up creation so new rows are encrypted before they reach storage.
CREATE OR REPLACE FUNCTION public.create_topup_order(
  p_request uuid,
  p_package uuid,
  p_server text,
  p_login_method text,
  p_account text,
  p_password text,
  p_phone text,
  p_notes text DEFAULT ''
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  uid uuid := namcumz_private.require_user();
  o public.orders;
  pkg public.packages;
  clean_acc text := trim(p_account);
  clean_pass text := p_password;
  clean_phone text := trim(p_phone);
  clean_notes text := trim(coalesce(p_notes, ''));
  clean_method text := trim(coalesce(p_login_method, 'Hoyoverse'));
  order_summary text;
BEGIN
  IF p_request IS NULL OR p_package IS NULL THEN RAISE EXCEPTION 'Thiếu mã yêu cầu hoặc gói nạp'; END IF;
  IF p_server NOT IN ('Asia', 'America', 'Europe', 'TW/HK/MO') THEN RAISE EXCEPTION 'Máy chủ không hợp lệ'; END IF;
  IF char_length(clean_acc) NOT BETWEEN 1 AND 200 OR char_length(clean_pass) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Tài khoản hoặc mật khẩu không hợp lệ';
  END IF;
  IF clean_phone !~ '^[0-9+ .()\-]{8,25}$' THEN RAISE EXCEPTION 'Số điện thoại Zalo liên hệ không hợp lệ'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO o FROM public.orders WHERE user_id = uid AND request_id = p_request;
  IF FOUND THEN RETURN o; END IF;

  PERFORM namcumz_private.rate_limit('topup:' || uid::text, 10, 3600);
  SELECT * INTO pkg FROM public.packages WHERE id = p_package AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gói nạp không tồn tại hoặc đã ngừng hỗ trợ'; END IF;

  order_summary := '[' || p_server || '] [' || pkg.game || '] ' || pkg.name ||
                   E'\nPhương thức: ' || clean_method ||
                   E'\nSĐT Zalo: ' || clean_phone ||
                   CASE WHEN clean_notes <> '' THEN E'\nGhi chú: ' || left(clean_notes, 500) ELSE '' END;

  INSERT INTO public.orders (content, game_server, request_id, kind, package_id)
  VALUES (order_summary, p_server, p_request, 'topup', pkg.id)
  RETURNING * INTO o;

  UPDATE public.orders
  SET price = pkg.price, required_amount = pkg.price, quote_accepted = true
  WHERE id = o.id
  RETURNING * INTO o;

  INSERT INTO public.order_credentials (
    order_id, login_method, account_username, account_password_ciphertext, contact_phone, notes
  ) VALUES (
    o.id, clean_method, clean_acc,
    encode(extensions.pgp_sym_encrypt(clean_pass, namcumz_private.credential_key(), 'cipher-algo=aes256'), 'base64'),
    clean_phone, clean_notes
  );

  RETURN o;
END $fn$;

REVOKE ALL ON FUNCTION public.create_topup_order(uuid, uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_topup_order(uuid, uuid, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.app_contract_version()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $fn$
  SELECT 'staging_004_credentials_encryption'::text;
$fn$;
REVOKE ALL ON FUNCTION public.app_contract_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_contract_version() TO anon, authenticated;

INSERT INTO namcumz_private.migrations(version)
VALUES ('staging_004_credentials_encryption')
ON CONFLICT (version) DO UPDATE SET applied_at = now();

COMMIT;
SELECT 'staging_004_credentials_encryption successfully installed' AS result;