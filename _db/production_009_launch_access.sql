-- Additive access patch. Requires 001, 006 and 007; backup/restore gate before production.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version='production_002_credentials_encryption') THEN RAISE EXCEPTION 'Encryption migration 002 required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM namcumz_private.migrations WHERE version IN ('production_007_user_member_center','staging_006_user_member_center')) THEN RAISE EXCEPTION 'Member/payment foundation required'; END IF;
 IF to_regprocedure('public.get_user_profile_summary()') IS NULL OR to_regprocedure('public.create_deposit_order(bigint)') IS NULL OR NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_wallets' AND column_name='checkin_balance' AND data_type='bigint') THEN RAISE EXCEPTION 'Member schema does not match supported foundation'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_credentials' AND column_name='account_password') THEN RAISE EXCEPTION 'Plaintext credentials remain'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_credentials' AND column_name='account_password_ciphertext' AND is_nullable='NO') THEN RAISE EXCEPTION 'Ciphertext column required'; END IF;
 IF has_any_column_privilege('authenticated','public.order_credentials','SELECT') OR has_any_column_privilege('anon','public.order_credentials','SELECT') THEN RAISE EXCEPTION 'Direct credential reads remain'; END IF;
 IF to_regprocedure('public.get_order_credentials(uuid)') IS NULL OR to_regprocedure('namcumz_private.credential_key()') IS NULL THEN RAISE EXCEPTION 'Credential RPC/helper missing'; END IF;
END $preflight$;
CREATE OR REPLACE FUNCTION public.get_order_payment_info(p_order_identifier text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_order public.orders;
  v_is_owner boolean := false;
  v_uid uuid := namcumz_private.require_user();
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

  IF v_order.user_id IS DISTINCT FROM v_uid AND NOT namcumz_private.is_admin() THEN
    RAISE EXCEPTION 'Order access denied' USING ERRCODE = '42501';
  END IF;
  v_is_owner := true;

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
    'payment_status', CASE WHEN v_order.payment_status = 'PENDING' AND v_order.expires_at < now() THEN 'EXPIRED' ELSE v_order.payment_status END,
    'payment_method', v_order.payment_method,
    'status', v_order.status,
    'cancelled', v_order.cancelled,
    'expires_at', v_order.expires_at,
    'paid_at', v_order.paid_at,
    'created_at', v_order.created_at,
    'is_owner', v_is_owner
  );
END $fn$;

REVOKE ALL ON FUNCTION public.get_order_payment_info(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_payment_info(text) TO authenticated;


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
 IF p_provider IS DISTINCT FROM 'sepay' OR coalesce(p_raw_payload->>'transferType','') <> 'in' OR p_bank_account IS DISTINCT FROM '0763550673' OR lower(coalesce(p_bank_code,'')) NOT IN ('mb','mbbank','militarybank') OR p_provider_txn_id IS NULL OR btrim(p_provider_txn_id)='' OR p_amount IS NULL OR p_amount<=0 THEN
  RAISE EXCEPTION 'Invalid incoming bank transaction' USING ERRCODE='22023';
 END IF;
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

  IF v_target_order.price <= 0 OR NOT v_target_order.quote_accepted THEN
    RETURN jsonb_build_object('success',false,'error','QUOTE_NOT_ACCEPTED','order_id',v_target_order.id);
  END IF;
  IF p_amount > v_target_order.price - v_target_order.paid_amount THEN
    RETURN jsonb_build_object('success',false,'error','AMOUNT_MISMATCH','order_id',v_target_order.id);
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

  -- CONFIRM ORDER PAYMENT
  UPDATE public.orders SET
    paid_amount = v_target_order.paid_amount + p_amount,
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


CREATE OR REPLACE FUNCTION public.pay_order_by_wallet(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_uid uuid := namcumz_private.require_user();
  v_order public.orders;
  v_wallet public.user_wallets;
  v_new_balance bigint;
  v_due bigint;
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

  IF v_order.kind = 'deposit' THEN RAISE EXCEPTION 'Deposit orders cannot be paid from wallet'; END IF;
  IF NOT v_order.quote_accepted THEN RAISE EXCEPTION 'Quote is not accepted'; END IF;
  IF v_order.expires_at IS NOT NULL AND v_order.expires_at < now() THEN RAISE EXCEPTION 'Order payment expired'; END IF;
  v_due := v_order.price - v_order.paid_amount;
  IF v_due <= 0 THEN RAISE EXCEPTION 'No outstanding amount'; END IF;
  IF v_order.price <= 0 THEN
    RAISE EXCEPTION 'Đơn hàng chưa có báo giá hoặc không yêu cầu thanh toán';
  END IF;

  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_due THEN
    RAISE EXCEPTION 'Số dư ví không đủ để thanh toán (Hiện có: % VND, Cần: % VND)', 
      coalesce(v_wallet.balance, 0), v_due USING ERRCODE = 'P0001';
  END IF;

  v_new_balance := v_wallet.balance - v_due;
  UPDATE public.user_wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = v_uid;

  INSERT INTO public.wallet_transactions(user_id, order_id, amount, type, balance_after, description)
  VALUES (
    v_uid, v_order.id, -v_due, 'payment', v_new_balance, 
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
  VALUES (v_order.id, v_uid, 'payment_wallet: ' || v_due::text || ' VND qua số dư ví');

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


CREATE OR REPLACE FUNCTION public.order_action(
  p_order uuid,
  p_version integer,
  p_action text,
  p_data jsonb,
  p_request uuid
) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  uid uuid := namcumz_private.require_user();
  o public.orders;
  role_name text;
  admin_ok boolean := namcumz_private.is_admin();
  receipt namcumz_private.receipts;
  fp jsonb := jsonb_build_object('order', p_order, 'version', p_version, 'action', p_action, 'data', p_data);
  amount bigint;
  needed bigint;
  why text := trim(coalesce(p_data->>'reason', ''));
  target uuid;
BEGIN
  IF p_order IS NULL OR p_version IS NULL OR p_version < 1 OR p_action IS NULL OR p_request IS NULL OR p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Yêu cầu không hợp lệ';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text, 0));
  SELECT * INTO receipt FROM namcumz_private.receipts WHERE actor = uid AND request_id = p_request;
  IF FOUND THEN
    IF receipt.operation <> 'order' OR receipt.fingerprint <> fp THEN RAISE EXCEPTION 'Mã yêu cầu trùng'; END IF;
    RETURN jsonb_populate_record(NULL::public.orders, receipt.result);
  END IF;
  SELECT role INTO role_name FROM public.user_roles WHERE id = uid;
  SELECT * INTO o FROM public.orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đơn'; END IF;
  IF NOT admin_ok AND o.user_id <> uid AND o.booster_id IS DISTINCT FROM uid AND p_action <> 'claim' THEN
    RAISE EXCEPTION 'Không có quyền thao tác đơn này' USING ERRCODE = '42501';
  END IF;
  IF o.version <> p_version THEN RAISE EXCEPTION 'Đơn đã thay đổi. Tải lại trước khi thao tác'; END IF;
  IF o.cancelled THEN RAISE EXCEPTION 'Đơn đã hủy'; END IF;

  CASE p_action
  WHEN 'quote' THEN
    IF NOT admin_ok OR o.status <> 'cho_xu_ly' OR o.paid_amount > 0 OR o.kind <> 'boost' THEN RAISE EXCEPTION 'Không thể báo giá đơn này'; END IF;
    amount := (p_data->>'price')::bigint; needed := (p_data->>'required_amount')::bigint;
    IF amount IS NULL OR needed IS NULL OR amount <= 0 OR amount > 1000000000 OR needed <= 0 OR needed > amount OR why = '' THEN
      RAISE EXCEPTION 'Giá, số tiền cần thu và lý do không hợp lệ';
    END IF;
    o.price := amount; o.required_amount := needed; o.quote_accepted := false;
  WHEN 'approve_quote' THEN
    IF o.user_id <> uid OR o.price <= 0 OR o.status <> 'cho_xu_ly' THEN RAISE EXCEPTION 'Không thể chấp thuận giá'; END IF;
    IF o.quote_accepted THEN RAISE EXCEPTION 'Quote already accepted'; END IF;
    o.quote_accepted := true; o.expires_at := now()+interval '15 minutes'; o.payment_status := 'PENDING';
  WHEN 'payment' THEN
    IF NOT admin_ok OR NOT o.quote_accepted OR o.status <> 'cho_xu_ly' THEN RAISE EXCEPTION 'Chưa đủ điều kiện xác nhận tiền'; END IF;
    amount := (p_data->>'amount')::bigint;
    IF amount IS NULL OR amount <= 0 OR o.paid_amount + amount > o.price OR why = '' THEN
      RAISE EXCEPTION 'Số tiền hoặc tham chiếu không hợp lệ';
    END IF;
    o.paid_amount := o.paid_amount + amount;
  WHEN 'claim' THEN
    IF role_name <> 'booster' OR o.booster_id IS NOT NULL OR o.status <> 'cho_xu_ly' OR NOT o.quote_accepted
       OR o.required_amount <= 0 OR o.paid_amount < o.required_amount THEN
      RAISE EXCEPTION 'Đơn chưa đủ điều kiện hoặc đã có người nhận';
    END IF;
    o.booster_id := uid; o.status := 'dang_cay';
    SELECT coalesce(nullif(display_name, ''), username) INTO o.booster_name FROM public.user_roles WHERE id = uid;
  WHEN 'assign' THEN
    target := (p_data->>'booster_id')::uuid;
    IF NOT admin_ok OR o.status NOT IN ('cho_xu_ly', 'dang_cay', 'tam_dung') OR NOT o.quote_accepted
       OR o.required_amount <= 0 OR o.paid_amount < o.required_amount OR why = '' THEN
      RAISE EXCEPTION 'Chưa đủ điều kiện giao đơn';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE id = target AND role = 'booster' AND active) THEN
      RAISE EXCEPTION 'Booster không hợp lệ';
    END IF;
    o.booster_id := target; o.status := 'dang_cay';
    SELECT coalesce(nullif(display_name, ''), username) INTO o.booster_name FROM public.user_roles WHERE id = target;
  WHEN 'progress' THEN
    IF NOT admin_ok AND o.booster_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Không có quyền cập nhật tiến độ'; END IF;
    IF o.status <> 'dang_cay' THEN RAISE EXCEPTION 'Đơn chưa đang thực hiện'; END IF;
    amount := (p_data->>'progress')::integer;
    IF amount IS NULL OR amount < 0 OR amount > 99 OR why = '' THEN RAISE EXCEPTION 'Tiến độ 0-99 và ghi chú là bắt buộc'; END IF;
    o.progress := amount;
  WHEN 'submit' THEN
    IF (NOT admin_ok AND o.booster_id IS DISTINCT FROM uid) OR o.status <> 'dang_cay' OR why = '' THEN
      RAISE EXCEPTION 'Không thể gửi nghiệm thu';
    END IF;
    o.status := 'cho_nghiem_thu'; o.result_note := left(why, 5000);
  WHEN 'complete' THEN
    IF o.user_id <> uid OR o.status <> 'cho_nghiem_thu' THEN RAISE EXCEPTION 'Chỉ chủ đơn được nghiệm thu kết quả'; END IF;
    o.status := 'hoan_thanh'; o.progress := 100;
    UPDATE public.user_roles SET orders_completed = orders_completed + 1 WHERE id = o.booster_id;
  WHEN 'rework' THEN
    IF o.user_id <> uid OR o.status <> 'cho_nghiem_thu' OR why = '' THEN RAISE EXCEPTION 'Không thể yêu cầu làm lại'; END IF;
    o.status := 'dang_cay';
  WHEN 'pause' THEN
    IF (NOT admin_ok AND o.booster_id IS DISTINCT FROM uid) OR o.status <> 'dang_cay' OR why = '' THEN
      RAISE EXCEPTION 'Không thể tạm dừng';
    END IF;
    o.status := 'tam_dung';
  WHEN 'resume' THEN
    IF NOT admin_ok OR o.status <> 'tam_dung' OR o.booster_id IS NULL OR why = '' THEN RAISE EXCEPTION 'Admin cần xác nhận tiếp tục'; END IF;
    o.status := 'dang_cay';
  WHEN 'cancel' THEN
    IF NOT admin_ok OR o.paid_amount > 0 OR o.status <> 'cho_xu_ly' OR why = '' THEN
      RAISE EXCEPTION 'Chỉ hủy đơn chưa nhận tiền; trường hợp khác cần đối soát hỗ trợ';
    END IF;
    o.cancelled := true;
  WHEN 'review' THEN
    amount := (p_data->>'rating')::integer;
    IF o.user_id <> uid OR o.status <> 'hoan_thanh' OR o.rating IS NOT NULL OR amount IS NULL OR amount NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'Không thể đánh giá';
    END IF;
    o.rating := amount; o.review_comment := left(coalesce(p_data->>'comment', ''), 2000);
  ELSE
    RAISE EXCEPTION 'Thao tác không hỗ trợ';
  END CASE;

  UPDATE public.orders SET
    price = o.price, required_amount = o.required_amount, paid_amount = o.paid_amount,
    expires_at = o.expires_at, payment_status = o.payment_status, quote_accepted = o.quote_accepted, booster_id = o.booster_id, booster_name = o.booster_name, status = o.status,
    progress = o.progress, result_note = o.result_note, cancelled = o.cancelled, rating = o.rating, review_comment = o.review_comment,
    version = version + 1, updated_at = now()
  WHERE id = o.id RETURNING * INTO o;

  INSERT INTO public.order_logs(order_id, user_id, action) VALUES(
    o.id, uid, p_action || ': ' || left(CASE
      WHEN p_action = 'payment' THEN amount::text || ' VND; ' || why
      WHEN p_action = 'quote' THEN o.price::text || ' VND; minimum ' || o.required_amount::text || '; ' || why
      ELSE why END, 2000)
  );

  INSERT INTO public.notifications(user_id, order_id, title, content)
  SELECT target_user, o.id, 'Cập nhật đơn hàng', p_action
  FROM (SELECT o.user_id AS target_user UNION SELECT o.booster_id) a
  WHERE target_user IS NOT NULL AND target_user <> uid;

  INSERT INTO namcumz_private.receipts(actor, request_id, operation, fingerprint, result)
  VALUES(uid, p_request, 'order', fp, to_jsonb(o));

  RETURN o;
END $fn$;

-- 4.4 Claim queue for boosters

-- Only the authenticated payment backend may settle bank transactions.
CREATE OR REPLACE FUNCTION public.confirm_payment_transaction(
 p_provider text, p_provider_txn_id text, p_bank_code text, p_bank_account text,
 p_amount bigint, p_transfer_content text, p_raw_payload jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE result jsonb;
BEGIN
 IF p_provider IS DISTINCT FROM 'sepay' OR coalesce(p_raw_payload->>'transferType','') <> 'in' OR p_bank_account IS DISTINCT FROM '0763550673' OR lower(coalesce(p_bank_code,'')) NOT IN ('mb','mbbank','militarybank') OR p_provider_txn_id IS NULL OR btrim(p_provider_txn_id)='' OR p_amount IS NULL OR p_amount<=0 THEN
  RAISE EXCEPTION 'Invalid incoming bank transaction' USING ERRCODE='22023';
 END IF;
 result := namcumz_private.confirm_payment_transaction(p_provider,p_provider_txn_id,p_bank_code,p_bank_account,p_amount,p_transfer_content,p_raw_payload);
 INSERT INTO namcumz_private.payment_webhook_events(provider,event_id,payload,signature_valid,processed,processed_at,error_message)
 VALUES(p_provider,p_provider_txn_id,jsonb_build_object('amount',p_amount),true,coalesce((result->>'success')::boolean,false),now(),result->>'error')
 ON CONFLICT(event_id) DO NOTHING;
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION public.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA namcumz_private TO service_role;
GRANT EXECUTE ON FUNCTION namcumz_private.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb) TO service_role;
GRANT INSERT, SELECT(event_id) ON namcumz_private.payment_webhook_events TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_payment_transaction(text,text,text,text,bigint,text,jsonb) TO service_role;

-- Stable request identity survives double-clicks and uncertain network retries.
CREATE OR REPLACE FUNCTION public.create_deposit_order(p_amount bigint,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE uid uuid := namcumz_private.require_user(); o public.orders;
BEGIN
 IF p_request IS NULL OR p_amount IS NULL OR p_amount < 10000 OR p_amount > 50000000 THEN RAISE EXCEPTION 'Invalid deposit amount or request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text || p_request::text,0));
 SELECT * INTO o FROM public.orders WHERE user_id=uid AND request_id=p_request;
 IF FOUND THEN
  IF o.kind <> 'deposit' OR o.price <> p_amount THEN RAISE EXCEPTION 'Deposit retry does not match original request'; END IF;
 ELSE
  PERFORM namcumz_private.rate_limit('deposit:'||uid::text,10,3600);
  INSERT INTO public.orders(content,game_server,request_id,kind)
  VALUES('Nạp '||p_amount::text||' VNĐ vào ví Namcumz','Asia',p_request,'deposit') RETURNING * INTO o;
  UPDATE public.orders SET price=p_amount,required_amount=p_amount,quote_accepted=true WHERE id=o.id RETURNING * INTO o;
 END IF;
 RETURN jsonb_build_object('id',o.id,'order_code',o.order_code,'payment_reference',o.payment_reference,'amount',o.price,'expires_at',o.expires_at);
END $fn$;
REVOKE ALL ON FUNCTION public.create_deposit_order(bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_deposit_order(bigint,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.create_deposit_order(bigint) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.app_contract_version()
RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $fn$ SELECT 'production_009_launch_access'::text $fn$;
REVOKE ALL ON FUNCTION public.app_contract_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_contract_version() TO anon, authenticated;
INSERT INTO namcumz_private.migrations(version) VALUES('production_009_launch_access') ON CONFLICT(version) DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
