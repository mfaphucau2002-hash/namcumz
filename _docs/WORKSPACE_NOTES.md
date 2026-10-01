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

## Quyền tự chủ theo yêu cầu chủ shop — 01/10/2026

- Chủ shop yêu cầu tiếp tục kế hoạch Namcumz tự chủ, không yêu cầu họ tự chạy kiểm tra hoặc thao tác máy cho các hạng mục có thể xử lý cục bộ.
- Chủ shop từ chối nâng gói Supabase có phí; không tạo khoản phí/đăng ký trả phí.
- Chủ shop miễn bước kiểm thử role booster/admin và thao tác đơn trên staging. Ghi các mục này là **waived/not verified**, tuyệt đối không đánh dấu PASS.
- Tự thực hiện sửa code, kiểm tra local và các truy vấn staging chỉ đọc/rollback an toàn. Không cần hỏi lại về các quyết định trên.
- Quyền tự chủ này không tạo khả năng vượt qua yêu cầu xác nhận bắt buộc, không cấp database password, không đồng nghĩa được tạo phí, đổi mật khẩu, cấp role/security access mới hoặc xóa/thay đổi dữ liệu production mà không có quyền truy cập và điều kiện an toàn tương ứng. Không được tuyên bố đã backup/restore hoặc nghiệm thu các mục đã miễn.

## Cách cập nhật trạng thái cho chủ shop — 01/10/2026

- Mỗi lần trả lời về kế hoạch/công việc phải chốt rõ một trong hai: **đã xong** (nêu bằng chứng) hoặc **bước kế tiếp** (nêu chính xác môi trường/project, trang/file, thứ tự thao tác và kết quả cần thấy).
- Không để chủ shop phải hỏi lại “giờ làm gì tiếp?”. Nếu Codex có thể tự làm bước kế tiếp trong phạm vi quyền và công cụ được phép, hãy tự làm rồi báo kết quả. Nếu bị chặn, nêu đúng rào cản và hướng dẫn bước khả thi tiếp theo.
- Không đánh dấu migration hoàn tất chỉ vì đã gửi/chạy; chờ verify thành công. Khi chủ shop báo họ đã chạy migration, bước kế tiếp mặc định là đối chiếu file verify phù hợp trước khi deploy hoặc nghiệm thu.
