# Khởi tạo staging — đợt nền G0/G1

Project duy nhất được dùng: **cnawquqkeogzmvucmjes** (`namcumz-staging`).
Không chạy các file này trên `vqnuutdmcekqkbdvawlw` hoặc chạy các script setup/recovery cũ.

## Chủ shop thực hiện

1. Mở https://supabase.com/dashboard/project/cnawquqkeogzmvucmjes/sql/new và kiểm tra đúng project mới.
2. Copy toàn bộ `_db/staging_001_foundation.sql` vào SQL Editor, chọn role postgres, bấm Run **một lần**.
3. Nếu thành công, chạy `_db/staging_001_verify.sql`, rồi `_db/staging_001_rls_smoke.sql` trong các query riêng. Gửi lại dòng kết quả cuối hoặc lỗi, không gửi mật khẩu.

Foundation chạy trong transaction, từ chối khi có bất kỳ bảng public, Auth user hoặc schema namcumz_private. Nếu báo STOP, không xóa bảng/tài khoản để ép chạy; cần kiểm kê trước. Sau cài thành công, chạy lại foundation cũng sẽ báo STOP — đây là chủ ý.

Verify chỉ đọc metadata. Smoke test tạo hai Auth user giả không có mật khẩu, đơn và chat trong một transaction rồi ROLLBACK. Không tạo tài khoản đăng nhập được, không gửi email hoặc gọi Auth API. Nếu lỗi thì giao dịch bị hủy; đừng bỏ ROLLBACK hay đổi thành COMMIT. Bài này kiểm tra PostgreSQL/RLS, chưa thay thế test qua Auth/API/Storage/Realtime.

## Phạm vi bản nền

- Sáu bảng: user_roles, orders, order_messages, notifications, order_logs, support_tickets.
- Trigger đăng ký cấp customer, bỏ qua role metadata; không tạo sẵn admin.
- Guest không có quyền đọc/ghi các bảng trên.
- Customer tạo đơn chờ xử lý giá 0, server tạo mã đơn và tên chủ; đọc đơn mình.
- Người được giao/admin đọc đơn theo vai trò; chưa có đường nhận/giao đơn từ client.
- Chat kiểm tra đơn và sender_id, server lấy tên người gửi.
- Log tạo đơn do trigger ghi. Client không sửa role, giá, người nhận, trạng thái, review, log hoặc tạo notification.
- Chưa tạo Storage bucket/public policy; chưa bật Realtime; không có RPC đọc Auth/nhận đơn bằng secret.

Thiết kế áp dụng grants + RLS; hàm SECURITY DEFINER đặt search_path rỗng và schema rõ theo tài liệu chính thức: https://supabase.com/docs/guides/database/postgres/row-level-security và https://supabase.com/docs/guides/api/securing-your-api.

## Giới hạn tương thích frontend cần xử lý tiếp

Đây là baseline bảo mật, chưa phải website hoạt động trọn vẹn. Frontend hiện còn tự insert user_roles sau signup, cập nhật đơn trực tiếp, ghi notification/log và tải ảnh public; các thao tác này bị khóa có chủ ý. Bước tiếp theo đổi frontend sang trigger/RPC phù hợp, xử lý phản hồi lỗi/zero-row và dựng test role A/B/admin/booster.

Luồng username@namcumz.com cũ chưa được đổi; không tắt email confirmation production để làm test. Sẽ chốt Q02 trước hoàn thiện đăng ký; có thể tạo tài khoản thử với email thật qua staging Auth theo kế hoạch sau. Không dùng password đã chia sẻ trong chat.

## Trạng thái kiểm chứng

SQL đã được rà source nhưng **chưa chạy trên PostgreSQL/Supabase** trong phiên này. Máy chưa có CLI/psql/docker; kết nối hiện có chỉ là publishable key, không cấp quyền DDL. Chưa coi G0/G1 đạt. Cần kết quả chạy ba file để sửa lỗi runtime nếu có rồi kiểm thử HTTP/E2E.

Không cần cài Supabase CLI hoặc chạy login/init/link ở bước này; SQL Editor đủ để khởi tạo.

## Kiểm chứng workflow 002 — 30/09

Đã có frontend thử nghiệm tại dashboard và kiểm thử PGlite, chưa có bằng chứng áp dụng migration 002 trên Supabase.

1. Kiểm tra đúng project staging `cnawquqkeogzmvucmjes` và tra migration ledger trước khi thực hiện thay đổi.
2. Nếu mới chỉ có foundation 001: rà `_db/staging_002_workflows.sql` hiện tại trước khi chạy một lần trên staging; không chạy trên production.
3. Nếu 002 đã cài: không chạy lại hoặc xóa marker. Cần đối chiếu định nghĩa `order_action` và áp dụng bản vá bổ sung cho validation version nếu thiếu.
4. Chạy `_db/staging_002_verify.sql` (chỉ đọc). Kết quả PASS xác nhận phạm vi metadata được kiểm tra, không thay thế E2E.
5. Dùng tài khoản thử customer A/B, booster A/B, admin: tạo đơn -> báo giá -> khách chấp thuận -> xác nhận tiền -> booster nhận -> cập nhật tiến độ -> gửi nghiệm thu -> khách hoàn thành/review. Thử nhận đồng thời, retry mạng và quyền chéo.

REST metadata hiện trả 401 nên phiên này chưa xác định trạng thái DB thật. Không gửi database password hoặc service-role key qua chat/frontend. Gửi kết quả PASS hoặc thông báo lỗi đã bỏ thông tin nhạy cảm để tiếp tục đối chiếu.
