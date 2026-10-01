-- =====================================================================
-- NAMCUMZ PRODUCTION VERIFICATION: 002_CREDENTIALS_ENCRYPTION
-- Read-only metadata checks. Never select or print the Vault secret.
-- =====================================================================

BEGIN TRANSACTION READ ONLY;
DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations
    WHERE version = 'production_002_credentials_encryption'
  ) THEN
    RAISE EXCEPTION 'production_002_credentials_encryption marker missing';
  END IF;

  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE EXCEPTION 'Vault decrypted_secrets view missing';
  END IF;
  IF to_regclass('public.order_credentials') IS NULL THEN
    RAISE EXCEPTION 'order_credentials table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_credentials'
      AND column_name = 'account_password_ciphertext'
  ) THEN
    RAISE EXCEPTION 'Encrypted credential column missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_credentials'
      AND column_name = 'account_password'
  ) THEN
    RAISE EXCEPTION 'Plaintext credential column still exists';
  END IF;

  IF has_table_privilege('authenticated', 'public.order_credentials', 'SELECT')
     OR has_table_privilege('anon', 'public.order_credentials', 'SELECT') THEN
    RAISE EXCEPTION 'Direct credential table reads remain granted';
  END IF;
  IF to_regprocedure('public.get_order_credentials(uuid)') IS NULL
     OR has_function_privilege('anon', 'public.get_order_credentials(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.get_order_credentials(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Credential read RPC grants are incorrect';
  END IF;
  IF to_regprocedure('public.create_topup_order(uuid,uuid,text,text,text,text,text,text)') IS NULL
     OR has_function_privilege('anon', 'public.create_topup_order(uuid,uuid,text,text,text,text,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.create_topup_order(uuid,uuid,text,text,text,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Encrypted top-up RPC grants are incorrect';
  END IF;
  IF to_regprocedure('namcumz_private.credential_key()') IS NULL THEN
    RAISE EXCEPTION 'Credential key helper missing';
  END IF;
  IF to_regprocedure('public.app_contract_version()') IS NULL
     OR NOT has_function_privilege('anon', 'public.app_contract_version()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Contract probe missing or mis-granted';
  END IF;
END $verify$;
ROLLBACK;

SELECT 'PASS: production_002_credentials_encryption metadata verified' AS result;