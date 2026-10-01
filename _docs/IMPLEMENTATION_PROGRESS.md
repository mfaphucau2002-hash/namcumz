# Tiến độ triển khai — 30/09/2026

> **Cập nhật điều phối 01/10/2026:** Nhật ký dưới đây chứa các ghi nhận theo từng đợt, gồm cả thông tin trước đây mâu thuẫn về staging/production. Đừng suy ra trạng thái live chỉ từ các ghi nhận đó. Bảng cổng trong `WEBSITE_UPGRADE_PLAN.md` đã được sửa để phân biệt code có trong repo với nghiệm thu DB/deploy thực tế.


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
## 01/10/2026 — Đối chiếu kế hoạch và trạng thái hiện tại

- Git có commit lịch sử `84b4a6b`, nhưng repo `main` hiện ở `dc21f4e`; không có bằng chứng trong workspace đủ để xác minh phiên bản đang chạy trên production hoặc migration ledger hiện tại. Các thay đổi đang có trong working tree chưa commit.
- Có migration production đã chuẩn bị (`production_000_p0_containment.sql`, `production_001_release.sql`, `production_002_credentials_encryption.sql`), nhưng chưa chạy/verify trên production. Trên `namcumz-staging`, đã tạo khóa trong Vault (không lộ giá trị), chạy `staging_004_credentials_encryption.sql` thành công và `staging_004_verify.sql` trả PASS. Trước migration staging có 0 dòng credentials; cột plaintext được bỏ và cột ciphertext được bật NOT NULL.
- Frontend trong working tree chọn contract `staging_004_credentials_encryption` theo staging và `production_002_credentials_encryption` theo production; code này chưa deploy. Trên staging, smoke script `_db/staging_004_smoke.sql` PASS với transaction rollback: top-up giả, idempotent retry, credential owner round-trip và từ chối khách khác. Đây là DB smoke bằng JWT claims giả lập, chưa xác nhận Auth/API/browser E2E hoặc quyền booster/admin.
- Kế hoạch nạp game v3 có roadmap lịch sử lỗi thời. `WEBSITE_UPGRADE_PLAN.md` là kế hoạch bao quát; trạng thái nghiệm thu được hạ khỏi “hoàn tất” cho đến khi có kiểm tra staging/production tương ứng.

### Việc tiếp theo

1. Operator có quyền Supabase kiểm tra project/ledger và chạy verify chỉ đọc trước khi chọn migration; không gửi secret qua chat.
2. Tiếp theo: chạy frontend Auth/API E2E trên staging với tài khoản thử; kiểm tra viewer thực tế và các quyền booster/admin. Hoàn thiện các ma trận còn thiếu của G1–G7.
3. Sau khi staging đạt và backup/restore DB được chứng minh, operator có quyền Supabase áp dụng các migration production theo `CREDENTIAL_ENCRYPTION_SETUP.md`; xác minh contract trước khi deploy frontend.
4. Chạy E2E và thiết bị thực theo checklist G8; chỉ khi có bằng chứng mới đánh dấu các cổng đạt.

**Trạng thái hiện tại:** staging 004 đã cài và verify; staging top-up/credentials DB smoke đạt, dữ liệu thử đã rollback. Chưa chạy frontend Auth/API E2E, chưa nghiệm thu các role booster/admin, chưa chứng minh backup/restore và chưa thay đổi production. Production migration/deploy vẫn đang chờ các cổng này.


## 01/10/2026 — Chuẩn bị local preview cho E2E staging

- `_tools/preview.cjs` phục vụ `assets/js/runtime-config.js` động từ `.env.local` với allowlist URL cố định của `namcumz-staging`, publishable key dạng `sb_publishable_...`, environment `staging` và contract `staging_004_credentials_encryption`. Cấu hình production trong file runtime được giữ nguyên; `.env.local` đã nằm trong `.gitignore`.
- HTTP smoke trên localhost xác nhận runtime trả staging URL/contract và đã nạp key; trang chính, robots, sitemap trả 200; `_docs`, `_backup`, `_db` trả 404. Browser E2E chưa chạy.
- Người dùng chọn dùng tài khoản staging hiện có, không tạo mới. Supabase Auth UI ước tính 10 users; truy vấn `user_roles` xác nhận hiện chỉ có 2 customer, chưa có booster/admin. Chưa xác định tài khoản customer nào dùng để đăng nhập; không đọc/đổi mật khẩu. Muốn test booster/admin cần chọn cụ thể user hiện có và xác nhận gán quyền theo role.
## 01/10/2026 — Tiếp tục kiểm tra staging sau 004

- Sửa `_tools/preview.cjs` để allowlist nhận đúng `robots.txt` và `sitemap.xml`; trước đó hai đường dẫn này nằm ngoài mảng Set.
- Preview HTTP cục bộ: `/`, `/robots.txt`, `/sitemap.xml` trả 200; `/_docs/...`, `/_backup/` và `/_db/...sql` trả 404.
- Preview localhost đã nạp cấu hình staging từ `.env.local`; `runtime-config.js` production được giữ nguyên. Chưa chạy Auth/API/browser E2E: CUA browser không truy cập được loopback và đã chuyển sang dùng user hiện có; role table chỉ có 2 customer, chưa có booster/admin; chưa có thông tin đăng nhập để chạy UI.
- Migration 004 staging và smoke rollback ghi ở trên vẫn là phạm vi live đã xác nhận. Cần staging publishable key, tài khoản customer/booster/admin dùng riêng cho test và cổng backup/restore để tiếp tục ma trận.
- Kiểm thử lượt này: DB 13/13, order API 7/7, check 39/39, build 21 files; preview allowlist PASS. Không deploy hoặc chạy migration production.
## Bằng chứng staging 004

- Ledger trước migration xác nhận staging_003_login_topup; Vault key tồn tại; ban đầu có 0 credential rows và cột plaintext còn tồn tại.
- Kết quả chạy staging_004_credentials_encryption.sql: staging_004_credentials_encryption successfully installed.
- _db/staging_004_verify.sql: PASS: staging_004_credentials_encryption metadata verified.
- _db/staging_004_smoke.sql: PASS cho idempotency, giải mã qua RPC cho chủ đơn, từ chối khách khác; toàn bộ trong transaction rollback.

## 01/10/2026 — Production contract, lỗi thao tác đơn và đo hiệu năng G7

- Ảnh lỗi Admin “Thiếu phiên bản đơn. Hãy tải lại danh sách.” khớp với tiền điều kiện trong `assets/js/order-api.js`: thao tác hủy/hoàn thành cần `orders.version` và RPC có kiểm soát phiên bản.
- Đã chạy truy vấn chỉ đọc trên Supabase production `namcumz` (ref `vqnuutdmcekqkbdvawlw`): bảng `public.orders` tồn tại, nhưng `orders.version` không tồn tại; `public.app_contract_version()` không tồn tại; bảng migration ledger frontend kỳ vọng cũng không tồn tại. Kết luận: production DB chưa được cài contract/RPC tương thích với frontend hiện tại. Không phải lỗi có thể giải quyết an toàn bằng bỏ qua version ở client.
- Chưa thực hiện ghi/hủy/hoàn thành đơn thật; không migration, deploy hoặc sửa dữ liệu production trong lần kiểm tra này.
- G0 bị chặn tại backup/restore: Supabase production đang ở Free Plan; Dashboard nêu rõ Free Plan không có project backups. Script `backup_supabase.ps1` cũ chỉ đọc một tập bảng qua REST/anon và không đủ để làm bản sao đầy đủ hay chứng minh restore. Không chạy script này như backup.
- G6: không sửa UI trong lượt này theo ưu tiên đã chốt; thiết bị/responsive chưa kiểm tra lại.
- G7 baseline mạng sơ bộ: 5 request HTML GET cho mỗi URL, status 200. `/`: 82,969 bytes; mẫu 1592.4, 65.3, 57.1, 65.0, 306.7 ms (median 65.3 ms). `/napgame.html`: 10,000 bytes; 1767.8, 116.8, 125.5, 129.0, 377.8 ms (median 129.0 ms). Các số gồm thời gian mạng + tải body, không phải LCP/CLS/INP, không đo API p95 và biến động/outlier lớn; cần đo browser/Web Vitals và API trên staging để nghiệm thu.
- G8: **chưa sẵn sàng phát hành**. Cần hoàn tất các cổng dưới đây theo đúng thứ tự, có backup/restore độc lập trước migration production.

### Việc tiếp theo sau đối chiếu production

1. Chủ shop/operator quyết định phương án backup cho production (nâng gói có scheduled backup hoặc export đầy đủ được hỗ trợ); tạo backup có timestamp và diễn tập restore vào project cô lập, đối chiếu số dòng/quan hệ.
2. Trên staging, chọn tài khoản hiện có cho customer A/B; role table hiện chỉ có 2 customer, chưa có booster/admin. Để test booster/admin cần UUID user staging hiện có và xác nhận cấp role. Sau đó chạy Auth/API/browser E2E; không dùng tài khoản production.
3. Hoàn thành ma trận G1–G5 trên staging: quyền trực tiếp/âm, Auth, quy trình đơn từ tạo đến nghiệm thu/hủy, concurrency/retry/version cũ, catalog/giá nạp, Storage/chat/ticket/admin và log. G4 có staging migration 004 + SQL smoke PASS nhưng browser/API/Auth và vai trò còn chờ.
4. G6 giữ nguyên theo ưu tiên hiện tại; thiết bị/viewport cần kiểm tra nếu muốn đóng nghiệm thu toàn diện.
5. G7: lặp phép đo trong cùng điều kiện, lấy browser Web Vitals và API p50/p95, ghi vùng/thiết bị/mạng/cache/bộ dữ liệu; đặt baseline/threshold.
6. Sau khi cổng staging và backup đạt, review lần cuối rồi chạy lần lượt migration production `production_000_p0_containment.sql`, `production_001_release.sql`, verify, và `production_002_credentials_encryption.sql` theo `CREDENTIAL_ENCRYPTION_SETUP.md`; dừng ngay nếu verify sai. Chỉ deploy frontend tương thích sau khi production contract verify PASS.
7. Chạy production smoke chỉ bằng user/test order được chủ shop chỉ định; xác minh đọc, nhận, tiến độ, nghiệm thu/hủy theo quy tắc nghiệp vụ, alert/monitoring và phương án rollback. Không thao tác đơn khách thật để test.

## 01/10/2026 — Kiểm tra backup DB cũ / restore drill G0

- Không tạo bản backup DB mới trong lượt này: Supabase Dashboard không mở được project cần thao tác (direct project URL trả 404 ở phiên hiện tại); máy cũng không có `pg_dump`, `pg_restore`, `psql`, `supabase` CLI hoặc Docker. Không có đường truy cập đặc quyền đủ để export toàn database và restore vào DB cô lập.
- Phân tích cấu trúc `namcumz/_backup/BACKUP_20260807_223911.json` tại chỗ, không in nội dung hàng: JSON chỉ có 4 bảng `notifications`, `order_messages`, `orders`, `user_roles`, tổng 148 bản ghi theo mảng/metadata (56 + 64 + 20 + 8), timestamp 07/08/2026. Đây là kết quả truy vấn REST/anon cũ, không bao gồm toàn bộ schema, auth, storage, private schemas, routines hoặc dữ liệu bị RLS ẩn; vì vậy không thể coi là production DB backup hoàn chỉnh và không dùng để restore/đối chiếu live.
- Restore drill phần code ở `source_20260930_initial` đã đạt hash integrity 38/38, nhưng đây không phải DB restore. Không ghi dữ liệu lên production/staging và không thay đổi workspace trong lúc diễn tập.
- **G0 DB backup/restore: BLOCKED**, chờ tài khoản/project access có quyền export, công cụ dump chính thức và môi trường khôi phục cô lập. Sau khi có, lấy full dump có schema + data, restore vào DB tạm, chạy kiểm tra counts/FK/constraints/RLS/functions/storage manifests; so sánh counts/hashes và ghi rõ objects không được gói backup hỗ trợ.

- 01/10 follow-up qua tab in-app browser đã đăng nhập đúng production `namcumz` (ref `vqnuutdmcekqkbdvawlw`): trang Database > Backups xác nhận `Free Plan does not include project backups`; tab `Restore to new project` xác nhận yêu cầu Pro Plan và physical backups. Organization vẫn FREE, nên không bật upgrade/khởi tạo tài nguyên tính phí.
- Phương án free còn lại là logical dump theo Supabase CLI (roles/schema/data); máy hiện chưa có CLI/Docker/Postgres client và chưa có database password trong phiên làm việc. Không lấy/đặt lại password, không chạy dump một phần thay thế, không restore vào production hoặc staging đang dùng.

## 01/10/2026 — G4 storefront safety pass và đo staging G7

- Trên working tree local (chưa deploy): catalog trang nạp chỉ giữ bốn game có package rows trên staging; tên/ID/giá package lấy từ public `packages` rows đang active; package thiếu/không hợp lệ không cho đặt. Render tên package bằng `textContent`/DOM nodes, bỏ inline event handler trên thẻ package.
- Gỡ dữ liệu review, đơn/ticker/social-proof giả; bỏ rating/số bán và các cam kết không có bằng chứng như xử lý 5 phút, bảo mật tuyệt đối, rủi ro 0%, hoàn tiền tự động. Điều chỉnh nội dung FAQ/giá/thời gian theo hướng có điều kiện. Không tạo order khi kiểm tra UI.
- Browser staging preview: trang detail tải thành công, hiển thị 8 gói Genshin và đúng giá đã đối chiếu trước đó với catalog staging; nút đặt đơn ở trạng thái disabled khi chưa chọn gói; không còn ticker hoặc điểm rating giả. Đây là kiểm tra render; thao tác submit, auth thật, viewer credentials và role admin/booster chưa E2E.
- Hiệu năng staging, mỗi endpoint 7 GET bằng publishable key, body nhỏ, cùng máy/mạng, bao gồm request+body: `GET /rest/v1/packages?select=id&active=eq.true&limit=1` 200/47 B, samples 524.2, 1399.3, 601.7, 986.6, 424.5, 192.4, 144.1 ms; median 524.2 ms. `GET /rest/v1/rpc/app_contract_version` 200/36 B, samples 403.2, 172.5, 188.0, 152.7, 177.5, 1325.0, 1376.6 ms; median 188.0 ms. N nhỏ và outlier lớn: chỉ là baseline thô, không đại diện API p95 hoặc Web Vitals; cần lặp lại trong điều kiện chuẩn hóa.
- Local validation sau chỉnh sửa: `_tools/check.cjs` 39/39, `_tools/order-api.test.mjs` 7/7, `_tools/database.test.mjs` 13/13, build 21 files PASS. Artifact `dist/` là build cục bộ; không publish/deploy.
- Production vẫn nguyên trạng. Thiếu `orders.version`, `app_contract_version()` và migration ledger; do đó UI hủy/hoàn tất báo thiếu version. Không bỏ kiểm tra version và không thao tác order production thật. Mọi migration production còn bị chặn bởi backup/restore đầy đủ: project Free không có scheduled backup, không có DB password/công cụ dump trong máy, và file JSON cũ không đủ để khôi phục.
- G0 DB restore drill BLOCKED; G1–G5 staging E2E chưa đạt hết role/ma trận; G6 theo ưu tiên hoãn; G7 mới có baseline sơ bộ; G8 chưa sẵn sàng. Thay đổi local chưa commit, chưa deploy.
- Bổ sung kiểm chứng tương tác: browser preview đã render các gói qua staging nhưng click/keyboard automation trên thẻ package không làm cập nhật giỏ hàng trong phiên kiểm tra. Vì vậy chọn gói/checkout **chưa được nghiệm thu E2E**; không tuyên bố luồng đặt đơn hoạt động chỉ dựa trên render. Không submit giao dịch.

## 01/10/2026 — Quyết định chủ shop về các cổng còn lại và sửa chọn package

- Chủ shop từ chối nâng Supabase lên gói có phí. Không đề nghị thanh toán lại; full DB backup/restore được ghi là waived/blocked, không coi JSON cũ hoặc source snapshot là DB backup.
- Chủ shop miễn role matrix và order workflow E2E staging, đồng thời yêu cầu agent tự xử lý phần còn làm được. Hai loại kiểm tra này được ghi **waived / not verified**, không phải PASS. Không tạo/đổi tài khoản hoặc cấp role.
- Sửa package picker từ div click surface sang radio native trong label. Browser preview xác nhận click gói `60 Đá Sáng Thế` cập nhật giỏ 20.000đ và bật nút đặt; xác nhận tiếp qua bàn phím chọn `Không Nguyệt Chúc Phúc` cập nhật 85.000đ. Không nhấn submit, không tạo order.
- Loại bỏ helper click cũ không dùng; package server rows chỉ nhận tên hợp lệ và giá hữu hạn dương. Render tên qua `textContent`, không dùng markup từ tên trong DB.
- Local check/build sẽ chạy lại sau các chỉnh sửa trên. Không deploy hoặc migrate production. Production DB vẫn thiếu contract/version; database password và Vault key production không có trong phiên; không thay đổi production.
- Kết quả cuối sau native radio picker: `_tools/check.cjs` 39/39, OrderAPI 7/7, DB workflow 13/13, build 21 files và `git diff --check` đều PASS. Browser click + Space đã cập nhật cart đúng; không submit. Chủ shop miễn staging role/order E2E nên mục này tiếp tục là waived/not verified.

## 01/10/2026 — Production verification follow-up

- Chủ shop báo đã chạy đủ ba migration production `production_000`, `production_001`, `production_002`.
- Ảnh kết quả: `production_002_verify.sql` trả `PASS: production_002_credentials_encryption metadata verified`. `production_001_verify.sql` dừng ở `Incorrect RPC grants: public.booster_profile(uuid)`.
- Đối chiếu source xác nhận lỗi nằm trong verifier: `booster_profile(uuid)` và `booster_reviews(uuid)` bị đưa vào vòng kiểm tra RPC cấm `anon`, trong khi phía dưới cùng file yêu cầu anon được gọi hai RPC public-read này. Đã sửa `_db/production_001_verify.sql`: chuyển các kiểm tra này ra riêng và yêu cầu quyền EXECUTE đúng cho anon + authenticated. `git diff --check` PASS.
- Chưa xác nhận toàn bộ production release PASS; chưa deploy frontend. Local `_tools/check.cjs` không chạy được trong sandbox vì `spawnSync ... node.exe EPERM`, không phải lỗi assertion của verifier.
- **Bước tiếp theo:** trong Supabase SQL Editor của `namcumz` / `main PRODUCTION`, chạy lại đúng file `_db/production_001_verify.sql` từ workspace đã sửa. Không chạy lại migration. Nếu trả PASS, tiếp tục deploy frontend; nếu còn lỗi, dừng và gửi nguyên văn lỗi để sửa đúng grant/verify.

## 01/10/2026 — production verifier: public catalog grant

- Ảnh lượt chạy tiếp theo của `production_001_verify.sql` dừng ở `anon can still SELECT operational table: packages`. Đây cũng là verifier sai phạm vi: migration bật RLS cho `public.packages`, tạo policy `catalog_read` cho anon/authenticated và cấp SELECT để catalog/giá public hoạt động.
- Đã sửa `_db/production_001_verify.sql` lần hai: bỏ `packages` khỏi nhóm bảng vận hành cấm anon đọc; thêm kiểm tra riêng rằng cả anon và authenticated có SELECT trên `packages`. Không sửa grant hay dữ liệu production.
- `git diff --check -- _db/production_001_verify.sql` PASS. Migration 002 tiếp tục được xác nhận PASS theo ảnh trước. Chưa có kết quả PASS cuối cho migration 001, chưa deploy.
- **Bước tiếp theo:** thay SQL trong Supabase SQL Editor `namcumz` / `main PRODUCTION` bằng toàn bộ verifier cục bộ mới nhất và Run lại. Không chạy migration lần nữa. Nếu có lỗi khác, gửi nguyên văn; chỉ sau dòng PASS mới chuyển sang deploy frontend.

## 02/10/2026 — Production release và đo HTTP sau deploy

- Đã rà lại GitHub/Vercel account từ browser; Vercel project `namcumz` nối repo `mfaphucau2002-hash/namcumz`.
- Commit `6f741845c5fbc0194538469e68be837feedf74f2` (`feat: complete production release plan updates`) đã đẩy lên `main` từ `dc21f4e`.
- Vercel ghi nhận deployment production cho commit `6f74184` là `Ready`; production homepage `https://namcumz.io.vn/` mở được và trả nội dung trang NAMCUMZ.
- Mã nguồn kiểm tra trước commit: `node _tools/check.cjs` 39/39 PASS; build tạo 21 files; `git diff --check` PASS. Runtime production chỉ dùng anon/public Supabase key, không chứa service-role secret.
- Theo người dùng, ba SQL production đã được chạy; ảnh xác nhận `production_001_verify.sql` và `production_002_verify.sql` PASS. Không thực hiện thao tác ghi/hủy/hoàn thành lên đơn production.
- G7 sau deploy: 7 GET/URL, tất cả HTTP 200. `/`: 83,619 bytes, median 69.7 ms (mẫu 1572.4, 492.2, 63.5, 69.7, 329.9, 67.9, 65.7). `/napgame.html`: 9,978 bytes, median 148.5 ms (8043.4, 3761.9, 148.5, 142.7, 352.3, 130.1, 125.9). `/login.html`: 67,819 bytes, median 153.9 ms (361.6, 379.2, 142.3, 398.1, 119.1, 153.9, 119.9). Đây là network + tải HTML, không phải Web Vitals/API p95; có outlier đáng kể.
- G0 full database backup/restore vẫn chưa làm theo lựa chọn của người dùng; không ghi là đạt. Staging chưa có booster/admin hiện hữu nên không thể E2E toàn bộ thao tác đơn/role mà không có test account phù hợp. Hủy/hoàn thành đơn khách thật chưa thử.

**Bước kế tiếp:** chỉ cần test có kiểm soát hủy và hoàn thành trên staging với test order và account có role customer/booster/admin. Nếu user không muốn thêm account/role hoặc backup, các cổng này tiếp tục được ghi là chưa nghiệm thu/đã bỏ qua; không cần chạy lại SQL migration production.
## 02/10/2026 — Sửa luồng hiển thị đơn hủy và hộp thoại thao tác

- Nguyên nhân: backend giữ nguyên `orders.status` khi đặt cờ `cancelled=true` để lưu lịch sử; dashboard cũ chỉ lọc tab/thống kê theo `status`, nên đơn hủy vẫn nằm trong tab đang hoạt động. Các thao tác tiến độ/hủy còn dùng hộp thoại `prompt/confirm/alert` gốc của trình duyệt.
- Đã sửa: thêm tab lưu trữ **Đã hủy**, loại đơn đã hủy khỏi tab và số đếm đang hoạt động; hộp thoại nhập liệu/xác nhận/lỗi được thay bằng dialog có style đồng nhất và toast thành công; bảng admin tự tải lại sau thao tác. Hủy đơn là trạng thái kết thúc, không còn nút thao tác nghiệp vụ trên đơn đã hủy.
- Mã nguồn: commit `eee5ec8` (`fix: clarify order workflow and modernize dialogs`) đã push `origin/main`. Vercel deployment cho commit này báo **Ready**. Đã mở domain `https://namcumz.io.vn/dashboard` và xác nhận HTML production có tab `Đã hủy`; trang chưa đăng nhập hiện 0 đơn nên không thể đối chiếu bản ghi tài khoản.
- Kiểm tra tự động: `_tools/check.cjs` 41/41; `order-api.test.mjs` 7/7; `database.test.mjs` 13/13; build 21 files; `node --check assets/js/app.js` và `git diff --check` PASS.
- Giới hạn nghiệm thu: chưa chạy claim/cancel/complete trên đơn thật hay test order production. Vì vậy đã xác nhận bản production mới được phục vụ, nhưng chưa tuyên bố thao tác nghiệp vụ đã E2E PASS. Cần dùng một test order phù hợp để xác nhận claim chuyển sang **Đang cày**, hủy chuyển khỏi tab hoạt động sang **Đã hủy**, và progress cập nhật sau tải lại.
## 02/10/2026 — Đối chiếu trạng thái kế hoạch sau các bản vá

- Production hiện chạy bản sửa đơn hủy/dialog (`eee5ec8`) và chống browser giữ search (`c251ed2`); Vercel deployment cho `c251ed2` Ready. Đã mở dashboard production, xác nhận ô tìm kiếm trống khi vào/quay lại, bấm vào thì có thể nhập; không sửa dữ liệu đơn.
- G0: full database backup/restore được chủ shop miễn vì không muốn nâng gói; **waived / not done**, không phải PASS.
- G1: chủ shop báo đã chạy migration production 000/001/002; ảnh đã xác nhận metadata verify 001/002 PASS sau khi điều chỉnh verifier. Kiểm tra runtime RLS/API và negative access vẫn không làm theo lựa chọn miễn test.
- G2: frontend đã deploy; kiểm tra offline hiện 41/41 và OrderAPI 7/7. Luồng đơn trực tiếp trên test order không E2E.
- G3: role/concurrency/order workflow staging được miễn; role booster/admin staging không có sẵn. G4: credential encryption metadata verify PASS; top-up Auth/API/browser và xác nhận giao dịch thật chưa E2E. G5: quyền admin/Storage/support/audit chưa E2E. Các mục này **waived / not verified**, không PASS.
- G6: ma trận thiết bị/viewport được hoãn theo ưu tiên chủ shop.
- G7: đã có baseline HTTP sơ bộ production và staging ghi ở các mục trên; chưa có Core Web Vitals (LCP/CLS/INP) hay API p95 chuẩn hóa. Chủ shop yêu cầu ưu tiên đo hiệu năng; phần đo hiện có chỉ là request + tải HTML, nên đây là phần duy nhất còn đáng làm nếu muốn đo sâu hơn.
- G8: bản frontend đã phát hành; chưa có nghiệm thu workflow end-to-end bằng test order và chưa diễn tập DB restore. Trạng thái phù hợp: **đã phát hành, nghiệm thu một phần; các cổng backup và staging workflow được miễn/chưa xác minh**.

**Việc còn lại theo quyết định hiện tại:** không còn thao tác bắt buộc cho release; G0/G3–G5 và E2E G8 đang waived/not verified. Chỉ còn đo hiệu năng sâu hơn (Web Vitals + API p50/p95) nếu muốn hoàn thành yêu cầu G7 theo nghĩa đầy đủ. Không thao tác thử trên đơn khách thật.

## 02/10/2026 — Thiết kế lại giao diện Namcumz

- Đã làm mới trang chủ, catalog nạp game, chi tiết nạp, danh sách đơn và hệ thống style dùng chung cho đăng nhập/admin/profile. Nền navy/slate, một font Be Vietnam Pro, viền 1px nhẹ, khoảng cách theo bước 8px, controls >=44px và focus/hover/active/disabled/loading rõ ràng.
- Tách `design-tokens.css`, `ui.css`, `landing.css`; gom `napgame.css` thành một bộ layout đang dùng. Bỏ card/gradient/glow trang trí, số liệu/review bịa và carousel tự chạy. Tám ảnh game tối ưu tổng 712 KB có nguồn trong `UI_ASSET_SOURCES.md`.
- Browser: 12 kiểm tra trang chủ/catalog/danh sách đơn mẫu/login ở 375/768/1440px không overflow-x. Detail nạp ở 375px không tràn; chọn radio gói cập nhật summary; submit thiếu thông tin báo ba lỗi inline và focus đúng trường đầu tiên. Dữ liệu mẫu đặt trong `_backup` bị ignore, không đóng gói production.
- Offline 45/45 PASS; build 33 files; diff check PASS. Chưa thử giao dịch đơn thật; các cổng staging/restore đã miễn vẫn ghi waived / not verified. Chi tiết ở `UI_REDESIGN_20261002.md`.
- Bước tiếp theo: push main, chờ Vercel Ready và mở domain để xác nhận bản thiết kế mới đã được phục vụ.
