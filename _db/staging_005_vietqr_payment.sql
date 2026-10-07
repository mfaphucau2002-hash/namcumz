-- =====================================================================
-- NAMCUMZ STAGING MIGRATION: 005_VIETQR_PAYMENT
-- VietQR automated bank transfer payment integration,
-- atomic transaction matching, wallet balances, and anti-duplicate guards.
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

DO $staging_preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version = 'staging_003_login_topup') THEN
    RAISE EXCEPTION 'staging_003_login_topup must be installed first';
  END IF;
  IF EXISTS (SELECT 1 FROM namcumz_private.migrations WHERE version = 'staging_005_vietqr_payment') THEN
    RAISE EXCEPTION 'staging_005_vietqr_payment already applied';
  END IF;
END $staging_preflight$;

-- 1. Orders table extensions for payment lifecycle
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + INTERVAL '15 minutes'),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Add check constraints safely
DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_method_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check 
      CHECK (payment_method IN ('bank_transfer', 'wallet', 'manual'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_payment_status_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
      CHECK (payment_status IN ('PENDING', 'VERIFYING', 'PAID', 'EXPIRED', 'FAILED', 'REFUNDED'));
  END IF;
END $chk$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_unique 
  ON public.orders(payment_reference) WHERE payment_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_payment_status_idx 
  ON public.orders(payment_status);

-- 2. Bank / Payment transactions table (recorded & matched transactions)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'vietqr',
  provider_transaction_id text UNIQUE,
  bank_code text,
  bank_account text,
  amount bigint NOT NULL CHECK (amount > 0),
  transfer_content text NOT NULL,
  transaction_time timestamptz NOT NULL DEFAULT now(),
  matched_order_id uuid REFERENCES public.orders(id),
  status text NOT NULL DEFAULT 'matched' CHECK (status IN ('unmatched', 'matched', 'duplicate', 'failed')),
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_transactions_matched_order_idx 
  ON public.payment_transactions(matched_order_id);
CREATE INDEX IF NOT EXISTS payment_transactions_content_idx 
  ON public.payment_transactions(transfer_content);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;

-- RLS: Customer can view transactions matched to their orders; admin can view all
CREATE POLICY payment_transactions_read ON public.payment_transactions FOR SELECT TO authenticated
  USING (
    namcumz_private.is_admin()
    OR (
      matched_order_id IS NOT NULL 
      AND EXISTS (SELECT 1 FROM public.orders WHERE id = payment_transactions.matched_order_id AND user_id = auth.uid())
    )
  );

-- 3. Webhook idempotency and audit table
CREATE TABLE IF NOT EXISTS namcumz_private.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text UNIQUE,
  payload jsonb NOT NULL,
  signature_valid boolean NOT NULL DEFAULT true,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON namcumz_private.payment_webhook_events FROM PUBLIC, anon, authenticated;

-- 4. User Wallets for Balance Payment (Section 18)
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id uuid PRIMARY KEY REFERENCES public.user_roles(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_roles(id),
  order_id uuid REFERENCES public.orders(id),
  amount bigint NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit', 'payment', 'refund')),
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx ON public.wallet_transactions(user_id);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_wallets, public.wallet_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_wallets, public.wallet_transactions TO authenticated;

CREATE POLICY user_wallets_read ON public.user_wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR namcumz_private.is_admin());

CREATE POLICY wallet_transactions_read ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR namcumz_private.is_admin());

-- 5. Helper function: Generate high-entropy unique payment reference (e.g. NCZE54FEA0)
CREATE OR REPLACE FUNCTION namcumz_private.generate_payment_reference() 
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  candidate text;
  collision boolean := true;
  loops integer := 0;
BEGIN
  WHILE collision AND loops < 20 LOOP
    -- Generates uppercase code like NCZ8F3B1A (prefix NCZ + 7 hex characters)
    candidate := 'NCZ' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 7));
    SELECT EXISTS (SELECT 1 FROM public.orders WHERE payment_reference = candidate) INTO collision;
    loops := loops + 1;
  END LOOP;
  IF collision THEN
    candidate := 'NCZ' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));
  END IF;
  RETURN candidate;
END $fn$;

REVOKE ALL ON FUNCTION namcumz_private.generate_payment_reference() FROM PUBLIC, anon, authenticated;

-- 6. Update order preparation trigger to populate payment fields automatically
CREATE OR REPLACE FUNCTION namcumz_private.prepare_order() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated owner required' USING ERRCODE = '42501';
  END IF;
  IF NEW.price <> 0 OR NEW.status <> 'cho_xu_ly' OR NEW.booster_id IS NOT NULL
     OR NEW.rating IS NOT NULL OR NEW.review_comment IS NOT NULL OR NEW.ai_plan IS NOT NULL
     OR NEW.secret_code IS NOT NULL THEN
    RAISE EXCEPTION 'Client cannot assign price, status, booster, review or private fields' USING ERRCODE = '42501';
  END IF;
  NEW.order_code := 'DH-' || gen_random_uuid()::text;
  NEW.payment_reference := namcumz_private.generate_payment_reference();
  NEW.payment_status := 'PENDING';
  NEW.payment_method := coalesce(nullif(NEW.payment_method, ''), 'bank_transfer');
  NEW.expires_at := now() + INTERVAL '15 minutes';
  NEW.created_at := now();
  NEW.booster_name := 'Chưa nhận';
  SELECT coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), '')) INTO NEW.renter_name
  FROM public.user_roles WHERE id = auth.uid();
  IF NEW.renter_name IS NULL THEN
    SELECT left(coalesce(nullif(btrim(raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(email, '@', 1), ''), 'Khách hàng'), 100)
    INTO NEW.renter_name FROM auth.users WHERE id = auth.uid();
  END IF;
  IF NEW.renter_name IS NULL THEN
    RAISE EXCEPTION 'Hồ sơ tài khoản chưa hoàn tất. Vui lòng liên hệ hỗ trợ.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $fn$;

-- 7. Ensure existing orders without payment reference get one populated
UPDATE public.orders 
SET payment_reference = namcumz_private.generate_payment_reference(),
    payment_status = CASE WHEN paid_amount >= price AND price > 0 THEN 'PAID' ELSE 'PENDING' END,
    expires_at = coalesce(expires_at, created_at + INTERVAL '15 minutes')
WHERE payment_reference IS NULL;

-- 8. Atomic payment confirmation function (Row locks, idempotency, anti-race condition)
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
  v_result jsonb;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT', 'message', 'Số tiền phải lớn hơn 0');
  END IF;
  IF p_transfer_content IS NULL OR btrim(p_transfer_content) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_CONTENT', 'message', 'Thiếu nội dung chuyển khoản');
  END IF;

  v_clean_content := btrim(p_transfer_content);
  -- Normalized content: uppercase, strip spaces and hyphens for fuzzy matching
  v_normalized_content := upper(regexp_replace(v_clean_content, '[^a-zA-Z0-9]', '', 'g'));

  -- Lock advisory transaction lock based on provider transaction id or normalized content
  v_lock_key := hashtextextended(coalesce(p_provider_txn_id, v_normalized_content), 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 1. Check idempotency: If this provider_transaction_id has already been processed
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

  -- 2. Find target order by payment_reference or order_code
  -- Match by payment_reference (e.g. NCZE54FEA0) or order_code (e.g. DH-...)
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

  -- 3. If no order matched
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

  -- 4. Check if order is already paid
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

  -- 5. Check if order is cancelled
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

  -- 6. Check amount
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

  -- 7. Check expiration (Allow 10 minutes grace period for banking network delays)
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

  -- 8. MATCH & CONFIRM PAYMENT
  UPDATE public.orders SET
    paid_amount = p_amount,
    payment_status = 'PAID',
    payment_method = 'bank_transfer',
    paid_at = now(),
    version = version + 1,
    updated_at = now()
  WHERE id = v_target_order.id;

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
    'message', 'Thanh toán đã được xác nhận thành công'
  );
END $fn$;

REVOKE ALL ON FUNCTION namcumz_private.confirm_payment_transaction(text, text, text, text, bigint, text, jsonb) FROM PUBLIC, anon, authenticated;

-- 9. Safe public order payment info query (for checkout page)
CREATE OR REPLACE FUNCTION public.get_order_payment_info(p_order_identifier text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_order public.orders;
  v_is_owner boolean := false;
  v_uid uuid := auth.uid();
BEGIN
  IF p_order_identifier IS NULL OR btrim(p_order_identifier) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE order_code = btrim(p_order_identifier)
     OR payment_reference = upper(btrim(p_order_identifier))
     OR id::text = btrim(p_order_identifier)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_uid IS NOT NULL AND (v_uid = v_order.user_id OR namcumz_private.is_admin()) THEN
    v_is_owner := true;
  END IF;

  -- Auto mark expired if past deadline and still PENDING
  IF v_order.payment_status = 'PENDING' AND v_order.expires_at IS NOT NULL AND v_order.expires_at < now() THEN
    UPDATE public.orders SET payment_status = 'EXPIRED' WHERE id = v_order.id;
    v_order.payment_status := 'EXPIRED';
  END IF;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_code', v_order.order_code,
    'payment_reference', v_order.payment_reference,
    'content', v_order.content,
    'game_server', v_order.game_server,
    'kind', v_order.kind,
    'price', v_order.price,
    'required_amount', v_order.required_amount,
    'paid_amount', v_order.paid_amount,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'status', v_order.status,
    'cancelled', v_order.cancelled,
    'expires_at', v_order.expires_at,
    'paid_at', v_order.paid_at,
    'created_at', v_order.created_at,
    'is_owner', v_is_owner
  );
END $fn$;

REVOKE ALL ON FUNCTION public.get_order_payment_info(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_payment_info(text) TO anon, authenticated;

-- 10. Pay order by user balance (Section 18)
CREATE OR REPLACE FUNCTION public.pay_order_by_wallet(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := namcumz_private.require_user();
  v_order public.orders;
  v_wallet public.user_wallets;
  v_new_balance bigint;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'Mã đơn hàng không hợp lệ';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || p_order_id::text, 0));

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn hàng';
  END IF;

  IF v_order.user_id <> v_uid AND NOT namcumz_private.is_admin() THEN
    RAISE EXCEPTION 'Không có quyền thanh toán đơn hàng này' USING ERRCODE = '42501';
  END IF;

  IF v_order.payment_status = 'PAID' OR (v_order.price > 0 AND v_order.paid_amount >= v_order.price) THEN
    RAISE EXCEPTION 'Đơn hàng này đã được thanh toán';
  END IF;

  IF v_order.cancelled THEN
    RAISE EXCEPTION 'Đơn hàng đã bị hủy';
  END IF;

  IF v_order.price <= 0 THEN
    RAISE EXCEPTION 'Đơn hàng chưa có báo giá hoặc không yêu cầu thanh toán';
  END IF;

  -- Lock user wallet
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_order.price THEN
    RAISE EXCEPTION 'Số dư ví không đủ để thanh toán (Hiện có: % VND, Cần: % VND)', 
      coalesce(v_wallet.balance, 0), v_order.price USING ERRCODE = 'P0001';
  END IF;

  v_new_balance := v_wallet.balance - v_order.price;
  UPDATE public.user_wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = v_uid;

  INSERT INTO public.wallet_transactions(user_id, order_id, amount, type, balance_after, description)
  VALUES (
    v_uid, v_order.id, -v_order.price, 'payment', v_new_balance, 
    'Thanh toán đơn hàng ' || v_order.order_code
  );

  UPDATE public.orders SET
    paid_amount = v_order.price,
    payment_status = 'PAID',
    payment_method = 'wallet',
    paid_at = now(),
    version = version + 1,
    updated_at = now()
  WHERE id = v_order.id;

  INSERT INTO public.order_logs(order_id, user_id, action)
  VALUES (v_order.id, v_uid, 'payment_wallet: ' || v_order.price::text || ' VND qua số dư ví');

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'order_code', v_order.order_code,
    'paid_amount', v_order.price,
    'new_wallet_balance', v_new_balance
  );
END $fn$;

REVOKE ALL ON FUNCTION public.pay_order_by_wallet(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_order_by_wallet(uuid) TO authenticated;

-- 11. Allow cancelling a pending order
CREATE OR REPLACE FUNCTION public.cancel_order_payment(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := namcumz_private.require_user();
  v_order public.orders;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn hàng';
  END IF;
  IF v_order.user_id <> v_uid AND NOT namcumz_private.is_admin() THEN
    RAISE EXCEPTION 'Không có quyền hủy đơn hàng này' USING ERRCODE = '42501';
  END IF;
  IF v_order.payment_status = 'PAID' OR v_order.paid_amount > 0 THEN
    RAISE EXCEPTION 'Không thể hủy đơn hàng đã thanh toán';
  END IF;

  UPDATE public.orders SET 
    cancelled = true, 
    payment_status = 'CANCELLED',
    version = version + 1,
    updated_at = now()
  WHERE id = v_order.id;

  INSERT INTO public.order_logs(order_id, user_id, action)
  VALUES (v_order.id, v_uid, 'cancel_order_payment: Khách hàng hủy đơn chưa thanh toán');

  RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', 'CANCELLED');
END $fn$;

REVOKE ALL ON FUNCTION public.cancel_order_payment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_payment(uuid) TO authenticated;

-- Record migration
INSERT INTO namcumz_private.migrations(version) VALUES ('staging_005_vietqr_payment')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
