# Frontend / database contracts

Inventory from current frontend and migration source; production signatures/grants partly observed in security-definers. Return/effects need live role E2E before acceptance. Writes do not fall back to direct order table mutations. Intentional direct owner profile/address-book operations are distinct contracts.

| Frontend action | RPC/API | Parameters | Required actor | Return | Effects |
|---|---|---|---|---|---|
| Version probe | app_contract_version | none | public | version text | none |
| Create boost/UID order | create_order | p_request,p_content,p_server,p_package?,p_uid? | active customer | orders row | server owner/status/price, log |
| Create login topup | create_topup_order | request,package,server,method,account,password,phone,notes | active customer | orders row | package price snapshot + encrypted credential |
| Workflow/quote/approve/payment/claim/progress/accept/cancel/review | order_action | order,version,action,data,request | ownership + action role | orders row | row lock, receipt, version/log/notifications |
| Queue | claim_queue | none | booster/admin | safe queue rows | none |
| Legacy ownership claim | claim_order_by_secret | secret code | authenticated | boolean | consume code/set owner |
| Order chat | send_order_message | order,request,message,attachment? | order participant/admin | message row | identity from server, receipt |
| Create ticket | create_ticket | request,order,issue,description | order owner | ticket row | support ticket |
| Respond ticket | respond_ticket | id,status,response | admin | void | response/status/notification |
| View credential | get_order_credentials | order_id | owner/assigned booster/admin | credential row | decrypt; access audit/lifecycle missing |
| Role admin | set_user_role | target,role,active,reason | super_admin | void | role/log; protects last superadmin |
| Catalog admin | save_package | id,game,name,price,active | admin | UUID | package change |
| Public boosters | booster_profiles / booster_profile / booster_reviews | none / id / booster_id | public | projected rows | none |
| Payment details | get_order_payment_info | order_identifier | proposed009: owner/admin | JSON | none; legacy006 was public and updated expiry |
| Wallet pay | pay_order_by_wallet | order_id | owner/admin | success + paid amount | proposed009: debit outstanding, reject deposit/expired/unapproved |
| Payment cancel | cancel_order_payment | order_id | owner/admin | success JSON | cancel unpaid order; legacy constraint/retry behavior needs audit |
| Deposit | create_deposit_order | amount | active customer | id/code/ref/amount/expiry | creates order; retry idempotency not implemented |
| Daily checkin | claim_daily_checkin | none | active user | success/already_checked_in JSON | unique reward/day, wallet txn |
| Profile summary | get_user_profile_summary | none | active user | JSON | none |
| Profile update | user_roles column UPDATE | display_name,bio,avatar_url | own user | mutation result | RLS + column grant; no role update |
| Address book | user_game_accounts CRUD | own user_id,game,uid,server,nickname,notes | owner | rows/result | RLS owner |
| Mark notification read | notifications UPDATE | read_at + own user | owner | mutation result | RLS + column grant |
| File upload/read | Storage order-files | order/user/UUID path | authorized participant | storage result/signed URL | private attachment |
| Payment backend | POST /api/payment/webhook → confirm_payment_transaction | provider/id/bank/amount/memo/raw payload | verified provider + service_role | success/error JSON | proposed009 atomic settle + sanitized audit |
| Authenticated status | GET /api/orders/status | identifier + Bearer JWT | authenticated owner/admin | safe JSON | no-store; JWT forwarded to RLS/RPC |
| Internal AI | POST /api/ai/copilot | orderId + Bearer JWT | admin | text | third-party processing; requires separate data disclosure audit |
| Public AI | POST /api/ai/chat | consent/messages | recent signed consent | text/error | Google request; not an order/payment authority |

Auth: Supabase signup/password login/signout/OAuth; recovery/callback flow must be traced and tested separately. Credentials must never enter logs, localStorage, AI prompts or attachments. Supabase Auth token storage is distinct from game credential storage.

009 is not applied. Live DB lacks the public settlement wrapper. Full frontend/staging/production schema parity, every table policy, triggers and return shape remain NOT VERIFIED. The readonly inspection SQL now includes public/private/auth/storage function metadata. 009 verifier checks selected required signatures, grants, RLS, ownership policy, crypto metadata and contract marker; it is not a full schema checksum or runtime role test.
