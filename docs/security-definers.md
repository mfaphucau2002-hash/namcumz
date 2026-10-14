# Production SECURITY DEFINER inventory

Observed 2026-10-14 via READ ONLY SQL on vqnuutdmcekqkbdvawlw. No customer rows or secrets selected. These are application schemas public and namcumz_private; system/provider functions outside these schemas have not been audited.

32 application SECURITY DEFINER functions. All observed search_path settings are empty. These metadata checks do not establish authorization correctness.

| Schema | Function | Arguments | anon EXECUTE | authenticated EXECUTE | search_path |
|---|---|---|---|---|---|
| namcumz_private | can_read_order | target_order uuid | false | true | search_path="" |
| namcumz_private | confirm_payment_transaction | p_provider text, p_provider_txn_id text, p_bank_code text, p_bank_account text, p_amount bigint, p_transfer_content text, p_raw_payload jsonb | false | false | search_path="" |
| namcumz_private | credential_key | () | false | false | search_path="" |
| namcumz_private | generate_payment_reference | () | false | false | search_path="" |
| namcumz_private | is_admin | () | true | true | search_path="" |
| namcumz_private | log_order_created | () | false | false | search_path="" |
| namcumz_private | on_signup | () | false | false | search_path="" |
| namcumz_private | prepare_message | () | false | false | search_path="" |
| namcumz_private | prepare_order | () | false | false | search_path="" |
| namcumz_private | rate_limit | k text, maximum integer, seconds integer | false | false | search_path="" |
| namcumz_private | require_user | () | false | false | search_path="" |
| public | auth_username_email | p_username text, p_bucket text | false | false | search_path="" |
| public | booster_profile | p_id uuid | true | true | search_path="" |
| public | booster_profiles | () | true | true | search_path="" |
| public | booster_reviews | p_booster_id uuid | true | true | search_path="" |
| public | cancel_order_payment | p_order_id uuid | false | true | search_path="" |
| public | claim_daily_checkin | () | false | true | search_path="" |
| public | claim_order_by_secret | p_secret_code text | false | true | search_path="" |
| public | claim_queue | () | false | true | search_path="" |
| public | create_deposit_order | p_amount bigint | false | true | search_path="" |
| public | create_order | p_request uuid, p_content text, p_server text, p_package uuid, p_uid text | false | true | search_path="" |
| public | create_ticket | p_request uuid, p_order uuid, p_issue text, p_description text | false | true | search_path="" |
| public | create_topup_order | p_request uuid, p_package uuid, p_server text, p_login_method text, p_account text, p_password text, p_phone text, p_notes text | false | true | search_path="" |
| public | get_order_credentials | p_order_id uuid | false | true | search_path="" |
| public | get_order_payment_info | p_order_identifier text | true | true | search_path="" |
| public | get_user_profile_summary | () | false | true | search_path="" |
| public | order_action | p_order uuid, p_version integer, p_action text, p_data jsonb, p_request uuid | false | true | search_path="" |
| public | pay_order_by_wallet | p_order_id uuid | false | true | search_path="" |
| public | respond_ticket | p_id uuid, p_status text, p_response text | false | true | search_path="" |
| public | save_package | p_id uuid, p_game text, p_name text, p_price bigint, p_active boolean | false | true | search_path="" |
| public | send_order_message | p_order uuid, p_request uuid, p_message text, p_attachment text | false | true | search_path="" |
| public | set_user_role | p_target uuid, p_role text, p_active boolean, p_reason text | false | true | search_path="" |

Findings: public.get_order_payment_info is anonymously executable; source exposes order content without rejecting unrelated actors. Public booster RPCs and private is_admin are intentional anonymous helpers. Credential key helper is not client-executable. Storage order-files is private. Full function-body equality, role/ownership behavior, dynamic SQL and runtime actor matrix remain NOT VERIFIED on production.
