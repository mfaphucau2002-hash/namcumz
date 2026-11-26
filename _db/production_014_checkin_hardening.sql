-- =====================================================================
-- NAMCUMZ PRODUCTION MIGRATION: 014_CHECKIN_HARDENING
-- Hardens public.claim_daily_checkin() against automated signup farming:
--   1. Requires account age >= 24 hours (using public.user_roles.created_at)
--   2. Enforces server-side rate limit (10 calls/hour/user)
--   3. Caps unverified check-in balance at 15,000 VND until 1st PAID order
-- Preserves SECURITY DEFINER, SET search_path = '', pg_advisory_xact_lock,
-- Asia/Ho_Chi_Minh timezone, wallet_transactions ledger, and app_contract_version().
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- 1. Preflight: require 007 member center and 009 launch access foundation
DO $preflight$
BEGIN
  IF to_regclass('namcumz_private.migrations') IS NULL THEN
    RAISE EXCEPTION 'Migration ledger namcumz_private.migrations missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_007_user_member_center'
  ) THEN
    RAISE EXCEPTION 'Migration production_007_user_member_center required before production_014_checkin_hardening';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_009_launch_access'
  ) THEN
    RAISE EXCEPTION 'Migration production_009_launch_access required before production_014_checkin_hardening';
  END IF;
END $preflight$;

-- 2. Harden public.claim_daily_checkin()
CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := namcumz_private.require_user();
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_reward bigint := 500;
  v_unverified_cap bigint := 15000;
  v_role_created_at timestamptz;
  v_existing boolean;
  v_current_checkin_bal bigint := 0;
  v_has_paid_order boolean := false;
  v_new_checkin_bal bigint;
  v_new_total_bal bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || 'checkin' || v_today::text, 0));
  PERFORM namcumz_private.rate_limit('checkin:' || v_uid::text, 10, 3600);

  SELECT created_at INTO v_role_created_at
  FROM public.user_roles
  WHERE id = v_uid;

  IF v_role_created_at IS NULL OR v_role_created_at > now() - interval '24 hours' THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_checked_in', false,
      'eligible', false,
      'reason', 'account_too_new',
      'message', 'Tài khoản cần hoạt động đủ 24 giờ trước khi điểm danh nhận thưởng.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_check_ins WHERE user_id = v_uid AND check_in_date = v_today
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_checked_in', true,
      'eligible', true,
      'reason', 'already_checked_in',
      'message', 'Bạn đã điểm danh hôm nay rồi! Hãy quay lại vào ngày mai nhé.'
    );
  END IF;

  SELECT coalesce(checkin_balance, 0) INTO v_current_checkin_bal
  FROM public.user_wallets
  WHERE user_id = v_uid;

  SELECT EXISTS (
    SELECT 1 FROM public.orders WHERE user_id = v_uid AND payment_status = 'PAID'
  ) INTO v_has_paid_order;

  IF NOT v_has_paid_order AND coalesce(v_current_checkin_bal, 0) >= v_unverified_cap THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_checked_in', false,
      'eligible', false,
      'reason', 'unverified_cap_reached',
      'message', 'Ví điểm danh trải nghiệm đã đạt tối đa 15.000 VNĐ. Hãy hoàn tất 1 giao dịch để mở khóa tích lũy không giới hạn!'
    );
  END IF;

  INSERT INTO public.user_check_ins (user_id, check_in_date, reward)
  VALUES (v_uid, v_today, v_reward);

  INSERT INTO public.user_wallets (user_id, balance, checkin_balance, updated_at)
  VALUES (v_uid, 0, v_reward, now())
  ON CONFLICT (user_id) DO UPDATE
  SET checkin_balance = public.user_wallets.checkin_balance + v_reward,
      updated_at = now()
  RETURNING checkin_balance, balance INTO v_new_checkin_bal, v_new_total_bal;

  INSERT INTO public.wallet_transactions (user_id, amount, type, balance_after, description)
  VALUES (
    v_uid,
    v_reward,
    'checkin',
    v_new_checkin_bal,
    'Thưởng điểm danh hàng ngày (' || to_char(v_today, 'DD/MM/YYYY') || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'check_in_date', v_today,
    'checkin_balance', v_new_checkin_bal,
    'total_balance', (v_new_total_bal + v_new_checkin_bal),
    'message', 'Điểm danh thành công! Nhận +' || v_reward::text || ' VNĐ vào ví điểm danh.'
  );
END $fn$;

REVOKE ALL ON FUNCTION public.claim_daily_checkin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;

-- 3. Record migration (keep app_contract_version() unchanged for zero-downtime rollout)
INSERT INTO namcumz_private.migrations(version)
VALUES ('production_014_checkin_hardening')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
