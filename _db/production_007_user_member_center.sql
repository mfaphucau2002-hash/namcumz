-- =====================================================================
-- NAMCUMZ PRODUCTION MIGRATION: 007_USER_MEMBER_CENTER
-- User Profile / Member Center extensions:
-- Daily check-in, VIP level calculation, Deposit orders,
-- Game accounts address book, Vouchers catalog, Profile summary RPC.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- 1. Extend orders table constraint to include 'deposit'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_kind_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_kind_check 
  CHECK (kind IN ('boost', 'topup', 'deposit'));

-- 2. Extend wallet_transactions constraint to include 'checkin'
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
  CHECK (type IN ('deposit', 'payment', 'refund', 'checkin'));

-- 3. Add checkin_balance to user_wallets
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS checkin_balance bigint NOT NULL DEFAULT 0 CHECK (checkin_balance >= 0);

-- 4. Daily Check-in Table
CREATE TABLE IF NOT EXISTS public.user_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  check_in_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  reward bigint NOT NULL DEFAULT 500,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_check_ins_user_date_key UNIQUE (user_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS user_check_ins_user_idx ON public.user_check_ins(user_id);

ALTER TABLE public.user_check_ins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_check_ins FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_check_ins TO authenticated;

DROP POLICY IF EXISTS user_check_ins_read ON public.user_check_ins;
CREATE POLICY user_check_ins_read ON public.user_check_ins FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR namcumz_private.is_admin());

-- 5. User Game Accounts (Danh ba nick game)
CREATE TABLE IF NOT EXISTS public.user_game_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  game text NOT NULL CHECK (char_length(game) BETWEEN 1 AND 100),
  uid text NOT NULL CHECK (char_length(uid) BETWEEN 1 AND 50),
  server text NOT NULL CHECK (char_length(server) BETWEEN 1 AND 50),
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 100),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_game_accounts_user_idx ON public.user_game_accounts(user_id);

ALTER TABLE public.user_game_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_game_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_game_accounts TO authenticated;

DROP POLICY IF EXISTS user_game_accounts_owner ON public.user_game_accounts;
CREATE POLICY user_game_accounts_owner ON public.user_game_accounts
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 6. Vouchers Catalog
CREATE TABLE IF NOT EXISTS public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  discount_percent integer CHECK (discount_percent BETWEEN 1 AND 100),
  discount_amount bigint DEFAULT 0,
  max_discount bigint DEFAULT 50000,
  min_order bigint NOT NULL DEFAULT 100000,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'USED', 'EXPIRED', 'LOCKED')),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vouchers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.vouchers TO authenticated;

DROP POLICY IF EXISTS vouchers_read ON public.vouchers;
CREATE POLICY vouchers_read ON public.vouchers FOR SELECT TO authenticated
  USING (true);

INSERT INTO public.vouchers (code, title, discount_percent, discount_amount, max_discount, min_order, expires_at, status, description)
VALUES 
  ('NAMCUMZNEW', 'Giảm 10% Khách Hàng Mới', 10, 0, 50000, 100000, now() + INTERVAL '30 days', 'AVAILABLE', 'Áp dụng cho mọi đơn nạp game & cày thuê lần đầu'),
  ('VIPMEMBER', 'Ưu Đãi Hội Viên Thân Thiết', 15, 0, 100000, 200000, now() + INTERVAL '60 days', 'AVAILABLE', 'Giảm 15% tối đa 100.000đ cho đơn từ 200.000đ'),
  ('TOPUPWELKIN', 'Trợ Giá Welkin / Không Nguyệt', NULL, 15000, 15000, 75000, now() + INTERVAL '15 days', 'AVAILABLE', 'Giảm ngay 15.000đ khi nạp vé tháng Welkin')
ON CONFLICT (code) DO NOTHING;

-- 7. Deposit Order Creation RPC
CREATE OR REPLACE FUNCTION public.create_deposit_order(p_amount bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := namcumz_private.require_user();
  v_order public.orders;
BEGIN
  IF p_amount IS NULL OR p_amount < 10000 THEN
    RAISE EXCEPTION 'Số tiền nạp tối thiểu là 10.000 VNĐ' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount > 50000000 THEN
    RAISE EXCEPTION 'Số tiền nạp tối đa mỗi lần là 50.000.000 VNĐ' USING ERRCODE = 'P0001';
  END IF;

  -- Insert with default price=0 to satisfy prepare_order check, then update with verified amount
  INSERT INTO public.orders (
    content, game_server, request_id, kind
  ) VALUES (
    'Nạp ' || to_char(p_amount, 'FM999,999,999') || ' VNĐ vào ví Namcumz',
    'Asia', gen_random_uuid(), 'deposit'
  ) RETURNING * INTO v_order;

  UPDATE public.orders SET
    price = p_amount,
    required_amount = p_amount,
    quote_accepted = true
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_code', v_order.order_code,
    'payment_reference', v_order.payment_reference,
    'amount', p_amount,
    'expires_at', v_order.expires_at
  );
END $fn$;

REVOKE ALL ON FUNCTION public.create_deposit_order(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_deposit_order(bigint) TO authenticated;

-- 8. Claim Daily Checkin RPC
CREATE OR REPLACE FUNCTION public.claim_daily_checkin()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := namcumz_private.require_user();
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_reward bigint := 500;
  v_existing boolean;
  v_new_checkin_bal bigint;
  v_new_total_bal bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || 'checkin' || v_today::text, 0));

  SELECT EXISTS (
    SELECT 1 FROM public.user_check_ins WHERE user_id = v_uid AND check_in_date = v_today
  ) INTO v_existing;

  IF v_existing THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_checked_in', true,
      'message', 'Bạn đã điểm danh hôm nay rồi! Hãy quay lại vào ngày mai nhé.'
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
  VALUES (v_uid, v_reward, 'checkin', v_new_checkin_bal, 'Thưởng điểm danh hàng ngày (' || to_char(v_today, 'DD/MM/YYYY') || ')');

  RETURN jsonb_build_object(
    'success', true,
    'reward', v_reward,
    'check_in_date', v_today,
    'checkin_balance', v_new_checkin_bal,
    'total_balance', (v_new_total_bal + v_new_checkin_bal),
    'message', 'Điểm danh thành công! Nhận +' || v_reward::text || ' VNĐ vào ví điểm danh.'
  );
END $fn$;

REVOKE ALL ON FUNCTION public.claim_daily_checkin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO authenticated;

-- 9. Atomic Payment Confirmation with Deposit Crediting
CREATE OR REPLACE FUNCTION namcumz_private.confirm_payment_transaction(
  p_provider text,
  p_provider_txn_id text,
  p_bank_code text,
  p_bank_account text,
  p_amount bigint,
  p_transfer_content text,
  p_raw_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_clean_content text;
  v_normalized_content text;
  v_target_order public.orders;
  v_existing_txn public.payment_transactions;
  v_lock_key bigint;
  v_new_wallet_balance bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT', 'message', 'Số tiền phải lớn hơn 0');
  END IF;
  IF p_transfer_content IS NULL OR btrim(p_transfer_content) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_CONTENT', 'message', 'Thiếu nội dung chuyển khoản');
  END IF;

  v_clean_content := btrim(p_transfer_content);
  v_normalized_content := upper(regexp_replace(v_clean_content, '[^a-zA-Z0-9]', '', 'g'));

  v_lock_key := hashtextextended(coalesce(p_provider_txn_id, v_normalized_content), 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_provider_txn_id IS NOT NULL AND p_provider_txn_id <> '' THEN
    SELECT * INTO v_existing_txn FROM public.payment_transactions 
    WHERE provider_transaction_id = p_provider_txn_id FOR UPDATE;
    IF FOUND THEN
      IF v_existing_txn.matched_order_id IS NOT NULL THEN
        RETURN jsonb_build_object(
          'success', true, 
          'matched', true, 
          'is_idempotent_replay', true,
          'order_id', v_existing_txn.matched_order_id,
          'message', 'Giao dịch đã được ghi nhận trước đó'
        );
      ELSE
        RETURN jsonb_build_object(
          'success', false, 
          'matched', false, 
          'is_idempotent_replay', true,
          'error', 'TRANSACTION_ALREADY_REJECTED',
          'message', 'Giao dịch đã từng được xử lý và không khớp đơn nào'
        );
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_target_order FROM public.orders
  WHERE (
    payment_reference IS NOT NULL 
    AND (
      v_normalized_content LIKE '%' || upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g')) || '%'
    )
  ) OR (
    order_code IS NOT NULL 
    AND (
      v_normalized_content LIKE '%' || upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g')) || '%'
    )
  )
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.payment_transactions(
      provider, provider_transaction_id, bank_code, bank_account, 
      amount, transfer_content, matched_order_id, status, raw_payload
    ) VALUES (
      p_provider, p_provider_txn_id, p_bank_code, p_bank_account,
      p_amount, v_clean_content, NULL, 'unmatched', p_raw_payload
    );
    RETURN jsonb_build_object(
      'success', false,
      'matched', false,
      'error', 'ORDER_NOT_FOUND',
      'message', 'Không tìm thấy đơn hàng khớp với nội dung chuyển khoản'
    );
  END IF;

  IF v_target_order.payment_status = 'PAID' OR (v_target_order.price > 0 AND v_target_order.paid_amount >= v_target_order.price) THEN
    INSERT INTO public.payment_transactions(
      provider, provider_transaction_id, bank_code, bank_account, 
      amount, transfer_content, matched_order_id, status, raw_payload
    ) VALUES (
      p_provider, p_provider_txn_id, p_bank_code, p_bank_account,
      p_amount, v_clean_content, v_target_order.id, 'duplicate', p_raw_payload
    );
    RETURN jsonb_build_object(
      'success', false,
      'matched', false,
      'order_id', v_target_order.id,
      'error', 'ORDER_ALREADY_PAID',
      'message', 'Đơn hàng này đã được thanh toán từ trước'
    );
  END IF;

  IF v_target_order.cancelled THEN
    INSERT INTO public.payment_transactions(
      provider, provider_transaction_id, bank_code, bank_account, 
      amount, transfer_content, matched_order_id, status, raw_payload
    ) VALUES (
      p_provider, p_provider_txn_id, p_bank_code, p_bank_account,
      p_amount, v_clean_content, v_target_order.id, 'failed', p_raw_payload
    );
    RETURN jsonb_build_object(
      'success', false,
      'matched', false,
      'order_id', v_target_order.id,
      'error', 'ORDER_CANCELLED',
      'message', 'Đơn hàng đã bị hủy'
    );
  END IF;

  IF v_target_order.price > 0 AND p_amount < v_target_order.price THEN
    INSERT INTO public.payment_transactions(
      provider, provider_transaction_id, bank_code, bank_account, 
      amount, transfer_content, matched_order_id, status, raw_payload
    ) VALUES (
      p_provider, p_provider_txn_id, p_bank_code, p_bank_account,
      p_amount, v_clean_content, v_target_order.id, 'unmatched', p_raw_payload
    );
    RETURN jsonb_build_object(
      'success', false,
      'matched', false,
      'order_id', v_target_order.id,
      'error', 'INSUFFICIENT_AMOUNT',
      'expected_amount', v_target_order.price,
      'received_amount', p_amount,
      'message', 'Số tiền chuyển khoản không đủ theo yêu cầu đơn hàng'
    );
  END IF;

  IF v_target_order.expires_at IS NOT NULL AND v_target_order.expires_at + INTERVAL '10 minutes' < now() THEN
    INSERT INTO public.payment_transactions(
      provider, provider_transaction_id, bank_code, bank_account, 
      amount, transfer_content, matched_order_id, status, raw_payload
    ) VALUES (
      p_provider, p_provider_txn_id, p_bank_code, p_bank_account,
      p_amount, v_clean_content, v_target_order.id, 'unmatched', p_raw_payload
    );
    RETURN jsonb_build_object(
      'success', false,
      'matched', false,
      'order_id', v_target_order.id,
      'error', 'ORDER_EXPIRED',
      'message', 'Phiên thanh toán đã hết hạn quá thời gian cho phép'
    );
  END IF;

  -- CONFIRM ORDER PAYMENT
  UPDATE public.orders SET
    paid_amount = p_amount,
    payment_status = 'PAID',
    payment_method = 'bank_transfer',
    status = CASE WHEN kind = 'deposit' THEN 'hoan_thanh' ELSE status END,
    paid_at = now(),
    version = version + 1,
    updated_at = now()
  WHERE id = v_target_order.id;

  -- IF DEPOSIT ORDER, ATOMICALLY CREDIT WALLET
  IF v_target_order.kind = 'deposit' THEN
    INSERT INTO public.user_wallets (user_id, balance, checkin_balance, updated_at)
    VALUES (v_target_order.user_id, p_amount, 0, now())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.user_wallets.balance + p_amount,
        updated_at = now()
    RETURNING balance INTO v_new_wallet_balance;

    INSERT INTO public.wallet_transactions (user_id, order_id, amount, type, balance_after, description)
    VALUES (
      v_target_order.user_id,
      v_target_order.id,
      p_amount,
      'deposit',
      v_new_wallet_balance,
      'Nạp tiền vào ví qua VietQR (' || coalesce(v_target_order.order_code, '') || ')'
    );
  END IF;

  INSERT INTO public.payment_transactions(
    provider, provider_transaction_id, bank_code, bank_account, 
    amount, transfer_content, matched_order_id, status, raw_payload
  ) VALUES (
    p_provider, p_provider_txn_id, p_bank_code, p_bank_account,
    p_amount, v_clean_content, v_target_order.id, 'matched', p_raw_payload
  );

  INSERT INTO public.order_logs(order_id, user_id, action)
  VALUES (
    v_target_order.id, 
    v_target_order.user_id, 
    'payment_vietqr: ' || p_amount::text || ' VND qua ' || coalesce(p_bank_code, 'ngân hàng') || '; Ref: ' || coalesce(v_target_order.payment_reference, '')
  );

  INSERT INTO public.notifications(user_id, order_id, title, content)
  VALUES (
    v_target_order.user_id, 
    v_target_order.id, 
    'Thanh toán thành công', 
    'Đã xác nhận thanh toán ' || p_amount::text || ' VND cho đơn hàng ' || v_target_order.order_code
  );

  RETURN jsonb_build_object(
    'success', true,
    'matched', true,
    'order_id', v_target_order.id,
    'order_code', v_target_order.order_code,
    'payment_reference', v_target_order.payment_reference,
    'amount', p_amount,
    'is_deposit', (v_target_order.kind = 'deposit'),
    'new_wallet_balance', v_new_wallet_balance,
    'message', 'Thanh toán đã được xác nhận thành công'
  );
END $fn$;

REVOKE ALL ON FUNCTION namcumz_private.confirm_payment_transaction(text, text, text, text, bigint, text, jsonb) FROM PUBLIC, anon, authenticated;

-- 10. Consolidated Profile Summary RPC
CREATE OR REPLACE FUNCTION public.get_user_profile_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := namcumz_private.require_user();
  v_user public.user_roles;
  v_auth_email text := '';
  v_auth_phone text := '';
  v_wallet_bal bigint := 0;
  v_checkin_bal bigint := 0;
  v_total_spent bigint := 0;
  v_orders_count bigint := 0;
  v_boost_count bigint := 0;
  v_topup_count bigint := 0;
  v_checked_in_today boolean := false;
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_vip_level text := 'MEMBER';
  v_vip_name text := 'Thành viên';
  v_next_threshold bigint := 1000000;
  v_remaining bigint := 1000000;
  v_progress_pct integer := 0;
  v_user_number integer;
BEGIN
  SELECT * INTO v_user FROM public.user_roles WHERE id = v_uid;
  SELECT email, coalesce(raw_user_meta_data->>'phone', '') INTO v_auth_email, v_auth_phone
  FROM auth.users WHERE id = v_uid;

  SELECT coalesce(balance, 0), coalesce(checkin_balance, 0)
  INTO v_wallet_bal, v_checkin_bal
  FROM public.user_wallets WHERE user_id = v_uid;

  -- Calculate total spent from confirmed paid orders (excluding wallet deposits)
  SELECT coalesce(sum(paid_amount), 0) INTO v_total_spent
  FROM public.orders 
  WHERE user_id = v_uid AND payment_status = 'PAID' AND (kind IS NULL OR kind <> 'deposit');

  -- Order counts
  SELECT count(*) INTO v_orders_count FROM public.orders WHERE user_id = v_uid;
  SELECT count(*) INTO v_boost_count FROM public.orders WHERE user_id = v_uid AND (kind = 'boost' OR kind IS NULL);
  SELECT count(*) INTO v_topup_count FROM public.orders WHERE user_id = v_uid AND kind = 'topup';

  -- Check if checked in today
  SELECT EXISTS (
    SELECT 1 FROM public.user_check_ins WHERE user_id = v_uid AND check_in_date = v_today
  ) INTO v_checked_in_today;

  -- VIP calculation
  -- Level 0: MEMBER (0 - 999.999 VNĐ)
  -- Level 1: VIP 1 (1.000.000 - 4.999.999 VNĐ)
  -- Level 2: VIP 2 (5.000.000 - 9.999.999 VNĐ)
  -- Level 3: VIP 3 (10.000.000+ VNĐ)
  IF v_total_spent >= 10000000 THEN
    v_vip_level := 'VIP 3';
    v_vip_name := 'Kim Cương';
    v_next_threshold := 10000000;
    v_remaining := 0;
    v_progress_pct := 100;
  ELSIF v_total_spent >= 5000000 THEN
    v_vip_level := 'VIP 2';
    v_vip_name := 'Bạch Kim';
    v_next_threshold := 10000000;
    v_remaining := 10000000 - v_total_spent;
    v_progress_pct := round(((v_total_spent - 5000000)::numeric / 5000000::numeric) * 100);
  ELSIF v_total_spent >= 1000000 THEN
    v_vip_level := 'VIP 1';
    v_vip_name := 'Vàng';
    v_next_threshold := 5000000;
    v_remaining := 5000000 - v_total_spent;
    v_progress_pct := round(((v_total_spent - 1000000)::numeric / 4000000::numeric) * 100);
  ELSE
    v_vip_level := 'MEMBER';
    v_vip_name := 'Khách Hàng Thân Thiết';
    v_next_threshold := 1000000;
    v_remaining := 1000000 - v_total_spent;
    v_progress_pct := round((v_total_spent::numeric / 1000000::numeric) * 100);
  END IF;

  -- Deterministic user number #100-9999
  v_user_number := abs(('x' || substring(replace(v_uid::text, '-', ''), 1, 6))::bit(24)::integer) % 9000 + 100;

  RETURN jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'display_name', coalesce(nullif(v_user.display_name, ''), v_user.username),
      'role', v_user.role,
      'avatar_url', v_user.avatar_url,
      'bio', v_user.bio,
      'email', v_auth_email,
      'phone', v_auth_phone,
      'user_number', v_user_number,
      'created_at', v_user.created_at
    ),
    'wallet', jsonb_build_object(
      'balance', v_wallet_bal,
      'checkin_balance', v_checkin_bal,
      'total_balance', (v_wallet_bal + v_checkin_bal)
    ),
    'vip', jsonb_build_object(
      'level', v_vip_level,
      'level_name', v_vip_name,
      'total_spent', v_total_spent,
      'next_threshold', v_next_threshold,
      'remaining', v_remaining,
      'progress_percent', v_progress_pct
    ),
    'checkin', jsonb_build_object(
      'checked_in_today', v_checked_in_today,
      'check_in_date', v_today,
      'reward_amount', 500
    ),
    'counts', jsonb_build_object(
      'total_orders', v_orders_count,
      'boost_orders', v_boost_count,
      'topup_orders', v_topup_count
    )
  );
END $fn$;

REVOKE ALL ON FUNCTION public.get_user_profile_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_profile_summary() TO authenticated;

INSERT INTO namcumz_private.migrations(version) VALUES ('production_007_user_member_center')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
