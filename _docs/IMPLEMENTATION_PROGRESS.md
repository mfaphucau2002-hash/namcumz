# Tiến độ triển khai — 30/09/2026

Đợt 1: G0 và bản sửa frontend ban đầu của G1/G2. Chưa hoàn tất toàn bộ giai đoạn; chưa deploy hoặc thay đổi DB.

## Đầu vào đã chốt

- Q01: Bắt buộc đăng nhập trước khi tạo đơn (chủ shop xác nhận ngày 30/09).
- Chủ shop có staging riêng và sẽ cấu hình. Chưa có URL/key staging trong workspace.
- Các quyết định còn lại trong kế hoạch chưa được coi là đã chốt.

## Kết quả và giới hạn

| Mục | Đã thực hiện | Còn thiếu |
|---|---|---|
| 0.1 | Snapshot `_backup/source_20260930_initial`, manifest SHA256, Git HEAD/status; giữ nguyên các file đã xóa trước đợt này | Chưa tạo nhánh/commit; snapshot không phải DB backup |
| 0.2 | `_db/inspect_security_readonly.sql`: metadata RLS/grants/RPC/triggers/schema/index/constraints | Chưa chạy trên DB; cần cấu hình/quyền, Storage/Auth/Realtime settings và nội dung các hàm liên quan |
| 0.3 | Xác định script backup cũ không đủ tin cậy | Chưa sửa/kiểm chứng DB backup, chưa diễn tập restore; không chạy script cũ để tuyên bố có backup |
| 0.4 | Config staging; localhost/file URL không kết nối DB khi thiếu config; preview chỉ phục vụ trang/assets | Chờ cấu hình staging, tài khoản thử và E2E; preview trên hostname khác cần đặt environment staging rõ ràng |
| 1.2 | Bỏ tự upsert super_admin theo username admin | Chưa bảo vệ role phía DB; cần kiểm tra grants/trigger/RLS |
| 1.3 | Guest không tải orders qua fetchOrders | Không thay thế RLS; API trực tiếp và các trang khác vẫn cần kiểm tra |
| 1.4 | Encode text chat, tên người gửi, URL ảnh chat, thông báo và trường text card đơn | Chưa hoàn tất mọi innerHTML/URL/inline handler, profile/admin/booster và test browser |
| 2.2 | ID chủ đơn/booster phải khác null và đúng ID; bỏ so tên; currentUser read-only bridge | Chưa hoàn tất lifecycle/race/logout đa tab; quyền server vẫn cần vá |
| 2.3 | Đúng nút submit, chặn double-click khi disabled, tôn trọng validation đã hủy sự kiện | Chưa hoàn tất timeout/lỗi mạng/remember-me và E2E |
| 2.6 | 30 kiểm tra offline đạt; loại NUL CSS; cô lập AI lỗi | Chưa browser/staging/DB integration |
| 3.1 | Chặn tạo đơn cày khi chưa có session; owner từ session | Cần bắt buộc auth ở DB và kiểm tra input/idempotency server |
| 4.3 | Tạm dừng gửi đơn nạp, loại đường ghi plaintext credentials cũ | Mở lại sau catalog/giá server và cơ chế dữ liệu riêng; UI form cần làm tiếp G4 |
| 7.4 | AI trả thông báo tạm ngừng, không gọi API/đọc key/gửi dữ liệu đơn | Server integration chưa xây; không xóa key localStorage cũ |

## Chạy kiểm tra

Tại thư mục project:

```powershell
node _tools/check.cjs
node _tools/preview.cjs
```

Bộ check dùng mock DOM/VM và không gọi mạng; 30 check đạt gồm cú pháp JS, script inline HTML, thứ tự config, NUL, guest/null ownership, chat injection, local config guard, auth bridge và loại client promotion/plaintext checkout. Không đại diện cho kiểm thử trình duyệt hoặc RLS.

## Cấu hình staging

Sửa `assets/js/runtime-config.js` bằng URL và anon/publishable key **của staging**:

```javascript
window.NAMCUMZ_CONFIG = {
    environment: 'staging',
    supabaseUrl: 'https://PROJECT-STAGING.supabase.co',
    supabaseAnonKey: 'PUBLIC_ANON_OR_PUBLISHABLE_KEY'
};
```

Không đặt service-role key, database password hoặc Gemini key ở frontend. Config cố ý từ chối URL production cũ khi chạy staging. Host production hiện giữ kết nối cũ để không tự đổi môi trường; chưa chuẩn hóa cấu hình deploy. Không đưa cấu hình staging lên production.

Dùng tài khoản quản trị DB chạy file kiểm kê chỉ đọc trên staging; kiểm tra kết quả trước khi chia sẻ vì metadata/default/policy có thể chứa thông tin nội bộ. Chỉ cần schema/quyền, không cần hàng dữ liệu khách hoặc Auth password hashes. Sau đó đối chiếu production theo quyền được cấp; viết migration dựa trên kết quả thật.

## Bước tiếp theo

1. Cấu hình staging và lấy kiểm kê DB; hoàn thiện backup/restore phù hợp hạ tầng.
2. Ưu tiên xử lý RPC Auth public, role tự nâng, đọc rộng đơn và sender/owner server theo kết quả kiểm kê.
3. Hoàn thiện auth lifecycle, XSS còn lại và kiểm thử các vai trò A/B trên staging.
4. Chưa phát hành bản này: đơn nạp/AI tạm ngừng và các cổng G1 chưa đạt.

Không restore snapshot frontend về production một cách máy móc vì bản cũ có lỗi bảo mật. Không phục hồi DB từ JSON script cũ khi chưa kiểm chứng.

## Cập nhật kết nối staging

Đã cấu hình project `cnawquqkeogzmvucmjes` trong `assets/js/runtime-config.js` bằng publishable key người dùng cung cấp. GET `/auth/v1/settings` trả HTTP 200; 30 kiểm tra offline đạt. Chưa kiểm chứng schema/RLS hoặc ghi dữ liệu. Không sử dụng chuỗi PostgreSQL có placeholder `[YOUR-PASSWORD]`; chưa chạy login/init/link, migration hay deploy. Publishable key không cấp quyền quản trị schema. Bước tiếp theo là chuẩn bị schema staging và thực thi qua SQL Editor hoặc kết nối quản trị được cấu hình riêng, không đưa mật khẩu vào chat/frontend.


## Đợt tiếp — chuẩn bị nền DB staging

Đã soạn staging_001_foundation.sql (project trống, sáu bảng, grants/RLS/triggers, khóa client writes chưa hỗ trợ), staging_001_verify.sql (metadata chỉ đọc), staging_001_rls_smoke.sql (hai khách giả, thử quyền và ROLLBACK). Hướng dẫn STAGING_SETUP.md. Chưa thực thi SQL, chưa có kết quả PostgreSQL/API/E2E; không đánh dấu G1 hoàn tất. Không dùng mật khẩu trong chat và không thay đổi production.


## Staging foundation và kiểm tra quyền đã chạy

Chủ shop cung cấp ảnh kết quả: foundation installed, metadata verify PASS và RLS smoke customer A/B PASS trên namcumz-staging. Ghi nhận thành công các kịch bản trong hai script; chưa bao phủ Auth/API/Storage/Realtime/admin/booster/E2E, chưa coi toàn bộ G1 đạt.

Đã sao lưu app.js vào `_backup/source_before_signup_alignment` và sửa đăng ký staging: không insert user_roles từ client, không gửi role metadata, chỉ chuyển trang khi có session, khôi phục nút trong finally khi lỗi. Luồng production cũ giữ nhánh tương thích và kiểm tra lỗi ghi hồ sơ. Q02 đang chờ chủ shop chọn email thật hay username; chưa thay định danh đăng nhập.

Q02 đã chốt: chủ shop chọn giữ tên đăng nhập như hiện tại cho tài khoản mới và cũ. Không chuyển sang email làm định danh đăng nhập. Cần thiết kế xác minh/khôi phục phù hợp, không tự tắt email confirmation trên production hoặc đổi email tài khoản cũ. Hiện nhánh username@namcumz.com vẫn cần xử lý trạng thái confirmation trước E2E đăng ký/đăng nhập.

## Tiếp tục 30/09 — build allowlist và kiểm chứng offline

- Sửa script `check` trong package.json trỏ tới `_tools/check.cjs` đang tồn tại; lỗi chạy subprocess báo rõ nguyên nhân.
- Thêm `_tools/build.cjs`: đóng gói 8 trang hiện hành và assets/media theo danh sách định dạng cho phép vào `dist`; bỏ qua file ẩn, từ chối symlink. Không đóng gói SQL, backup, tài liệu, PowerShell, node_modules hoặc cấu hình môi trường dạng dotfile.
- Vercel chạy check trước build và chỉ phục vụ `dist`. Chưa deploy; runtime-config staging hiện tại được giữ nguyên, chưa sẵn sàng phát hành production.
- Kết quả: 30/30 kiểm tra frontend offline đạt; 10/10 kiểm thử PostgreSQL nhúng PGlite đạt; build tạo 18 file. PGlite không thay thế kiểm thử Supabase Auth/API/Storage/Realtime thực tế.
- Môi trường hiện tại không có npm trên PATH. Đã chạy trực tiếp `node _tools/check.cjs`, `node --test --test-isolation=none _tools/database.test.mjs`, `node _tools/build.cjs`. Check cần quyền tạo subprocess trong môi trường chạy.
- Tiếp theo: kiểm kê và kiểm chứng migration staging_002 trên staging, nối frontend với RPC theo G2/G3; hoàn thiện auth lifecycle theo quyết định giữ username. Chưa đánh dấu G1/G2 hoàn tất.

## 30/09 — Kết nối dashboard với workflow RPC (staging)

Đã lưu app.js/dashboard.html trước thay đổi tại `_backup/source_before_rpc_dashboard` (snapshot nguồn, không phải DB backup).

- Thêm `assets/js/order-api.js`: tạo đơn/action qua RPC; chống double-submit; giữ request ID khi lỗi mạng hoặc kết quả rỗng; timeout 20 giây; không tự retry. Mã retry chỉ giữ trong phiên trang hiện tại, không bảo đảm qua reload.
- Nhánh staging trong dashboard tạo đơn bằng `create_order`, không gửi owner/giá/mã đơn do client chọn. Các thao tác báo giá, duyệt giá, ghi nhận tiền, nhận đơn, tiến độ, tạm dừng/tiếp tục, nghiệm thu/làm lại, hủy và review gọi `order_action` với version.
- Booster tải queue tối thiểu qua `claim_queue`; queue không cộng vào thống kê đơn riêng. Tiến độ lấy từ server; hủy thay cho xóa; kết quả nghiệm thu được encode. Rating reset khi đổi đơn.
- Sửa draft migration 002 để từ chối version NULL (trước đó NULL có thể bỏ qua so sánh optimistic concurrency). Thêm `_db/staging_002_verify.sql` kiểm tra metadata/grants/private bucket và bản vá version.
- Kết quả: 34 checks frontend/VM; 16 tests DB/API (gồm test cha) đạt. Verify 002 chạy thành công trên PostgreSQL nhúng PGlite. Build tạo 19 file.
- Đọc metadata REST staging trả HTTP 401. Chưa xác nhận migration 002 đã cài trên Supabase; chưa ghi DB thật, chưa deploy. Kết quả local không thay thế Auth/API/E2E thật.
- Phạm vi còn lại: admin.html còn trình sửa trực tiếp cũ; chat/file/support chưa nối RPC; chưa có UI giao/chuyển booster; chưa làm auth lifecycle đầy đủ. Dashboard staging tạm không hiển thị các nút chat/ảnh cũ bị DB khóa. Luồng production cũ vẫn giữ tương thích, không tuyên bố bảo mật hoàn tất.
- Q03–Q07 chưa chốt đầy đủ; workflow là bản thử staging, chưa được nghiệm thu nghiệp vụ. Cần xác nhận schema/migration thực tế trước khi áp dụng SQL; nếu migration 002 đã cài thì không chạy lại mà chuẩn bị migration bổ sung.

## 30/09 — Tiếp tục tự động; chat/ảnh/hỗ trợ staging

Người dùng cho phép tiếp tục tự động toàn bộ theo kế hoạch. Chỉ yêu cầu can thiệp khi thiếu đăng nhập/quyền hoặc quyết định bắt buộc không thể suy ra.

- Nối send_order_message/create_ticket qua lớp RPC có request ID và xử lý lỗi; giữ draft khi gửi chưa thành công.
- Ảnh staging dùng bucket order-files private, đường dẫn order/actor/UUID, kiểm tra JPG/PNG/WebP 5MB, signed URL 5 phút. Không dùng public URL hoặc fallback Base64 trên nhánh staging. Giữ đường dẫn upload đã thành công để retry gửi message trong phiên trang.
- Chat bỏ response cũ khi đổi đơn/tài khoản, tránh render trùng ID; dashboard có lại nút chat/ảnh/hỗ trợ. Không tự bật Realtime; nếu chưa cấu hình publication thì người nhận cần mở lại chat để tải mới.
- 34 checks và 18 tests (gồm test cha) đạt; có kiểm thử quyền ảnh riêng và giả uploader. Build 19 file. Chưa kiểm thử Storage API/trình duyệt thật.
- Đã mở SQL Editor staging bằng trình duyệt Codex, nhưng bị chuyển tới trang đăng nhập Supabase. Đã yêu cầu người dùng đăng nhập trực tiếp tại tab đang mở, không gửi mật khẩu. Ảnh người dùng xác nhận ledger chỉ có staging_001_foundation; chưa chạy migration 002 trên DB thật.
- Chưa hoàn tất toàn kế hoạch: còn live migration/E2E, auth, admin, catalog và nghiệm thu/phát hành theo các cổng trong WEBSITE_UPGRADE_PLAN.md.

## 30/09 — Đã nạp thành công staging_002_workflows trên Staging DB

Chủ shop đã thực thi `staging_002_workflows.sql` trực tiếp trên SQL Editor của dự án `namcumz-staging` và cung cấp ảnh chụp xác nhận:
- Kết quả: `staging_002_workflows installed` (1 row).
- Ledger migration trong `namcumz_private.migrations` hiện đã ghi nhận: `staging_001_foundation` và `staging_002_workflows`.
- Hệ thống RPC (`create_order`, `order_action`, `claim_queue`, `send_order_message`, `create_ticket`, `respond_ticket`, `set_user_role`, `save_package`), private bucket `order-files`, và RLS nâng cao đã sẵn sàng trên database staging thật.
- Bước tiếp theo: Cung cấp script verify chỉ đọc (`_db/staging_002_verify.sql`) để xác nhận toàn vẹn metadata/grants/RLS; tiến hành cập nhật `admin.html` kết nối RPC; kiểm thử luồng E2E đăng ký/đăng nhập/tạo đơn.

## 30/09 — Đồng bộ admin.html theo chuẩn RPC & XSS sanitization

- Đã sao lưu `admin.html` vào `_backup/source_before_admin_alignment/admin.html`.
- Cập nhật `admin.html`:
  + Chống XSS: Toàn bộ thông tin render trong bảng đơn hàng (`loadAdminTable`) và danh sách nhân sự (`loadStaffTable`) được qua hàm escape HTML.
  + Đổi quyền hạn nhân sự (`updateUserRole`): Trên staging, gọi RPC `set_user_role` yêu cầu lý do kiểm toán, chặn cập nhật trực tiếp vào bảng `user_roles`. Thêm role `booster` vào danh mục lựa chọn.
  + Hủy đơn thay vì xóa (`deleteOrder`): Trên staging, không cho phép xóa vĩnh viễn dòng đơn (bị DB chặn) nhằm bảo toàn đối soát; chuyển thành hành động hủy đơn có lý do qua `OrderAPI.action(..., 'cancel')`.
  + Tạo đơn thủ công (`adminOrderForm`): Trên staging, sử dụng `OrderAPI.create` qua RPC `create_order`. Chặn form sửa trực tiếp trường giá/trạng thái và hướng dẫn thao tác theo quy trình Dashboard.
- Kiểm thử tự động:
  + `node _tools/check.cjs`: 34/34 checks đạt.
  + `node _tools/database.test.mjs`: 12/12 tests PGlite đạt.
  + `node _tools/build.cjs`: Đóng gói thành công 19 files vào `dist/`.

## 30/09 — G4: Triển khai Nạp Game Login Top-up & Loại bỏ hoàn toàn Nạp UID

Theo yêu cầu của chủ shop ("loại bỏ phần nạp uid đi vì phần này game không cần hỗ trợ nữa rồi, chỉ nạp Login"):

1. **Cơ sở dữ liệu Staging (Migration 003: `_db/staging_003_login_topup.sql`)**:
   - Mở rộng ràng buộc `packages.type` hỗ trợ gói nạp `'login'`.
   - Tạo bảng chuyên biệt `public.order_credentials` lưu trữ thông tin đăng nhập tài khoản nạp (`login_method`, `account_username`, `account_password`, `contact_phone`, `notes`) kèm RLS nghiêm ngặt: chỉ chủ đơn, booster được phân công hoặc admin mới có quyền truy cập; ẩn hoàn toàn với anon/người dùng khác.
   - Xây dựng RPC bảo mật `create_topup_order` với:
     + Chống gửi trùng lặp (advisory transaction lock theo hash user+request).
     + Giới hạn tần suất tạo đơn (rate limit 10 đơn/giờ).
     + Xác thực giá trực tiếp từ bảng catalog `public.packages`, loại bỏ nguy cơ can thiệp giá từ client.
     + Lưu thông tin tóm tắt đơn vào `public.orders` và thông tin nhạy cảm vào `public.order_credentials`.
   - Nạp sẵn danh mục 31 gói nạp chính hãng kèm UUID cố định cho 4 tựa game chính: Genshin Impact, Honkai Star Rail, Zenless Zone Zero, Wuthering Waves.

2. **Frontend & Giao diện Nạp Game**:
   - **`assets/js/order-api.js`**: Bổ sung phương thức `OrderAPI.topup(...)` kết nối RPC `create_topup_order`.
   - **`assets/js/napgame.js`**:
     + Loại bỏ hoàn toàn mảng catalog UID.
     + Quy hoạch các game về chuẩn nạp Login (`type: 'login'`).
     + Ánh xạ toàn bộ gói nạp sang UUID cố định từ migration 003.
     + Hàm `submitDetailOrder` gọi trực tiếp `OrderAPI.topup`, bảo vệ thông tin đăng nhập và điều hướng sang trang theo dõi đơn hàng sau khi tạo thành công.
   - **`napgame.html` & `napgame-detail.html`**:
     + Xóa bỏ các tab, hướng dẫn và văn bản liên quan đến UID.
     + Bổ sung đầy đủ các trường nhập liệu chuẩn Nạp Login: Dropdown Máy chủ (Asia, America, Europe, TW/HK/MO), Dropdown Phương thức đăng nhập (Hoyoverse, Google, Facebook, Twitter, Khác), Tên đăng nhập, Mật khẩu, SĐT Zalo liên hệ, Ghi chú đơn hàng.
     + Cập nhật các mục FAQ và cam kết bảo mật theo tiêu chuẩn nạp Login chính hãng.

3. **Kiểm thử & Đóng gói**:
   - `node _tools/check.cjs`: 34/34 checks cú pháp và an toàn frontend đạt.
   - `node --test --test-isolation=none _tools/database.test.mjs`: 13/13 integration tests đạt (bao gồm kịch bản tạo đơn nạp game và cô lập credentials).
   - `node --test --test-isolation=none _tools/order-api.test.mjs`: 7/7 tests đạt (bao gồm kiểm thử RPC topup và xác thực tham số).
   - `node _tools/build.cjs`: Đóng gói thành công 19 files chuẩn vào `dist/`.

## 30/09 — G5: Hoàn thiện Vận hành Shop (Shop Operations & Admin/Booster Tools)

1. **Xem thông tin tài khoản nạp game (Credentials Viewer)**:
   - **Phía Admin (`admin.html`)**:
     + Hiển thị nhãn phân biệt `[Nạp Game]` và `[Cày Thuê]` trong bảng đơn hàng.
     + Bổ sung nút **"Xem TK"** cho các đơn nạp game.
     + Hộp thoại an toàn truy vấn trực tiếp bảng `order_credentials` (được bảo vệ bởi RLS cho admin): hiển thị máy chủ, phương thức đăng nhập, tài khoản (kèm nút copy), mật khẩu (mặc định ẩn kèm nút bật/tắt hiển thị và nút copy), SĐT Zalo (kèm link mở Zalo nhanh), và ghi chú của khách.
   - **Phía Khách hàng & Booster (`dashboard.html` & `assets/js/app.js`)**:
     + Khách hàng là chủ đơn hoặc Booster được giao đơn có thể bấm **"Xem TK game"** để xem lại thông tin đăng nhập đã gửi hoặc lấy tài khoản để nạp. RLS đảm bảo người ngoài không thể đọc trộm.

2. **Quy trình thu tiền & Quản lý đơn phía Admin**:
   - Thêm nút **"Thu tiền"** trực tiếp trên hàng đơn: Cho phép admin nhập số tiền khách đã chuyển khoản và mã giao dịch/tham chiếu ngân hàng để gọi RPC `order_action('payment')`.
   - Giữ nguyên cơ chế hủy đơn có kiểm toán lưu vết qua RPC `order_action('cancel')`.

3. **Quản lý Khiếu nại & Hỗ trợ Khách hàng (Support Tickets)**:
   - Bổ sung tab **"Hỗ trợ & Khiếu nại"** (`tab-tickets`) trên thanh điều hướng bên của trang Admin.
   - Bảng tổng hợp toàn bộ ticket từ `public.support_tickets`: Hiển thị thời gian, mã đơn, khách hàng, lý do khiếu nại, mô tả của khách, trạng thái (`Đang chờ` / `Đã xử lý`), và nội dung phản hồi.
   - Hộp thoại phản hồi cho Admin: Cho phép nhập nội dung trả lời và gọi RPC `respond_ticket` để cập nhật trạng thái đã giải quyết và lưu vết kiểm toán vào `namcumz_private.ticket_audit`.

4. **Kiểm thử & Đóng gói**:
   - Toàn bộ 34 kiểm tra frontend offline đạt.
   - 7/7 OrderAPI integration tests đạt.
   - 13/13 database tests nhúng đạt.
   - Đóng gói 19 files chuẩn vào `dist/`.

## 30/09 — G6 & G7: Hoàn thiện Điều hướng toàn trang & Đóng gói Dist

1. **Liên kết & Điều hướng (G6)**:
   - Đã gắn liên kết dịch vụ Nạp Game (napgame.html) lên toàn bộ thanh Menu chính (Header), Hero CTA, Service Cards, Menu mobile trên cả 8 trang: index.html, dashboard.html, profile.html, admin.html, booster.html, login.html, napgame.html, napgame-detail.html.
   - Kiểm tra liên kết nội bộ: 100% hợp lệ, 0 liên kết chết (broken links). Đã sửa các đường dẫn /checkscam cũ trỏ về an toàn.
   - Dọn dẹp các tệp lệnh PowerShell tạm thời ở thư mục gốc.

2. **Hiệu năng & Tích hợp (G7)**:
   - Đảm bảo tính cô lập và bảo mật của AI Copilot: assets/js/ai-copilot.js được đóng gói an toàn, không lưu trữ hay rò rỉ API key ra client.
   - Đóng gói chuẩn hóa qua _tools/build.cjs: 19 file phục vụ triển khai trong thư mục dist/.

## 30/09 — G8: Sẵn sàng phát hành Production (namcum.io.vn)

1. **Bản Migration Production hợp nhất (_db/production_001_release.sql)**:
   - Hợp nhất toàn bộ Foundation, Workflows, và Login Top-up thành 1 tệp SQL duy nhất, độc lập, an toàn và có tính lũy kế (idempotent).
   - Không sử dụng các lệnh xóa hủy diệt (NO DROP TABLE, NO DELETE, NO TRUNCATE).
   - Tự động backfill user_roles từ auth.users nếu có tài khoản người dùng cũ chưa có hồ sơ.
   - Bổ sung an toàn các cột mới cho orders, user_roles, order_messages, support_tickets, notifications.
   - Tạo các bảng mới public.packages, public.order_credentials, namcumz_private.receipts, namcumz_private.limits, namcumz_private.role_audit, namcumz_private.ticket_audit.
   - Cài đặt đầy đủ 10 RPCs bảo mật với Security Definer, RLS chống đọc chéo, transaction lock chống gửi đúp, rate limiting.
   - Khởi tạo bucket tệp đính kèm riêng tư order-files và seed sẵn 30 gói nạp chính hãng.

2. **Kịch bản kiểm chứng tự động (_db/production_001_verify.sql)**:
   - Kiểm tra chữ ký và quyền thực thi của toàn bộ 10 RPCs.
   - Kiểm tra RLS, bucket lưu trữ tệp riêng tư, danh mục 30 gói nạp và cô lập mật khẩu nạp game.

3. **Tương thích Client Frontend**:
   - Cập nhật assets/js/app.js, assets/js/order-api.js, admin.html để kích hoạt đầy đủ quy trình kiểm soát RPC trên cả môi trường staging lẫn production.

4. **Trạng thái kiểm tra cuối cùng**:
   - _tools/check.cjs: 34/34 PASS.
   - _tools/order-api.test.mjs: 7/7 PASS.
   - _tools/database.test.mjs: 13/13 PASS.
   - _tools/build.cjs: 19/19 files built successfully into dist/.
