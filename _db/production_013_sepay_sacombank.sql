-- =====================================================================
-- NAMCUMZ PRODUCTION MIGRATION: 013_SEPAY_SACOMBANK
-- Switches automated SePay incoming bank-transfer settlement destination
-- from legacy MB Bank (0763550673) to Sacombank (79202012546),
-- and hardens matching against degenerate refs, ambiguous multi-order
-- memos, mismatched SePay parsed codes, and inaccurate replay status.
-- Non-destructive (NO DROP TABLE / DELETE / TRUNCATE), idempotent,
-- preserves all RLS/grants/advisory locks and public.app_contract_version().
-- =====================================================================

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

-- 1. Preflight: require 009 launch access foundation
DO $preflight$
BEGIN
  IF to_regclass('namcumz_private.migrations') IS NULL THEN
    RAISE EXCEPTION 'Migration ledger namcumz_private.migrations missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM namcumz_private.migrations WHERE version = 'production_009_launch_access'
  ) THEN
    RAISE EXCEPTION 'Migration production_009_launch_access required before production_013_sepay_sacombank';
  END IF;
END $preflight$;

-- 2. Private atomic settlement function (Sacombank 79202012546 via SePay)
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
  v_parsed_code text;
  v_target_order public.orders;
  v_match_count int := 0;
  v_existing_txn public.payment_transactions;
  v_lock_key bigint;
  v_new_wallet_balance bigint;
BEGIN
  IF p_provider IS DISTINCT FROM 'sepay'
     OR lower(btrim(coalesce(p_raw_payload->>'transferType', ''))) <> 'in'
     OR btrim(coalesce(p_bank_account, '')) IS DISTINCT FROM '79202012546'
     OR lower(btrim(coalesce(p_bank_code, ''))) NOT IN ('sacombank', 'stb', 'sacom', '970403')
     OR p_provider_txn_id IS NULL OR btrim(p_provider_txn_id) = ''
     OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid incoming bank transaction' USING ERRCODE = '22023';
  END IF;

  IF p_transfer_content IS NULL OR btrim(p_transfer_content) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_CONTENT', 'message', 'Thiếu nội dung chuyển khoản');
  END IF;

  v_clean_content := btrim(p_transfer_content);
  v_normalized_content := upper(regexp_replace(v_clean_content, '[^a-zA-Z0-9]', '', 'g'));
  v_parsed_code := upper(regexp_replace(btrim(coalesce(p_raw_payload->>'code', '')), '[^a-zA-Z0-9]', '', 'g'));

  v_lock_key := hashtextextended(coalesce(p_provider_txn_id, v_normalized_content), 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_provider_txn_id IS NOT NULL AND btrim(p_provider_txn_id) <> '' THEN
    SELECT * INTO v_existing_txn FROM public.payment_transactions
    WHERE provider_transaction_id = p_provider_txn_id FOR UPDATE;
    IF FOUND THEN
      IF v_existing_txn.status = 'matched' AND v_existing_txn.matched_order_id IS NOT NULL THEN
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

  -- If SePay extracted a dedicated payment code (e.g. from another store on a shared account),
  -- require that code to match the target order rather than matching a piggybacked substring.
  IF v_parsed_code <> '' THEN
    SELECT count(*) INTO v_match_count FROM public.orders
    WHERE (
      payment_reference IS NOT NULL
      AND char_length(upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g'))) >= 6
      AND v_parsed_code = upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g'))
    ) OR (
      order_code IS NOT NULL
      AND char_length(upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g'))) >= 6
      AND v_parsed_code = upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g'))
    );

    IF v_match_count = 1 THEN
      SELECT * INTO v_target_order FROM public.orders
      WHERE (
        payment_reference IS NOT NULL
        AND char_length(upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g'))) >= 6
        AND v_parsed_code = upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g'))
      ) OR (
        order_code IS NOT NULL
        AND char_length(upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g'))) >= 6
        AND v_parsed_code = upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g'))
      )
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE;
    END IF;
  ELSE
    -- Prevent ambiguous memos containing references to multiple distinct unpaid orders
    SELECT count(*) INTO v_match_count FROM public.orders
    WHERE payment_status <> 'PAID'
      AND NOT cancelled
      AND (
        (
          payment_reference IS NOT NULL
          AND char_length(upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g'))) >= 6
          AND v_normalized_content LIKE '%' || upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g')) || '%'
        ) OR (
          order_code IS NOT NULL
          AND char_length(upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g'))) >= 6
          AND v_normalized_content LIKE '%' || upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g')) || '%'
        )
      );

    IF v_match_count > 1 THEN
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
        'error', 'AMBIGUOUS_ORDER_REFERENCE',
        'message', 'Nội dung chuyển khoản khớp nhiều đơn hàng cùng lúc, cần xác minh thủ công'
      );
    END IF;

    SELECT * INTO v_target_order FROM public.orders
    WHERE (
      payment_reference IS NOT NULL
      AND char_length(upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g'))) >= 6
      AND v_normalized_content LIKE '%' || upper(regexp_replace(payment_reference, '[^a-zA-Z0-9]', '', 'g')) || '%'
    ) OR (
      order_code IS NOT NULL
      AND char_length(upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g'))) >= 6
      AND v_normalized_content LIKE '%' || upper(regexp_replace(order_code, '[^a-zA-Z0-9]', '', 'g')) || '%'
    )
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_target_order.id IS NULL THEN
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

  IF v_target_order.price <= 0 OR NOT v_target_order.quote_accepted THEN
    RETURN jsonb_build_object('success', false, 'error', 'QUOTE_NOT_ACCEPTED', 'order_id', v_target_order.id);
  END IF;

  IF p_amount > v_target_order.price - v_target_order.paid_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'AMOUNT_MISMATCH', 'order_id', v_target_order.id);
  END IF;

  IF p_amount < v_target_order.price - v_target_order.paid_amount THEN
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
      'expected_amount', v_target_order.price - v_target_order.paid_amount,
      'received_amount', p_amount,
      'message', 'Số tiền chuyển khoản không đủ theo yêu cầu đơn hàng'
    );
  END IF;

  IF v_target_order.expires_at IS NOT NULL AND v_target_order.expires_at < now() THEN
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

  -- Confirm order payment atomically
  UPDATE public.orders SET
    paid_amount = v_target_order.paid_amount + p_amount,
    payment_status = 'PAID',
    payment_method = 'bank_transfer',
    status = CASE WHEN kind = 'deposit' THEN 'hoan_thanh' ELSE status END,
    paid_at = now(),
    version = version + 1,
    updated_at = now()
  WHERE id = v_target_order.id;

  -- If deposit order, atomically credit user wallet
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

-- 3. PostgREST service_role wrapper (records webhook event atomically)
CREATE OR REPLACE FUNCTION public.confirm_payment_transaction(
  p_provider text,
  p_provider_txn_id text,
  p_bank_code text,
  p_bank_account text,
  p_amount bigint,
  p_transfer_content text,
  p_raw_payload jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  result jsonb;
BEGIN
  IF p_provider IS DISTINCT FROM 'sepay'
     OR lower(btrim(coalesce(p_raw_payload->>'transferType', ''))) <> 'in'
     OR btrim(coalesce(p_bank_account, '')) IS DISTINCT FROM '79202012546'
     OR lower(btrim(coalesce(p_bank_code, ''))) NOT IN ('sacombank', 'stb', 'sacom', '970403')
     OR p_provider_txn_id IS NULL OR btrim(p_provider_txn_id) = ''
     OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid incoming bank transaction' USING ERRCODE = '22023';
  END IF;

  result := namcumz_private.confirm_payment_transaction(
    p_provider, p_provider_txn_id, p_bank_code, p_bank_account,
    p_amount, p_transfer_content, p_raw_payload
  );

  INSERT INTO namcumz_private.payment_webhook_events(
    provider, event_id, payload, signature_valid, processed, processed_at, error_message
  )
  VALUES (
    p_provider, p_provider_txn_id, jsonb_build_object('amount', p_amount),
    true, coalesce((result->>'success')::boolean, false), now(), result->>'error'
  )
  ON CONFLICT (event_id) DO NOTHING;

  RETURN result;
END $fn$;

REVOKE ALL ON FUNCTION public.confirm_payment_transaction(text, text, text, text, bigint, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA namcumz_private TO service_role;
GRANT EXECUTE ON FUNCTION namcumz_private.confirm_payment_transaction(text, text, text, text, bigint, text, jsonb) TO service_role;
GRANT INSERT, SELECT(event_id) ON namcumz_private.payment_webhook_events TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_payment_transaction(text, text, text, text, bigint, text, jsonb) TO service_role;

-- 4. Record migration (keep public.app_contract_version() unchanged for zero-downtime rollout)
INSERT INTO namcumz_private.migrations(version)
VALUES ('production_013_sepay_sacombank')
ON CONFLICT (version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
COMMIT;
