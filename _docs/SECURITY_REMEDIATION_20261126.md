# Runbook Vận Hành & Xác Minh Bảo Mật — Namcumz (26/11/2026)

Tài liệu hướng dẫn thao tác vận hành (manual ops) cho các hạng mục **R1, R2, R8** và ghi nhận đánh giá kỹ thuật cho **R6, R7** trên môi trường production `namcumz.io.vn` (Supabase project `vqnuutdmcekqkbdvawlw`).

> **Nguyên tắc an toàn:** Không thay đổi schema phá vỡ đăng nhập hiện tại; không lưu secret/API key vào Git hoặc mã nguồn frontend; kiểm chứng lại sau mỗi thay đổi trên Dashboard/DNS.

---

## 1. R1 & R2 — Cứng hóa Supabase Auth (KHÔNG phá đăng nhập bằng username)

### 1.1. Cảnh báo bắt buộc trước khi thao tác

> **TUYỆT ĐỐI KHÔNG BẬT "Confirm email" và KHÔNG đặt `email_confirmed_at = NULL` cho các tài khoản `@namcumz.com` khi hệ thống vẫn dùng tên đăng nhập (username).**

Lý do đã xác minh từ codebase:
- Theo quyết định Q02 (`_docs/IMPLEMENTATION_PROGRESS.md`, dòng 86), hệ thống giữ đăng nhập bằng **username** cho cả tài khoản cũ và mới, không chuyển sang email thật.
- Frontend tự ghép email nội bộ `<username>@namcumz.com` qua `createInternalIdentity()` (`assets/js/authIdentity.js`, dòng 17–20) và gọi `signInWithPassword` / `signUp` tại `assets/js/app.js` (dòng 1880, 1943–1944). Địa chỉ `@namcumz.com` là định danh nội bộ, khách hàng không có hộp thư để bấm link xác minh.
- Nếu bật **Confirm email** trên Supabase Auth, `signUp()` sẽ không trả về `data.session` (`assets/js/app.js`, dòng 1956–1961), khiến toàn bộ khách mới không thể đăng nhập; nếu xóa `email_confirmed_at` của tài khoản cũ thì toàn bộ khách hiện tại cũng bị khóa.
- **Đánh giá rủi ro ví điểm danh:** Hàm `public.claim_daily_checkin()` (`_db/production_007_user_member_center.sql`, dòng 142–187) chỉ cộng `+500 VNĐ/ngày` vào cột `user_wallets.checkin_balance`. Trong khi đó, hàm thanh toán `public.pay_order_by_wallet(uuid)` (`_db/production_009_launch_access.sql`, dòng 342–349) **chỉ kiểm tra và trừ từ cột `user_wallets.balance` (KHÔNG trừ `checkin_balance`)**. Vì vậy, spam tạo tài khoản để điểm danh không thể dùng trực tiếp để thanh toán đơn hàng; mục tiêu ưu tiên của R1/R2 là chống spam rác DB và chống brute-force bằng Rate Limits, Password Policy và Captcha (Phase 2).

---

### 1.2. Cấu hình Rate Limits & Password Policy trên Supabase Dashboard (Làm ngay — $0)

Thực hiện trên **Supabase Dashboard** → Chọn đúng project production (`vqnuutdmcekqkbdvawlw`, tránh nhầm `namcumz-staging`):

#### A. Siết Password Policy (Server-side)
Hiện tại `login.html` (dòng 789–812) đã kiểm tra tối thiểu 8 ký tự + chữ cái + chữ số ở trình duyệt, nhưng kẻ tấn công gọi thẳng `/auth/v1/signup` có thể bỏ qua bước này. Cần bật tương đương trên server:
1. Vào **Authentication** → **Providers** → **Email** (hoặc **Authentication** → **Sign In / Providers** → **Email**, tùy phiên bản giao diện Dashboard).
2. Xác nhận **Confirm email** đang ở trạng thái **TẮT (OFF)** (xem cảnh báo mục 1.1).
3. Kéo xuống mục **Password Requirements** (hoặc **Authentication** → **Configuration** → **Password Security**):
   - **Minimum password length**: đặt `8`.
   - **Password Requirements**: chọn **Letters and digits** (yêu cầu có cả chữ cái và chữ số — khớp 100% với validation hiện có ở `login.html`).
   - *(Tùy chọn, nếu gói hỗ trợ)*: kiểm tra bật **Prevent use of leaked passwords** (lưu ý: tính năng HIBP thường thuộc gói Pro, trên Free Plan có thể bị khóa — giữ mặc định nếu không khả dụng).
4. Bấm **Save**.
   > Lưu ý: Chính sách mới chỉ áp dụng cho đăng ký mới và đổi mật khẩu mới; **không** làm hỏng tài khoản khách cũ đang tồn tại.

#### B. Kiểm tra & siết Rate Limits
1. Vào **Authentication** → **Rate Limits**.
2. Rà soát và áp dụng ngưỡng thực tế (tránh đặt quá thấp gây chặn nhầm khách dùng chung Wi-Fi/quán net NAT):
   - **Rate limit for sign-ins / token refreshes**: giữ chặt (khuyến nghị `30` req / 5 phút / IP hoặc thấp hơn nếu lưu lượng thật nhỏ).
   - **Rate limit for anonymous sign-ins**: tắt hẳn **Allow anonymous sign-ins** trong **Authentication** → **Providers** nếu chưa dùng.
   - **Rate limit for sign-ups / verification**: giữ mức thấp phù hợp lưu lượng shop (trên Supabase Free Plan, một số trường rate limit có thể bị giới hạn biên độ chỉnh sửa theo mặc định nền tảng — giữ ở mức chặt nhất cho phép).
3. Bấm **Save**.

#### C. Checklist bảo vệ tài khoản Super Admin, Admin & Booster
- [ ] **Tài khoản quản trị Supabase Dashboard & Vercel & DNS Mắt Bão**: đặt mật khẩu duy nhất ≥ 16 ký tự (lưu bằng Password Manager), **bắt buộc bật MFA/2FA (TOTP App như Google Authenticator / 1Password / Bitwarden)**.
- [ ] **Tài khoản Google OAuth dùng đăng nhập Booster/Admin** (`login.html`, tab Booster): bắt buộc bật **Google 2-Step Verification** (ưu tiên Authenticator/Passkey, hạn chế SMS).
- [ ] **Tài khoản Super Admin trong ứng dụng Namcumz**: đổi mật khẩu dài ≥ 16 ký tự (chữ hoa, thường, số, ký tự đặc biệt), không dùng lại ở dịch vụ khác; rà lại danh sách vai trò `super_admin` / `admin` định kỳ trong `admin.html`.
- [ ] Lưu bộ **Recovery Codes** của MFA ngoại tuyến (không lưu trong repo Git).

---

### 1.3. Lộ trình Phase 2 ($0): Cloudflare Turnstile → Supabase Attack Protection

> **CẢNH BÁO TRIỂN KHAI:** **KHÔNG** bật `Enable Captcha protection` trên Supabase Dashboard cho đến khi bản cập nhật frontend (`login.html` + `assets/js/app.js` gửi `options.captchaToken`) đã được test và deploy lên `namcumz.io.vn`. Bật sớm trên Supabase sẽ làm **toàn bộ form đăng nhập & đăng ký hiện tại lỗi ngay lập tức**.

#### Bước 1: Tạo Turnstile Widget trên Cloudflare ($0 — không cần chuyển DNS sang Cloudflare)
1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/) (tài khoản miễn phí) → Chọn mục **Turnstile** → **Add widget**.
2. Cấu hình:
   - **Widget name**: `namcumz-auth-prod`
   - **Add Hostnames**: thêm `namcumz.io.vn` và `www.namcumz.io.vn` *(có thể thêm `localhost` chỉ khi test local, hoặc tạo widget test riêng)*.
   - **Widget Mode**: chọn **Managed** (ít gây phiền khách thật, tự thử thách khi nghi bot).
3. Bấm **Create** và lưu 2 khóa:
   - **Site Key** (công khai — dùng ở frontend `login.html` / `runtime-config.js`).
   - **Secret Key** (bí mật — **chỉ dán vào Supabase Dashboard**, tuyệt đối không commit vào Git hay đưa vào frontend).

#### Bước 2: Tích hợp frontend vào `login.html` & `assets/js/app.js` (Thực hiện ở Phase 2)
1. Nạp script Turnstile trên `login.html`:
   `https://challenges.cloudflare.com/turnstile/v0/api.js`
2. Thêm container widget vào `#loginForm` và `#registerForm` trong `login.html` với `data-sitekey="<SITE_KEY>"`.
3. Trong `assets/js/app.js`: truyền `options: { captchaToken }` vào cả hai lệnh:
   - `supabaseClient.auth.signInWithPassword({ email, password, options: { captchaToken } })`
   - `supabaseClient.auth.signUp({ email, password, options: { captchaToken, data: { display_name } } })`
   và gọi `turnstile.reset()` trong `finally` sau mỗi lần submit để tránh lỗi token hết hạn/tái sử dụng.
4. Cập nhật CSP trong `vercel.json` (khi mở Phase 2): bổ sung `https://challenges.cloudflare.com` vào `script-src` và `frame-src` (nếu thiếu sẽ bị trình duyệt chặn widget).
5. Deploy lên Vercel và xác nhận widget hiển thị bình thường trên `https://namcumz.io.vn/login`.

#### Bước 3: Bật xác thực Captcha phía Supabase
1. Vào **Supabase Dashboard** (project `vqnuutdmcekqkbdvawlw`) → **Authentication** → **Attack Protection**.
2. Bật **Enable Captcha protection**.
3. Chọn **Captcha Provider**: **Cloudflare Turnstile**.
4. Dán **Secret Key** từ Bước 1 → Bấm **Save**.
5. **Kiểm thử ngay sau khi bật:** thử đăng nhập 1 tài khoản thật và đăng ký 1 tài khoản test trên `https://namcumz.io.vn/login`; thử gọi API trực tiếp không có `captchaToken` phải bị Supabase từ chối.

---

## 2. R8 — Cấu hình DNS SPF & DMARC cho `namcumz.io.vn`

### 2.1. Hiện trạng DNS đã kiểm tra (26/11/2026)

Kết quả truy vấn thực tế bằng PowerShell `Resolve-DnsName`:
- **Nameserver (NS)**: `ns1.matbao.vn` (DNS đang quản lý trên hệ thống Mắt Bão; bản ghi `A` trỏ `216.198.79.1` về Vercel).
- **TXT (`namcumz.io.vn`)**: *(Trống — chưa có bản ghi SPF)*.
- **TXT (`_dmarc.namcumz.io.vn`)**: *(Trống — chưa có bản ghi DMARC)*.
- **MX (`namcumz.io.vn`)**: *(Trống — tên miền hiện không dùng để gửi/nhận email)*.

Vì domain không gửi email, cần khai báo chính sách từ chối tuyệt đối (`-all` và `p=reject`) để ngăn kẻ xấu giả mạo email `@namcumz.io.vn` lừa đảo khách hàng (phishing/spoofing).

### 2.2. Hai bản ghi TXT cần thêm tại quản trị DNS (Mắt Bão)

Đăng nhập trang quản trị DNS của `namcumz.io.vn` và thêm chính xác **2 bản ghi TXT** sau:

| Host / Name | Type | Value (giá trị chính xác) | TTL | Mục đích |
| :--- | :---: | :--- | :---: | :--- |
| `@` *(hoặc để trống tùy giao diện DNS)* | `TXT` | `v=spf1 -all` | `3600` | Cấm mọi máy chủ gửi email nhân danh `namcumz.io.vn` |
| `_dmarc` *(tạo `_dmarc.namcumz.io.vn`)* | `TXT` | `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s` | `3600` | Từ chối tuyệt đối email mạo danh cả domain gốc & subdomain |

> **Lưu ý khi nhập:** Không gõ dư khoảng trắng đầu/cuối; không tạo 2 bản ghi SPF trùng nhau trên `@`. Nếu trong tương lai shop muốn gửi email chính thức từ `@namcumz.io.vn` (Google Workspace, Resend, SMTP...), phải cập nhật lại SPF (`include:...`) và cấu hình DKIM trước khi gửi.

### 2.3. Lệnh PowerShell kiểm chứng sau khi thêm DNS

Đợi 5–30 phút để DNS đồng bộ, chạy các lệnh sau trong PowerShell:

```powershell
# Kiểm tra qua DNS resolver mặc định của máy
Resolve-DnsName -Name namcumz.io.vn -Type TXT
Resolve-DnsName -Name _dmarc.namcumz.io.vn -Type TXT

# Kiểm tra trực tiếp qua Cloudflare 1.1.1.1 (tránh cache local)
Resolve-DnsName -Name namcumz.io.vn -Type TXT -Server 1.1.1.1
Resolve-DnsName -Name _dmarc.namcumz.io.vn -Type TXT -Server 1.1.1.1
```

**Kết quả đạt yêu cầu:**
- `namcumz.io.vn` trả về `Strings : {v=spf1 -all}`
- `_dmarc.namcumz.io.vn` trả về `Strings : {v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s}`

---

## 3. Đánh Giá & Chốt Phương Án Kỹ Thuật (R6 & R7)

### 3.1. R6 — `set_user_role` trả HTTP 404 → **FALSE POSITIVE (Không có lỗi)**

- **Trạng thái:** Đóng — **False Positive**, không cần sửa code hay migration.
- **Nguyên nhân báo cáo sai:** Trong lượt kiểm thử pentest, người kiểm thử đã gọi RPC `set_user_role` với tên tham số sai là `p_user_id`. PostgREST đối khớp hàm theo cả tên lẫn tập tham số (overload resolution), nên khi không khớp chữ ký sẽ trả về HTTP `404 Not Found`.
- **Bằng chứng xác minh từ codebase:**
  - Chữ ký hàm thực tế trong DB (`_db/production_001_release.sql`, dòng 688–708):
    `public.set_user_role(p_target uuid, p_role text, p_active boolean, p_reason text)` — `SECURITY DEFINER`, `SET search_path = ''`, bắt buộc caller có `role = 'super_admin'`, khóa `pg_advisory_xact_lock` chống tự xóa `super_admin` cuối cùng và ghi audit log vào `namcumz_private.role_audit`.
  - Quyền thực thi (`_db/production_001_release.sql`, dòng 952): chỉ `GRANT EXECUTE ... TO authenticated` (đã thu hồi từ `PUBLIC, anon`).
  - Xác nhận hiện diện trong script kiểm chứng (`_db/production_009_verify.sql`, dòng 14): `public.set_user_role(uuid,text,boolean,text)`.
  - Frontend gọi đúng 4 tham số (`admin.html`, dòng 911–916): `p_target`, `p_role`, `p_active`, `p_reason`.

### 3.2. R7 — PostgREST trả gợi ý tên tham số (Parameter Hints) → **LOW / Accepted Platform Behavior**

- **Trạng thái:** **Chấp nhận rủi ro mức LOW (Accepted Platform Behavior)** trên Supabase Free Plan.
- **Phân tích:** Khi gửi sai tên/kiểu tham số tới endpoint `/rest/v1/rpc/<fn>`, PostgREST mặc định trả thông báo lỗi kèm gợi ý chữ ký hàm trong schema `public`. Trên Supabase Free Plan, không có cấu hình tắt trực tiếp cơ chế schema hint này nếu không dựng thêm lớp API proxy che toàn bộ PostgREST.
- **Kiểm soát bù đắp (Compensating Controls):**
  - Biết tên tham số không tạo ra lỗ hổng vượt quyền: mọi RPC nghiệp vụ đều thu hồi quyền `PUBLIC, anon` và kiểm tra xác thực/vai trò/quyền sở hữu ở tầng DB (`namcumz_private.require_user()`, `namcumz_private.is_admin()`, kiểm tra `super_admin` hoặc `v_order.user_id = v_uid`) kết hợp RLS trên bảng dữ liệu.
  - Không làm lộ dữ liệu nhạy cảm hay bí mật hệ thống; chỉ cần tái đánh giá nếu sau này nâng cấp kiến trúc có API gateway riêng.

---

## 4. Runbook Khắc Phục Vòng 2 (Cập Nhật 26/11/2026 — Chi Phí $0)

Thực hiện đúng theo 4 bước tuần tự sau để đóng toàn bộ các mục **F1, F2, F3, F4, F5 (unpkg), F8, F9, F10** mà không làm gián đoạn khách hàng đang đăng nhập bằng `username`:

1. **Tạo Widget Cloudflare Turnstile & Điền `turnstileSiteKey` (F1 & F3):**
   - Tạo widget `namcumz-auth-prod` trên Cloudflare Turnstile (Mode: `Managed`, Hostnames: `namcumz.io.vn`, `www.namcumz.io.vn`).
   - Dán **Site Key** vào `window.NAMCUMZ_CONFIG.turnstileSiteKey` trong `assets/js/runtime-config.js`.
   - Build & Deploy lên Vercel, sau đó kiểm tra thực tế trên `https://namcumz.io.vn/login` thấy widget Turnstile hiển thị ở cả tab Đăng nhập & Đăng ký.
   - **Chỉ sau khi widget đã lên production**, mới vào **Supabase Dashboard (`vqnuutdmcekqkbdvawlw`) → Authentication → Attack Protection** bật **Enable Captcha protection** (Provider: `Cloudflare Turnstile`, dán **Secret Key**).
2. **Siết Supabase Rate Limits & Password Policy (F1 & F3):**
   - Xác nhận **Confirm email** vẫn **TẮT (OFF)** để bảo toàn đăng nhập `username` nội bộ `@namcumz.com`.
   - Tại **Authentication → Rate Limits**: siết Token requests (`30 / 5 phút`), Signups (`3 / giờ`), tắt Anonymous sign-ins; tại **Password Requirements**: đặt tối thiểu `8` ký tự + `Letters and digits`.
3. **Backup & Chạy SQL Vòng 2 trên Supabase SQL Editor (F2, F9, Phần 5):**
   - Chạy `_backup/backup_supabase.ps1` trước khi thao tác DB.
   - Chạy `_db/production_014_checkin_hardening.sql` và đối chiếu `_db/production_014_verify.sql` (ra `PASS`).
   - Chạy `_db/cleanup_pentest_round2_20261126.sql` để xóa sạch 3 tài khoản `zz2_*` + dòng điểm danh test.
   - Chạy Step 1 (READ ONLY) của `_db/redact_legacy_order_passwords_20261126.sql` để rà các đơn cũ còn sót mật khẩu (`DH597`); sau khi kiểm tra danh sách, mở comment Step 2 để che mật khẩu mà vẫn giữ nguyên lịch sử đơn.
4. **Thêm DNS SPF & DMARC tại Mắt Bão (F4):**
   - Thêm 2 bản ghi `TXT`: `@` = `v=spf1 -all` và `_dmarc` = `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s`, kiểm chứng bằng `Resolve-DnsName -Server 1.1.1.1`.
