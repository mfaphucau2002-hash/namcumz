# QUY TẮC LÀM VIỆC (WORKSPACE RULES)

1. **LUÔN BẢO TOÀN DỮ LIỆU CỦA NGƯỜI DÙNG**:
   - TUYỆT ĐỐI KHÔNG được chạy các lệnh SQL DROP bảng, DELETE dữ liệu trừ khi được người dùng yêu cầu rõ ràng.
   - KHÔNG xóa `localStorage` của người dùng một cách bừa bãi.
   - Khi cập nhật cấu trúc database, ưu tiên sử dụng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

2. **CẬP NHẬT CODE AN TOÀN**:
   - KHÔNG dùng Regex Find & Replace (`multi_replace_file_content` hoặc shell sed) một cách mạo hiểm để tránh việc code bị lỗi cú pháp ẩn (syntax errors) dẫn đến sập toàn bộ script.
   - Mọi thay đổi lớn đối với tệp quan trọng (như `app.js`) nên được kiểm tra kĩ càng hoặc viết đè một cách toàn vẹn.

3. **LUÔN BACKUP**:
   - Ghi nhớ sao lưu hoặc tạo bản sao trước khi thực hiện các thay đổi lớn lên database hoặc cấu trúc core.

*Đã ghi nhớ theo yêu cầu của người dùng ngày 25/07/2026.*
