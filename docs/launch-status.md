# Launch status — NAMCUMZ

Updated: 14/10/2026, Asia/Bangkok. Verdict: **NOT READY**. Security gate is not passed; phase 2 remains active.

## Scope freeze

No redesign, new games/features, decorative animations or additional footage. Work is limited to launch blockers, security, correctness, core UX, performance, trust, monitoring and operations. This launch plan supersedes earlier partial-release conclusions. Waived checks remain waived / not verified and cannot satisfy the new release gates.

## Version and environment

- Baseline source: `8b71a27`, package/frontend version `0.2.0`; local launch changes are uncommitted.
- Production: https://namcumz.io.vn; Supabase `vqnuutdmcekqkbdvawlw`.
- Live contract observed through GET and READ ONLY SQL: `production_002_credentials_encryption`.
- Actual ledger: `production_000_p0_containment`, `production_001_release`, `production_002_credentials_encryption`, `production_006_vietqr_payment`, `staging_006_user_member_center`.
- Mixed staging marker on production is documented drift; no historical marker is rewritten.
- Proposed local DB/frontend contract: `production_009_launch_access`; migration NOT APPLIED, frontend NOT DEPLOYED.
- Staging `cnawquqkeogzmvucmjes`: role matrix/order workflows waived / not verified. No new roles/accounts provisioned.

## Evidence and known blockers

1. Live anonymous payment-read RPC remains executable. Source permits cross-user reads of order content. Local ownership/grant patch is tested; live remediation NOT VERIFIED.
2. Production lacks public payment settlement RPC used by webhook backend. Wallet/bank partial-payment, quote and expiry defects are patched locally; real provider settlement NOT VERIFIED.
3. Checkout formerly manufactured an 85,000 VND demo order/QR when backend lookup failed. Corrected locally, with failure-path browser and regression evidence. Production still needs matching release.
4. Credential encryption schema and direct-read revocation observed live; runtime crypto, access audit, expiry/deletion, log/backup confidentiality are NOT VERIFIED. Source credential read RPC has no access audit or lifecycle enforcement. Password-based services cannot pass release gate.
5. Full actor authorization, recovery/OAuth, Storage/Realtime and core E2E remain NOT VERIFIED. Prior waived staging checks are not PASS.
6. Backup/restore not proved; free-plan upgrade remains declined. Local source snapshots are not DB backups.
7. Monitoring/alert delivery, support operational rehearsal, mobile matrix and Core Web Vitals are NOT VERIFIED.
8. Remaining integrity concern: deposit creation has no caller request ID across uncertain retries. This needs an idempotent DB/frontend contract before launch.

## Local verification

Baseline: 81 tests, 75 static checks, build 187 files. Final regression: 87 tests passed; static checks 76 passed; build 188 files. Logs in ignored `_backup/launch-20261014/`. No standalone lint configuration exists; static syntax checks are not described as ESLint.

## Phase tracker

| Phase | State |
|---|---|
| 0 Freeze | Applied |
| 1 Baseline | Recorded; privileged role screenshots and lint unavailable/not configured |
| 2 Security | Active; gate FAIL due live/unverified P1 blockers |
| 3–14 Contracts/auth/credentials/payment/E2E/QA/operations | Scoped findings and preparatory docs only; no gate passed |
| 15 Independent audit | Two scoped reviews found additional defects; fixes and regressions recorded; full live audit NOT VERIFIED |
| 16–18 Soft launch and public readiness | NOT STARTED |
| 19–23 Public deploy/live stability | NOT STARTED |

## Exact next action

Finish deposit retry idempotency and credential access/retention controls locally. Before production migration, establish an authorized logical database export and an isolated restore target without upgrading the paid plan; prove restore integrity and credential-key recoverability. Then run 001/002 verification, apply 009, run 009 verification, confirm contract009, and only then deploy matching frontend/backend. Do not deploy this local frontend while live DB is contract002.
