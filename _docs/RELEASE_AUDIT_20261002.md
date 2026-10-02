# Rà soát production — 02/10/2026

## Lỗi đã sửa và phát hành

- Danh mục Nạp Game bị cắt khỏi màn hình do hai thẻ đóng HTML sai trong slider: commit `6c0024f`. Production đã hiển thị 4 thẻ game nổi bật và 4 mục login.
- Bốn thẻ game ở trang chủ trước đây cùng mở trang danh mục, nay mở đúng chi tiết theo game: commit `b8b70f7`. Production DOM đã xác nhận 4 URL riêng.
- Dashboard dùng `javascript:void(0)` cho “Đơn của tôi” và ảnh xem trước có `src=""`: commit `616f9c4`. Production DOM xác nhận link nội trang `#ordersGrid`, ảnh chờ tải không có src rỗng.

## Kiểm tra đã làm

- Browser production: trang chủ, đăng nhập, dashboard khách, danh mục Nạp Game, chi tiết Genshin/HSR/ZZZ/Wuwa, Check Scam.
- Chi tiết game trả lần lượt 8/8/7/7 gói từ catalog; không có lỗi console hay ảnh hỏng trong các lượt kiểm tra. Genshin chọn gói 60 Đá cập nhật giỏ 20.000 đ. Không gửi đơn, không nhập hay đọc mật khẩu.
- Trang chủ, đăng nhập, dashboard tại viewport mặc định: không tràn ngang. Check Scam không có ảnh hỏng/lỗi console.
- Offline `_tools/check.cjs`: 47/47 PASS. `_tools/order-api.test.mjs`: 7/7 PASS. Build: 35 website files.
- Chưa xác nhận tất cả kích thước mobile, tài khoản đăng nhập thật, thao tác đơn hoặc thanh toán. Các cổng staging/backup trước đây được miễn vẫn là chưa xác minh.

## Vấn đề còn mở

- Form đăng ký ở `login.html` yêu cầu đồng ý “Điều khoản sử dụng” và “Chính sách bảo mật”, nhưng cả hai liên kết đang là `href="#"`; repository chưa có văn bản tương ứng. Đây là lỗi nội dung và sự đồng ý của người dùng, không nên tự điền nội dung pháp lý chưa được chủ shop chốt. Cần có hai văn bản thực tế rồi nối liên kết và kiểm tra trước khi coi đăng ký hoàn thiện.
- Core Web Vitals mobile và API dưới tải đồng thời chưa đo đủ; xem `G7_PERFORMANCE_20261002.md`.

Không có cơ sở để tuyên bố toàn website không còn lỗi; phạm vi trên là phần đã kiểm tra.
