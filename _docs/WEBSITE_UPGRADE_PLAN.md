# KẾ HOẠCH FIX & NÂNG CẤP WEBSITE NAMCUMZ

Ngày: 30/09/2026 • Phiên bản 2.0 • Trạng thái: Kế hoạch triển khai; trạng thái nghiệm thu mới nhất xem `_docs/IMPLEMENTATION_PROGRESS.md`

Căn cứ: _docs/AUDIT_2026-09-29.md, PROJECT_RULES.md, WORKSPACE_NOTES.md và mã nguồn hiện tại.

## 1. Mục tiêu và nguyên tắc

Website phải bảo vệ đúng dữ liệu khách; tạo/quản lý đơn chính xác; dễ dùng trên điện thoại; phản hồi rõ khi lỗi; khôi phục được khi phát hành gặp sự cố.

Giữ HTML/CSS/JavaScript + Supabase + Vercel hiện tại, tách module và bổ sung kiểm tra theo từng phần. Đổi framework không phải điều kiện để đạt các mục tiêu này. Chỉ đánh giá lại khi có số liệu cho thấy kiến trúc không đáp ứng.

Thứ tự G0 → G1 → G2 → G3 → G4 → G5 → G6 → G7 → G8. Mỗi thay đổi qua staging trước khi phát hành. Bản vá bảo mật G1 có thể ra sớm sau kiểm tra và chuẩn bị rollback, không phải đợi giao diện. AI là tùy chọn, hoạt động độc lập với đặt/quản lý đơn.

Audit gồm lỗi tái hiện và nguy cơ từ SQL; cần đối chiếu DB thật trước khi kết luận policy production. Không chạy lại tùy ý các script cũ. Giữ thay đổi Git hiện có, không tự khôi phục file đã xóa.

## 2. Lộ trình tổng thể

Ước lượng là ngày công cho một người tập trung, gồm kiểm tra từng phần; chưa gồm thời gian chờ quyền truy cập, ảnh/nội dung/quyết định kinh doanh. Cập nhật sau G0; không phải cam kết thời gian phiên làm việc hoặc giá dịch vụ.

| Giai đoạn | Phạm vi | Điều kiện hoàn thành | Ngày công |
|---|---|---|---|
| G0 — Hiện trạng | Git, kiểm kê DB, backup/restore, staging, nghiệp vụ | Khôi phục được; staging không ghi production; có baseline | 1–2 |
| G1 — Bảo mật | RPC Auth, role, dữ liệu riêng, XSS, Storage/chat | Test quyền trực tiếp đạt; không trả dữ liệu ngoài quyền | 2–4 |
| G2 — Nền ứng dụng | Auth state, module, migration, API, test | Login ổn định; dựng được DB thử; dữ liệu cũ được giữ | 2–4 |
| G3 — Cày thuê | Tạo/báo giá/nhận, tiến độ, nghiệm thu/review | Vòng đời đơn đạt, kể cả nhận đơn đồng thời | 3–5 |
| G4 — Nạp game | Catalog thật, UID/login, giá server, thanh toán | Đúng khách/game/gói/giá; không bán gói mẫu | 2–4 |
| G5 — Vận hành | Admin/booster, chat/ảnh, hỗ trợ, log/notification | Xử lý được đơn và sự cố, truy vết được | 2–3 |
| G6 — Giao diện | 8 trang, mobile, component/media, accessibility/SEO | Không vỡ bố cục; đủ trạng thái tải/lỗi/trống | 3–5 |
| G7 — Hiệu năng | Query, Realtime, tải asset, AI tùy chọn, theo dõi lỗi | Có số đo; lỗi tích hợp không chặn đơn hàng | 1–2 |
| G8 — Phát hành | Hồi quy, diễn tập migration, nghiệm thu, rollback | Đạt checklist và kiểm chứng bản đã phát hành | 2–4 |

Tổng 18–33 ngày công; dự phòng khoảng 20%: 22–40 ngày công. Cổng thanh toán tự động, đổi framework, thiết kế lại toàn bộ thương hiệu không nằm trong khoảng này. Sự cố rò rỉ thực tế nếu được xác nhận cần xử lý riêng và cập nhật lịch.

## 3. Quyết định nghiệp vụ cần chốt

Đây là mặc định đề xuất, chưa phải yêu cầu chủ shop đã xác nhận.

| Mã | Nội dung | Phương án đề xuất và tác động |
|---|---|---|
| Q01 | Khách chưa đăng nhập | Xem dịch vụ/giá public, gửi tư vấn; đăng nhập trước tạo đơn chính thức/chat/gửi thông tin game. Guest checkout đầy đủ cần xác minh và token nhận đơn một lần, thêm phạm vi G3 |
| Q02 | Đăng nhập | Giữ tài khoản cũ; tách username/display name/email xác minh. Ưu tiên email thật hoặc Google cho tài khoản mới sau khi chốt UX. Không tự đổi email đăng nhập cũ |
| Q03 | Giá/thanh toán | Đơn cày được admin báo giá, khách chấp thuận; admin xác nhận thanh toán thủ công và ghi log. Cổng thanh toán/webhook làm đợt sau |
| Q04 | Nhận đơn | Booster chỉ nhận đơn shop duyệt, đạt điều kiện tiền. Chủ shop chốt thanh toán toàn bộ hay đặt cọc, server thực thi thống nhất |
| Q05 | Thông tin game | Không đặt pass trong ghi chú/chat. Nếu cần: form riêng, mã hóa server, quyền tối thiểu, thời hạn lưu được chốt. Chỉ mở gói login sau cơ chế này; không lưu OTP/mã khôi phục dài hạn |
| Q06 | Hủy/hoàn/làm lại | Trước khi bắt đầu có thể yêu cầu hủy; đang làm chuyển admin. Theo dõi hoàn tiền riêng. Phí/thời hạn/điều kiện do chủ shop chốt |
| Q07 | Công khai | Khách thấy catalog/review được duyệt/số liệu tổng hợp; booster thấy mô tả tối thiểu của đơn có thể nhận. Không public contact, giá riêng, secret_code hoặc credentials |
| Q08 | Trang thiếu/xóa | Giữ trang hiện hành; ẩn link Check Scam chưa hoạt động. Xác minh ý định đối với 3 file cày thuê bị xóa; không tự khôi phục |
| Q09 | Nhận diện | Giữ nền tối, tím/teal/vàng và font brand; thống nhất Zalo/giờ hỗ trợ. Chủ shop cung cấp nội dung/media thật; staging ghi rõ placeholder |
| Q10 | AI | Tùy chọn cho admin/booster; chỉ mục tiêu đã lọc thông tin riêng; kết quả là bản nháp. Chốt ngân sách; AI không tự đổi giá/nhận/nghiệm thu đơn |

G0/G1 có thể tiến hành trong khi hoàn thiện quyết định giao diện. Q01–Q07 cần chốt trước thiết kế dữ liệu/vòng đời đơn cuối cùng.

## 4. Bảng công việc chi tiết

P0: xác minh và xử lý ngay nếu còn tồn tại. P1: bắt buộc cho bản ổn định. P2: hoàn thiện trải nghiệm. P3: tùy chọn. Tiến độ thực tế xem [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md); chưa có giai đoạn nào được nghiệm thu toàn bộ. Mã trong ngoặc tham chiếu audit.

### G0 — Chuẩn bị an toàn

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 0.1 / P1 | Snapshot Git, lưu thay đổi dở, danh sách sửa/xóa/untracked; nhánh triển khai (D4) | Không | Có mốc khôi phục; không mất công việc hiện tại |
| 0.2 / P0 | Kiểm kê schema/constraints/indexes/RLS/grants/RPC/triggers, Auth/Storage/Realtime và host (A1–A7, D3) | Quyền đọc cấu hình | Biết lỗi nào còn tồn tại; báo cáo bỏ bí mật |
| 0.3 / P1 | Sửa backup: thư mục cố định, phân trang, đủ bảng, lỗi rõ; schema/Auth/Storage theo hỗ trợ; restore riêng (D1) | 0.2 | Đối chiếu hàng/quan hệ, restore đạt, bí mật không vào Git/deploy |
| 0.4 / P1 | Tách môi trường; user test customer A/B, booster A/B, admin/super_admin; dữ liệu giả | 0.2 | Preview đúng staging; thiếu config báo lỗi; không tự ghi production. Local allowlist smoke PASS; Auth/API/browser E2E đang chờ config và tài khoản thử |
| 0.5 / P1 | Chốt Q01–Q10; baseline các luồng, desktop/mobile, tốc độ | 0.1 | Có đầu vào còn thiếu, người phụ trách, bằng chứng trước sửa |

Nếu 0.2 xác nhận public Auth/lộ dữ liệu nhạy cảm, vá tối thiểu G1 ngay sau kiểm tra cần thiết, không trì hoãn để hoàn thiện tài liệu/backup toàn hệ thống.

### G1 — Bảo mật

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 1.1 / P0 | Thu hẹp/vô hiệu RPC Auth public nếu có; rà SECURITY DEFINER, EXECUTE, caller/search_path (A1/A6) | 0.2 | Guest/customer không lấy bản ghi Auth; RPC hợp lệ vẫn chạy |
| 1.2 / P0 | Bỏ role từ username/metadata; tách role khỏi hồ sơ tự sửa; bảo vệ đổi role/admin cuối (A2) | 0.2/0.4 | Giả role bị chặn; super_admin đổi quyền có log |
| 1.3 / P0 | Khóa đọc rộng đơn; projection public và phần riêng, bảo vệ content/secret_code/contact cũ (A3) | 0.2, Q05/Q07 | Không đọc chéo qua API/view/RPC/Realtime; view không bỏ qua RLS |
| 1.4 / P1 | DOM an toàn, sanitize HTML/Markdown cần dùng, kiểm tra URL/file (A4) | 0.4 | Payload tên/bio/đơn/chat/review/notification không thực thi |
| 1.5 / P1 | Quyền ghi/chuyển trạng thái ở server, sender/owner từ phiên; hạn chế direct update (A5/A7) | 1.2, ma trận quyền | Request sai vai trò/cột/đơn bị chặn dù sửa client |
| 1.6 / P1 | Storage private theo đơn, URL có hạn; size/MIME; giới hạn gửi form/chat/thử mã server | 1.2–1.5 | Không tải chéo file; file sai/oversize/spam bị chặn |
| 1.7 / P1 | Secret ở server; log bỏ riêng tư; CSP từng bước; output deploy allowlist (D3) | 0.4/1.4 | Bundle/log không secret; không public SQL/backup/script; Auth vẫn hoạt động |

G1 đạt khi cả test được phép và bị cấm đều đạt. Nếu xác nhận rò rỉ thực tế, xử lý theo phạm vi, thu hồi/đổi đúng bí mật bị ảnh hưởng; không mặc định anon key public là secret cần thay.

### G2 — Nền ứng dụng

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 2.1 / P1 | Module auth/API/orders/chat/notification/UI; trang chỉ khởi tạo phần cần (D2) | G1 | Không mất chức năng/duplicate listener; login không tải mọi đơn |
| 2.2 / P1 | Một auth state loading/ready/signed-out; sửa currentUser, ID null, race, logout nhiều tab (B2/B3) | 1.2/2.1 | Reload/link trực tiếp đúng quyền; guest không thành owner; hết phiên rõ |
| 2.3 / P1 | Validation/login/register một handler, đúng loading, timeout/remember-me; display name riêng (B4/B5) | Q02/2.2 | Sai input không gửi; submit không nhân đôi; đổi tên không mất login |
| 2.4 / P1 | Migration từ DB thật, FK/index/check/unique, sửa delimiter RPC, ledger và policy không chồng (B7) | 0.3/0.4, Q01–Q07 | Dựng DB mới/nâng mẫu cũ đạt; không âm thầm chạy lại; số hàng đúng |
| 2.5 / P1 | API service: chọn cột/phân trang, timeout/cancel/request ID, affected rows, idempotency cho retry ghi | 2.1/2.4 | Không success khi 0 hàng/lỗi ghi; retry không tạo trùng |
| 2.6 / P1 | Check JS/HTML/CSS/asset/link, quyền DB và integration, không public công cụ test | 0.4/2.1 | Bắt AI parse/NUL/null/quyền chéo; có lệnh chạy được ghi rõ |

### G3 — Cày thuê

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 3.1 / P1 | Trường riêng dịch vụ/server/mục tiêu/deadline/ghi chú; guest theo Q01; mã đơn unique server | G2/Q01 | Đúng owner; dữ liệu sai bị chặn server/UI; submit lại không trùng |
| 3.2 / P1 | Báo giá → khách chấp thuận → xác nhận tiền; lịch sử giá; client không quyết giá cuối | 3.1/Q03/Q04 | Sửa giá có actor/thời điểm/lý do; sau chấp thuận cần xác nhận lại |
| 3.3 / P1 | Nhận/giao/chuyển booster theo ID, giao dịch nguyên tử, điều kiện tiền/duyệt (A5/B11) | 1.5/3.2 | Hai request chỉ một nhận được; đổi người có log; bên thua thấy trạng thái mới |
| 3.4 / P1 | Checklist/mốc tiến độ, ảnh, deadline/quá hạn, tạm dừng/lý do | 3.3/1.6 | Khách/booster thấy cùng tiến độ; không giả % hoàn thành bằng hằng số theo status |
| 3.5 / P1 | Nghiệm thu/làm lại/hoàn thành/review một lần; modal chung profile/dashboard (B10) | 3.4 | Chỉ chủ đơn đủ điều kiện review; không giữ nhầm sao/comment của đơn trước |
| 3.6 / P1 | “Của tôi”, filter/search/pagination server; hủy/lưu trữ đúng quyền; giữ đơn/mã nhận cũ nếu cần (A6) | 2.5/3.1–3.5 | Đúng tổng và phạm vi; không mất đơn cũ; không xóa dây chuyền ngoài ý muốn |

### G4 — Nạp game

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 4.1 / P1 | Catalog game/package/type/server/giá/ảnh/trạng thái thật; khớp alias/banner; bỏ đặt gói fallback (B8) | G2, danh mục shop | Card bán có cấu hình hợp lệ; ID lạ/gói tắt không đặt được |
| 4.2 / P1 | Form UID/login đúng loại, server/contact/hướng dẫn; giữ nguyên pass khi nhập (B9) | 4.1/Q05 | UID không đòi pass; field khớp game, server kiểm tra lại |
| 4.3 / P1 | Nếu cần credentials: form/kho riêng, mã hóa server, key tách DB, quyền hẹp, log truy cập bỏ giá trị, retention đã chốt | G1/Q05 | Không vào content/chat/analytics/AI/browser storage; ngoài quyền không đọc được |
| 4.4 / P1 | Owner từ phiên, server tra giá catalog và lưu snapshot, idempotency; thống nhất orders + phần chi tiết (B2/B9) | 2.2/4.1–4.3 | Sửa giá client không ảnh hưởng; đơn xuất hiện đúng hồ sơ |
| 4.5 / P1 | Thanh toán thủ công: tham chiếu/chờ/đã xác nhận/hoàn nếu hỗ trợ; bill hạn chế quyền | Q03/Q06/4.4 | Khách không tự đánh dấu đã trả; admin xác nhận có log; tách trạng thái thực hiện |
| 4.6 / P2 | Chi tiết/lịch sử đơn, bill/kết quả, trạng thái lỗi/hỗ trợ; ticker trường public đã duyệt | 4.4/4.5 | Theo dõi được; lỗi không success; ticker không có contact/credentials |

### G5 — Vận hành shop

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 5.1 / P1 | Admin đơn cày/nạp: filter/chi tiết/giá/tiền/phân công/tạm dừng/hủy, phân biệt super_admin | G3/G4/1.2 | Nút đúng quyền; server kiểm tra lại; thống kê đúng phạm vi |
| 5.2 / P1 | Booster chờ duyệt/hoạt động/tạm ngừng; role đúng, gán ID, hồ sơ/số liệu thật | 1.2/3.3 | Chưa duyệt/ngừng không nhận mới; xử lý đơn đang làm có quy tắc |
| 5.3 / P1 | Chat/ảnh theo đơn, lịch sử phân trang, giữ bản nháp, chống trùng, cleanup/reconnect (B12) | 1.4–1.6/2.5 | Mất mạng không mất nháp; tin một lần; chuyển đơn không lẫn tin |
| 5.4 / P1 | Ticket/recovery: tạo/tiếp nhận/xử lý/giải quyết, đúng quyền; success sau ghi thật (B12) | 1.5/2.5/Q02 | Ticket tới admin; thiếu kết nối không báo success; có người và lịch sử xử lý |
| 5.5 / P2 | Notification server theo sự kiện, read/unread; Telegram tùy chọn, bỏ bí mật | 1.7/G3/G4/5.3/5.4 | Đúng người, không giả/lặp khi retry; lỗi Telegram không làm đơn lỗi |
| 5.6 / P1 | Log actor từ phiên, đối tượng/thời điểm/lý do/version/request ID; log cùng transaction quan trọng | 1.5/G3/G4 | Không tự sửa/xóa log; tra được đổi giá/quyền/status; không log mật khẩu |

### G6 — Giao diện toàn website

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 6.1 / P2 | Chung header/footer/menu/token/font/spacing/button/input/card/badge/modal/toast; bỏ trùng/NUL (C2/C3) | G2/Q09 | 8 trang cùng nhận diện; CSS parse đạt; giữ font/token brand |
| 6.2 / P1 | Mobile-first 360/390/414/768/1024/1440px; sửa container/ticker/breadcrumb, bảng/modal/keyboard/thanh đặt (C1) | 6.1/G3/G4 | Không tràn ngoài vùng cuộn chủ đích; CTA/nút đóng không bị che |
| 6.3 / P2 | Trang chủ: CTA rõ, giá nhất quán, media có fallback, ưu điểm/số liệu/review có căn cứ (C4) | Q09/1.3 | CTA đúng luồng; không trình bày số liệu mẫu là thật |
| 6.4 / P2 | Dashboard/profile/booster/admin: thứ bậc, filter/lịch sử; đủ loading/error/empty/success | G3/G5/6.1 | Người dùng hiểu trạng thái, có thử lại; không màn trắng hoặc chỉ dựa màu |
| 6.5 / P2 | Catalog/detail: ảnh đúng, so gói/giá/tổng rõ, FAQ/contact nhất quán; khóa gói chưa có | G4/Q09/6.2 | Không 404 asset dùng thật; ảnh không nhảy bố cục; tổng kết đúng |
| 6.6 / P2 | Keyboard/focus/label/tên nút/contrast/reduced motion; title/meta/canonical/sitemap public, noindex tài khoản; chính sách/404 | 6.1–6.5, nội dung shop | Luồng chính dùng bàn phím; modal trả focus; không link # giả; noindex không thay bảo mật |

### G7 — Hiệu năng và tích hợp

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 7.1 / P1 | Đo query/request, chọn cột/phân trang/index, tránh N+1/gọi kép/render lại toàn bộ | G2–G5 | Không tải mọi đơn/tin mỗi trang; có baseline và số đo sau sửa |
| 7.2 / P2 | Ảnh đúng kích thước, lazy-load ngoài màn, font/module vừa đủ, cache asset version, giảm animation/video nặng | G6 | Đạt ngân sách mục 9; private data không cache public; không kẹt JS cũ |
| 7.3 / P1 | Timeout/cancel, reconnect backoff, cleanup timer/subscription; idempotency; hết phiên/tab ngủ | 2.5/5.3 | Mạng chậm/mất/lại không trùng đơn/tin hoặc treo nút |
| 7.4 / P3 | AI: sửa parse, server giữ key, xác minh model/API lúc build, lọc prompt/sanitize output, hạn mức/cancel/cache | 1.4/1.7/G3/Q10 | Không gửi credentials/contact không cần thiết; lỗi không chặn đơn; AI không tự sửa nghiệp vụ |
| 7.5 / P1 | Error monitoring frontend/server, redaction, request ID, cảnh báo có hành động, runbook | 1.7/G3–G5 | Lỗi thử truy vết được; không log token/pass/toàn bộ payload nhạy cảm |

Sửa lỗi parse hoặc cô lập phần AI hỏng sớm trong 2.6; P3 chỉ áp dụng nâng cấp AI đầy đủ, không có nghĩa để lỗi console tồn tại trong bản ổn định.

### G8 — Nghiệm thu và phát hành

| ID / ưu tiên | Công việc | Phụ thuộc | Nghiệm thu |
|---|---|---|---|
| 8.1 / P1 | Test quyền API/SQL/Storage/Realtime và end-to-end theo mục 10 | G1–G7 bắt buộc | Không còn P0/P1 trong phạm vi phát hành; có bằng chứng |
| 8.2 / P1 | Diễn tập migration dữ liệu ẩn danh, count/FK/orphan/map status/user/giá; tương thích frontend cũ/mới | 0.3/2.4/G3/G4 | Đơn cũ còn dùng được; dữ liệu mơ hồ được đối soát, không tự gán theo tên |
| 8.3 / P1 | Shop nghiệm thu staging các luồng; chốt giá/nội dung/contact | 8.1/8.2 | Mỗi nghiệp vụ có kết quả; điểm còn mở có quyết định |
| 8.4 / P1 | Backup kiểm chứng, release notes/version/migration, rollback cụ thể; deploy từng bước | 8.3 | Không mất giao dịch mới; đúng version/môi trường; có người phụ trách |
| 8.5 / P1 | Theo dõi sau release theo lịch thống nhất: ngay, 24h, 72h; bàn giao runbook | 8.4 | Không lỗi nghiêm trọng mới; đơn/quyền đúng; có backlog tiếp theo |

Mục 8.5 là công việc trong kế hoạch, chưa tạo automation/monitor ở bước này.

## 5. Kiến trúc và dữ liệu đích

Thiết kế logic dưới đây cần đối chiếu G0 trước khi chốt tên cột/bảng. Bước lập kế hoạch không tạo bảng hoặc đổi schema.

| Thành phần | Trách nhiệm |
|---|---|
| HTML/CSS + module JS theo trang | Hiển thị/nhập/validation hỗ trợ/loading; không quyết định quyền thật và giá cuối |
| Auth state chung | Phản ánh phiên đã xác minh; localStorage không là nguồn cấp quyền |
| PostgreSQL/RLS/RPC | Sở hữu, quyền hàng/cột, constraints, nhận đơn/chuyển trạng thái nguyên tử, giá/idempotency |
| Hàm server tích hợp | Giữ secrets, xác thực/phân quyền, lọc dữ liệu AI/Telegram, xử lý credentials riêng nếu cần |
| Storage private | Ảnh/bill/tiến độ theo đơn; URL có hạn và chính sách lưu giữ |
| Staging + kiểm tra tự động | Chứng minh quyền/nghiệp vụ/mobile/migration trước production |

Ưu tiên ít thành phần mới. Phiên bản thư viện/SDK/model được xác minh và khóa khi triển khai; không chọn chỉ theo tên hiện có trong code.

| Miền dữ liệu | Thiết kế đề xuất | Bảo toàn hiện trạng |
|---|---|---|
| Tài khoản/hồ sơ/role | Auth ID ổn định, display name riêng, quyền do server | Giữ ID/khả năng login; không đổi tên hiển thị thành định danh mới |
| orders | Bảng gốc cày/nạp: loại, owner/assignee, status, giá chốt, version/timestamps | Giữ ID/mã cũ; thêm cột; không ép parse mọi content thành công |
| Chi tiết dịch vụ | Game/package snapshot/server/mục tiêu/deadline/checklist riêng | Backfill phần chắc chắn; mơ hồ đưa vào đối soát |
| Dữ liệu riêng | Contact/game tách public; credentials có mã hóa server nếu cần | Khóa đọc rộng trước; chuyển có kiểm chứng; xóa plaintext cũ chỉ sau đối soát/phê duyệt cụ thể |
| Catalog/giá | Game/package có ID/version/trạng thái bán, server tra giá | Không tính lại giá lịch sử bằng giá mới |
| Thanh toán | Cần thu/đã xác nhận/hoàn, tham chiếu, actor xác nhận | Không suy ra đã trả từ status hoàn thành; ghi chưa đối soát nếu chưa biết |
| Chat/ảnh/tiến độ | Order ID, sender từ auth, loại nội dung; file tách message | Giữ liên kết cũ; chuyển theo lô có kiểm chứng |
| Review/ticket/notification/log | Quyền theo chủ thể, review đúng đơn, log/notification server | Bổ sung schema thiếu dựa DB thật, giữ lịch sử |

Migration: **thêm cấu trúc tương thích → khóa quyền cần thiết → backfill/đối soát → chuyển app → theo dõi → xử lý cấu trúc cũ đợt riêng**. Nếu quyền cũ đang lộ dữ liệu, vá tối thiểu trước backfill hoàn chỉnh. Không đưa plaintext sang “legacy” nhưng vẫn public.

RLS bảo vệ theo hàng; cột riêng tư cần tách bảng/projection/grant phù hợp. Chọn ít cột trên frontend không thay thế kiểm soát truy cập.

## 6. Ma trận quyền mục tiêu

Test bằng request trực tiếp, không chỉ ẩn/hiện nút.

| Hành động | Khách | Customer | Booster duyệt | Admin | Super admin |
|---|---|---|---|---|---|
| Catalog/giá public/review duyệt | Có | Có | Có | Có | Có |
| Đơn đầy đủ | Không | Đơn mình | Đơn được giao, phần cần thiết | Phạm vi quản trị | Phạm vi quản trị |
| Danh sách có thể nhận | Không | Không | Mô tả tối thiểu, đủ điều kiện | Có | Có |
| Tạo đơn | Tư vấn theo Q01 | Có | Nếu có chế độ khách | Tạo hộ có log | Có |
| Giá/tiền | Không | Chấp thuận giá; không tự xác nhận thu tiền | Không | Báo giá/xác nhận thu | Có |
| Nhận/tiến độ | Không | Không | Đúng đơn/trạng thái | Phân công/điều phối | Có |
| Credentials game | Không | Thông tin mình theo UX chốt | Đang được giao và cần xử lý | Quyền nghiệp vụ hẹp, có log | Không mặc định tải hàng loạt |
| Chat/ảnh | Không | Đơn mình | Đơn được giao | Đơn đang xử lý | Theo nhu cầu xử lý |
| Nghiệm thu/review | Không | Đúng chủ/trạng thái | Không tự review | Xử lý tranh chấp, không viết thay khách | Tương tự |
| Sửa hồ sơ | Không | Hồ sơ mình, trừ role/ID | Tương tự | Tương tự | Tương tự |
| Cấp/thu hồi role | Không | Không | Không | Không mặc định | Có, kiểm tra bổ sung/log |
| Xóa vĩnh viễn/restore | Không | Không | Không | Quy trình riêng được duyệt | Quy trình riêng, không tùy tiện |

Quyền quản trị đơn không đồng nghĩa được đọc bản ghi Auth/password hash. Service-role key chỉ ở server được kiểm soát.

## 7. Luồng đơn và thanh toán

| Trạng thái đề xuất | Người/thao tác | Điều kiện |
|---|---|---|
| Chờ báo giá/duyệt | Customer hoặc admin tạo hộ | Owner/input đúng; không credentials trong ghi chú |
| Chờ chấp thuận/thanh toán | Admin báo giá hoặc server tra catalog | Có snapshot giá/điều kiện |
| Chờ nhận | Server sau xác nhận hợp lệ | Đạt tiền/đặt cọc Q04 và đủ thông tin |
| Đang thực hiện | Booster nhận nguyên tử/admin giao | Assignee hợp lệ; chỉ một người nhận |
| Chờ nghiệm thu | Booster được giao | Checklist/bằng chứng và thông báo |
| Hoàn thành | Customer nghiệm thu; admin ngoại lệ theo quy tắc | Actor/thời điểm; mở quyền review |
| Tạm dừng/cần hỗ trợ | Yêu cầu theo quyền | Lý do, bên phản hồi, hướng tiếp tục |
| Hủy | Chủ thể theo Q06 | Lý do/đối soát tiền; không đồng nghĩa xóa bản ghi |

Map từ cho_xu_ly/dang_cay/cho_nghiem_thu/hoan_thanh/tam_dung đang có; không đổi hàng loạt theo giả định.

Thanh toán độc lập: chưa xác nhận → đã xác nhận/đặt cọc → hoàn một phần/đủ nếu hỗ trợ. Nạp có thể nghiệm thu gọn hơn theo shop. Không mặc định tự nghiệm thu theo thời hạn hoặc tự hoàn tiền khi chưa có quy tắc.

## 8. Đầu vào và trách nhiệm

| Nhóm | Trách nhiệm/đầu vào |
|---|---|
| Người triển khai | Code, migration, test, tài liệu, bằng chứng, đề xuất và thực hiện release trong phạm vi được giao |
| Chủ shop | Q01–Q10, giá/game/gói, liên hệ, media/nội dung thật, điều khoản vận hành, nghiệm thu staging |
| Người quản trị hạ tầng | Quyền Supabase/Vercel phù hợp, cấu hình môi trường/backup, khả năng phục hồi của dịch vụ |
| Dữ liệu thử | Customer A/B, booster A/B, admin/super_admin, đơn cày/nạp, ảnh/bill giả; không sao chép credentials khách |

Thiếu quyền DB vẫn làm được kiểm tra frontend, thiết kế component và test với dữ liệu giả. Phần migration/quyền production phải chờ đầu vào, không tự đoán. Không yêu cầu gửi secret trong chat; cấu hình ở nơi lưu bí mật phù hợp khi triển khai.

## 9. Chuẩn “ổn định và mượt” để nghiệm thu

Đây là mục tiêu nội bộ đề xuất, điều chỉnh theo baseline, hosting/vùng người dùng/dữ liệu/ngân sách. Điểm lab không thay thế dữ liệu thực.

| Hạng mục | Mục tiêu |
|---|---|
| Bảo mật | Tất cả test quyền âm/dương đạt; không rò qua API/Storage/Realtime |
| Nghiệp vụ | Double-submit/retry không trùng đơn; concurrent claim chỉ một thành công; lỗi backend không success |
| Tải trang | LCP ≤ 2,5s; CLS ≤ 0,1 trên cấu hình đo thống nhất, nhiều lượt, ghi thiết bị/mạng |
| Tương tác | INP ≤ 200ms khi đủ số liệu thực; phản hồi khi bấm khoảng 100ms, công việc lâu có loading |
| API | p95 dưới 1s cho đọc/ghi đơn thông thường trên bộ dữ liệu và vùng staging ghi rõ; upload/AI đo riêng |
| Quy mô thử | Khoảng 1.000 đơn, 10.000 tin tổng bằng dữ liệu giả; phân trang/filter/index đúng |
| Mobile | 360/390/414/768/1024/1440px; CTA không che, bảng cuộn trong khung, keyboard dùng được |
| Mạng yếu | Nháp giữ lại; reconnect không trùng; timeout rõ; không spinner vô hạn |
| Accessibility | Keyboard/focus/label/reduced motion; không chỉ màu để báo trạng thái |
| Chất lượng | Không lỗi JS chưa xử lý/404 asset do app trong luồng nghiệm thu; dữ liệu thật hoặc nhãn minh họa |
| Khôi phục | Chốt RPO (mức mất dữ liệu chấp nhận) và RTO (thời gian khôi phục) theo nhu cầu/gói dịch vụ; đo restore thực |

## 10. Ma trận kiểm thử

| Nhóm | Kịch bản bắt buộc | Môi trường |
|---|---|---|
| Auth | Đúng/sai, tài khoản cũ/Google, hết phiên, reload/link trực tiếp, nhiều tab, recovery | Staging |
| Quyền | Các vai trò A/B, sửa localStorage/payload/ID/role metadata; gọi API/RPC trực tiếp | Staging/API/SQL |
| Cày | Tạo → giá → tiền → nhận → tiến độ/chat → nghiệm thu/review; hủy/dừng/làm lại | Staging |
| Đồng thời | Hai booster nhận; submit hai lần; version cũ; retry sau timeout | Staging |
| Nạp | Mỗi gói bán, UID/login/server, gói tắt/đổi giá, giá client giả, owner/tiền | Staging |
| Chat/Storage | Ngoài quyền, sai file/oversize, URL hết hạn, reconnect/chuyển đơn/trùng/thứ tự | Staging |
| XSS/riêng tư | Tên/bio/đơn/review/chat/notification/Markdown; URL/log/analytics/cache/output | Staging |
| Admin/hỗ trợ | Gán booster, role bị giới hạn, ticket tới hàng đợi, actor log, zero-row update | Staging |
| Migration/backup | Mẫu cũ, mơ hồ/orphan, map user/status/giá lịch sử, restore/count/FK | DB test riêng |
| UI/hiệu năng | Viewport mục 9; Chrome/Edge và Safari mobile thực khi có, keyboard/mạng yếu/back | Staging |
| Sau release | Đúng version/môi trường, trang/login/quyền; ghi chỉ qua user test và kế hoạch thống nhất | Production có kiểm soát |

Thiết bị chưa thử ghi “chưa xác minh”, không đánh dấu đạt dựa mô phỏng tương đương.

## 11. Phát hành và rollback

Mỗi đợt có phạm vi, file/migration, test, lỗi còn lại, bằng chứng staging và rollback. Commit theo repo; tách bản vá quyền khẩn cấp khỏi đổi UI lớn.

| Sự cố | Cách xử lý |
|---|---|
| Frontend lỗi | Về bản tương thích đã kiểm chứng hoặc tắt tính năng; kiểm tra cache/version |
| Migration lỗi | Dừng rollout; ưu tiên sửa tiến, tránh DROP; bảo toàn giao dịch phát sinh mới |
| Policy siết quá | Sửa quyền tối thiểu cho luồng hợp lệ, không quay lại public rộng |
| AI/Telegram lỗi | Tắt tích hợp bằng config, giữ luồng đơn; retry/queue có kiểm soát |
| Dữ liệu sai | Dừng phần ghi liên quan, lưu bằng chứng, đối soát sau mốc backup; restore chọn lọc được duyệt |
| Backup cũ | Không restore đè chỉ vì có file; có thể mất đơn sau backup. Thử phục hồi riêng và xét RPO/RTO |

Trước thay đổi lớn dùng backup đã sửa/kiểm chứng ở 0.3; script hiện tại chưa đủ chứng minh an toàn. Ghi snapshot vào tài liệu vận hành/NAP_GAME_PLAN theo repo. DELETE/DROP bảng, xóa dữ liệu khách và dọn localStorage toàn bộ không tự thực hiện ngoài phạm vi được yêu cầu cụ thể.

Nếu phát hành phát hiện lộ dữ liệu, sai giá/owner, ghi trùng, mất login diện rộng: dừng rollout và xử lý ngay, không chờ hết 24–72h theo dõi. Rollback không được khôi phục lại lỗ hổng đã vá.

## 12. Đối chiếu audit và theo dõi tiến độ

| Audit | Hạng mục kế hoạch |
|---|---|
| A1 | 0.2, 1.1 |
| A2 | 1.2, 2.2, 5.1 |
| A3 | 1.3, 4.3, 4.6 |
| A4 | 1.4, 7.4 |
| A5 | 1.5, 3.2, 3.3 |
| A6 | 1.1, 1.3, 3.6 |
| A7 | 1.5, 5.3, 5.5 |
| B1 | 2.6 và 7.4; sửa/cô lập parse sớm |
| B2 | 2.2, 4.4 |
| B3 | 2.2, 3.6 |
| B4, B5 | 2.3 |
| B6 | Q01, 3.1 |
| B7 | 0.2, 2.4, 8.2 |
| B8 | 4.1 |
| B9 | 4.2, 4.4 |
| B10 | 3.5 |
| B11 | 3.3, 5.2 |
| B12 | 2.5, 3.6, 5.3, 5.4 |
| C1 | 6.2 |
| C2 | 6.1 |
| C3 | Q08, 6.1, 6.5, 6.6 |
| C4 | 4.6, 6.3, 6.5 |
| C5 | 6.6 |
| D1 | 0.3, 8.2, 8.4 |
| D2 | 2.1, 2.6 |
| D3 | 0.2, 1.7, 5.5, 7.4, 8.4 |
| D4 | 0.1 |

Mỗi ID theo trạng thái Chưa bắt đầu → Đang làm → Chờ kiểm tra → Đạt. Mục thiếu đầu vào ghi Chờ đầu vào và lý do. Không đánh dấu xong chỉ vì code đã viết.

| Cổng | Trạng thái | Bằng chứng kiểm thử & Phát hành | Ghi chú |
|---|---|---|---|
| G0 — Hiện trạng & An toàn | **Bị chặn: backup/restore** | Snapshot mã nguồn có; Supabase production Free không có project backups; chưa chứng minh restore DB | Cần backup đầy đủ và restore vào môi trường cô lập |
| G1 — Bảo mật hệ thống | **Chờ xác minh live** | Migration và verify scripts có trong repo; cần chạy/đối chiếu trên đúng DB | Code/RLS thiết kế không thay cho API test |
| G2 — Nền ứng dụng & Idempotency | **Đã triển khai cục bộ; chờ nghiệm thu** | `assets/js/order-api.js` và kiểm thử offline được ghi nhận | Cần kiểm thử Auth/API/E2E thật |
| G3 — Dịch vụ cày thuê | **Chờ nghiệm thu** | Có workflow RPC và giao diện | Cần vai trò A/B và concurrent claim trên staging |
| G4 — Nạp game (Login Top-up) | **Staging DB smoke đạt; production/nghiệp vụ chờ nghiệm thu** | `staging_004_credentials_encryption` verify PASS; dữ liệu giả rollback sau smoke | Chưa test Auth/API/browser; catalog/giá cần xác minh shop; production migration chưa chạy |
| G5 — Vận hành shop | **Chờ nghiệm thu** | Có giao diện admin/booster/support | Cần kiểm tra quyền/API/Storage thật |
| G6 — Giao diện toàn website | **Đang tạm ổn; chờ kiểm tra thiết bị** | Có các trang và liên kết trong repo; lượt này không sửa UI | Mobile/browser matrix chưa có bằng chứng đầy đủ |
| G7 — Hiệu năng & Tích hợp | **Đang đo sơ bộ** | 5 HTML GET production: `/` median 65.3ms/82,969B; `/napgame.html` median 129ms/10,000B | Chỉ là network GET; cần browser Web Vitals và API p95 cùng điều kiện |
| G8 — Nghiệm thu & Phát hành | **Chưa sẵn sàng; lỗi production đã xác định** | Production thiếu `orders.version`, `public.app_contract_version()` và migration ledger; Free Plan không có project backups | Chặn migration/deploy đến khi backup/restore và staging E2E đạt; chi tiết ở `IMPLEMENTATION_PROGRESS.md` |

**Tổng kết (01/10/2026)**: Có nhiều phần code và migration đã được chuẩn bị, cùng ghi nhận lịch sử về staging/release. Chưa đủ bằng chứng để tuyên bố toàn bộ G0–G8 đã nghiệm thu hoặc production hiện đang chạy đúng cấu hình. Theo dõi trạng thái mới nhất và các đầu việc kế tiếp trong `_docs/IMPLEMENTATION_PROGRESS.md`.

## Cập nhật trạng thái 02/10/2026 — Production deployment

Trạng thái này supersede bảng snapshot 01/10 ở trên:

| Cổng | Trạng thái hiện tại | Bằng chứng / phần còn lại |
|---|---|---|
| G0 | Backup/restore chưa làm; người dùng chủ động bỏ qua | Project production Free không có project backups. Chưa có full dump/restore drill; rủi ro này không được ghi là đã đạt. |
| G1 | Migration production đã được báo chạy; metadata verifier 001/002 PASS | Ảnh SQL Editor xác nhận PASS. API/auth/role/Storage test trực tiếp vẫn chưa làm. |
| G2 | Frontend đã deploy | Commit `6f74184`; Vercel Production `Ready`, `namcumz.io.vn` trả 200. Hủy/hoàn thành chưa được E2E với đơn test. |
| G3 | Chờ nghiệm thu role trên staging | Staging chỉ có customer; thiếu booster/admin để thử nhận đơn, concurrency và quyền. |
| G4 | Mã hóa credential đã verify; giao dịch thật chưa thử | Staging SQL smoke/verify và production verifier có PASS; chưa chạy Auth/API/browser top-up hoặc đối chiếu giá shop. |
| G5 | Chờ nghiệm thu admin/support | Chưa kiểm tra API, Storage, phân quyền và audit log bằng tài khoản test. |
| G6 | Tạm ổn theo ưu tiên người dùng | Ma trận thiết bị/viewport được hoãn. |
| G7 | Đã đo HTTP sơ bộ sau deploy | 7 GET/URL, status 200: `/` 83,619 B, median 69.7 ms; `/napgame.html` 9,978 B, median 148.5 ms; `/login.html` 67,819 B, median 153.9 ms. Mẫu gồm mạng + tải body và có outlier lần lượt 1.57s, 8.04s, 398ms; chưa phải Web Vitals hoặc API p95. |
| G8 | Đã deploy, chưa nghiệm thu luồng đơn/rollback | Production page mở được; chưa chạy hủy/hoàn thành trên test order, chưa chứng minh rollback DB. Không thử bằng đơn khách thật. |

### Việc cần làm để đóng các mục còn lại

1. Để xác nhận lỗi hủy/hoàn thành đã hết: tạo/chỉ định một test order trên staging và tài khoản test có quyền booster/admin; staging hiện không có các role này. Không dùng đơn khách thật.
2. Nếu muốn đóng G0, cần một bản sao DB đầy đủ và restore vào project cô lập. Người dùng hiện đã chọn bỏ qua bước backup/restore; vì vậy G0 vẫn chưa đạt.
3. Nếu cần nghiệm thu G7 đầy đủ, đo Web Vitals (LCP/CLS/INP) trên trình duyệt và API latency p50/p95 dưới cùng điều kiện vùng/mạng/dataset.
4. G1/G3/G4/G5 cần kiểm tra Auth, quyền âm/dương, thao tác nghiệp vụ, Storage và log trên staging; chưa có bằng chứng thì giữ trạng thái chờ.
## Cập nhật 02/10/2026 — Sửa UI thao tác đơn

Đã triển khai và deploy commit `eee5ec8`: đơn có `cancelled=true` được gom vào tab **Đã hủy**, không còn bị tính/lọc như đơn chờ xử lý; dialog nhập/xác nhận/lỗi thay prompt trình duyệt, thành công có toast và danh sách admin tự tải lại. Root cause là status workflow cũ được giữ để bảo toàn lịch sử, còn giao diện không xét cờ cancelled.

Vercel báo Ready; domain production mở trang dashboard và có tab **Đã hủy**. Automated checks: 41 + 7 + 13 PASS; build 21 files. Chưa E2E thao tác claim/hủy/hoàn thành bằng test order; không đổi trạng thái đơn khách thật. Bước nghiệm thu kế tiếp: thao tác bằng test order staging hoặc order do chủ shop chỉ định; kiểm tra tải lại dữ liệu và tab tương ứng. Các trạng thái G0–G8 khác vẫn theo bảng trên, G0 backup/restore đã được người dùng bỏ qua và chưa đạt.
## Trạng thái kế hoạch đã đối chiếu — 02/10/2026

| Cổng | Tình trạng mới nhất |
|---|---|
| G0 | Full DB backup/restore được chủ shop miễn do không nâng gói; chưa làm, không tính PASS. |
| G1 | Migration production 000/001/002 được chủ shop báo đã chạy; verifier metadata 001/002 PASS theo ảnh. Runtime API/RLS tests waived/not verified. |
| G2 | Frontend production deployed. Offline checks 41/41, OrderAPI 7/7; chưa E2E workflow bằng test order. |
| G3 | Role matrix/concurrency/order E2E staging waived/not verified. |
| G4 | Credential encryption metadata verified. Top-up Auth/API/browser/giao dịch chưa E2E, waived/not verified. |
| G5 | Admin/Storage/support/audit E2E chưa làm, waived/not verified. |
| G6 | Responsive/device matrix hoãn theo ưu tiên chủ shop. |
| G7 | Đã có HTTP baselines sơ bộ; Core Web Vitals và API p50/p95 chuẩn hóa còn thiếu nếu muốn đo sâu. |
| G8 | Đã phát hành, nghiệm thu một phần; workflow test và DB restore drill chưa làm/đã miễn. |

Bản production mới nhất cho search/dialog/orders đã được Vercel deploy Ready (`c251ed2` là search guard; `eee5ec8` là order workflow UI). Không có test write lên đơn khách. **Không còn bước bắt buộc nào theo các lựa chọn miễn hiện tại**; phần tùy chọn còn lại là đo G7 sâu hơn bằng Web Vitals/API latency. Các mục waived không được xem là đạt.

## Cập nhật G7 — 03/10/2026

- Đo production mới: 12 GET/trang HTML; p50/p95 / 165.9/992.4 ms, /napgame.html 220.5/487.6 ms, trang detail 212.4/450.9 ms. REST catalog 27 mẫu sau warm-up: p50 214.9 ms, p95 318.2 ms. Điều kiện và giới hạn trong G7_PERFORMANCE_20261003.md.
- PSI mobile bị HTTP 429, nên Core Web Vitals chưa có số liệu mới. Không coi HTTP timing là LCP/CLS/INP; G7 vẫn một phần chưa xác minh, không PASS.
