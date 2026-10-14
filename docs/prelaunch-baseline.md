# Prelaunch baseline — 14/10/2026

Recorded before implementation changes. Baseline source commit `8b71a27`, clean working tree, package `0.2.0`.

| Check | Result | Evidence/limit |
|---|---|---|
| All existing CJS + MJS tests | PASS 81/81 | `node --experimental-vm-modules --test _tools/*.test.mjs _tools/*.test.cjs`; default npm test omits CJS |
| Static checks | PASS 75/75 | `_tools/check.cjs`; syntax and selected assertions only |
| Lint | NOT VERIFIED | No lint script/config supplied |
| Production build | PASS 187 files | `_tools/build.cjs` |
| Whitespace | PASS | `git diff --check` |
| First sandbox attempts | BLOCKED | EPERM on logs/build; no test assertion result; successful rerun with appropriate permissions |
| Production app | Opened | Home, login, topup, guest dashboard/admin/profile |
| Console | No captured errors/warnings in sampled pages | Does not prove all async/role flows |
| Network | Sampled | Browser response events and read-only GET probes; no authenticated write traffic |
| robots / sitemap | PASS HTTP 200 | Content/indexing completeness not fully audited |
| Security headers | Partial | nosniff, SAMEORIGIN present; CSP absent |
| DB contract | Observed | `production_002_credentials_encryption`; ledger detailed in launch-status |

Screenshots are stored in ignored `_backup/launch-20261014/screenshots/`: home, login, topup, dashboard-guest, admin-guest, profile-guest. Guest dashboard redirected to profile#orders, guest admin to home. They do not verify customer/booster/admin functionality. The later checkout-failclosed screenshot documents the local fix and is not pre-change evidence.

Live anonymous SELECT probes returned 401 / SQLSTATE42501 for orders, messages, logs, tickets, roles, notifications, credentials, wallets, wallet transactions, check-ins, game accounts and payment transactions. Initial probes for credentials/wallets used the wrong identity column and returned42703; these were NOT counted as passing. Correct-column followups returned401. Catalog intentionally returned200.

GET get_order_payment_info for a nil identifier returned200. This confirms anonymous RPC exposure, not a retrieval of a real customer order. Local regression reproduces private-data leakage with synthetic orders before009, and denial after009.

Production READ ONLY metadata: ciphertext text NOT NULL, plaintext account_password column absent, credential_direct_read=false, credential helper/RPC present, private storage bucket=true; 32 application SECURITY DEFINER functions all have empty search_path. None of this establishes runtime encryption or full authorization/E2E.

Post-change results and exact limitations are in launch-status and final-launch-report. No production migration, payment, role grant, password change or customer-order mutation was performed.
