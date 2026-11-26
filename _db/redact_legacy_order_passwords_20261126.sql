-- =====================================================================
-- NAMCUMZ LEGACY ORDER PASSWORD REDACTION (F9 REMEDIATION - 2026-11-26)
-- Step 1 (READ ONLY) is active by default so the shop owner can inspect
-- all affected legacy orders BEFORE approving Step 2 redaction.
-- NEVER delete customer orders; only mask the exposed password value.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1: READ-ONLY PREVIEW (safe to run immediately)
-- Lists legacy orders whose content matches plaintext password markers
-- (excluding legitimate "Battle Pass" / "Supply Pass" phrases).
-- ---------------------------------------------------------------------
BEGIN TRANSACTION READ ONLY;

SELECT id, order_code, kind, status, cancelled, created_at
FROM public.orders
WHERE regexp_replace(
        content,
        '(battle|supply|season|monthly|event)\s+pass',
        '',
        'gi'
      ) ~* '(^|[\s,;|/(\[])(mk|m[ậẬa]t\s*kh[ẩẨa]u|pass|password|pw)\s*[:=]'
ORDER BY created_at DESC;

COMMIT;

-- ---------------------------------------------------------------------
-- STEP 2: TARGETED REDACTION (UNCOMMENT ONLY AFTER STEP 1 REVIEW & BACKUP)
-- Masks exposed password values while preserving order code & other notes.
-- Only touches orders that are completed/cancelled (or explicitly listed),
-- so active in-progress orders are not disrupted mid-service.
-- ---------------------------------------------------------------------
/*
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

WITH candidates AS (
  SELECT id
  FROM public.orders
  WHERE (status = 'hoan_thanh' OR cancelled = true OR order_code = 'DH597')
    AND regexp_replace(
          content,
          '(battle|supply|season|monthly|event)\s+pass',
          '',
          'gi'
        ) ~* '(^|[\s,;|/(\[])(mk|m[ậẬa]t\s*kh[ẩẨa]u|pass|password|pw)\s*[:=]'
),
redacted AS (
  UPDATE public.orders o
  SET content = regexp_replace(
        o.content,
        '(^|[\s,;|/(\[])((?:mk|m[ậẬa]t\s*kh[ẩẨa]u|pass|password|pw)\s*[:=]\s*)([^\r\n,;]+)',
        '\1\2[ĐÃ ẨN MẬT KHẨU ĐỂ BẢO MẬT]',
        'gi'
      ),
      updated_at = now()
  FROM candidates c
  WHERE o.id = c.id
  RETURNING o.id, o.order_code
)
SELECT count(*) AS redacted_order_count, array_agg(order_code) AS redacted_order_codes
FROM redacted;

COMMIT;
*/
