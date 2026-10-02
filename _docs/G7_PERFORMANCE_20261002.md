# G7 — số đo production ngày 02/10/2026

## Điều kiện

- Website production: `https://namcumz.io.vn`; Supabase production: `vqnuutdmcekqkbdvawlw`.
- Đo từ máy hiện tại qua kết nối mạng hiện tại, không giả lập băng thông/CPU mobile.
- Mỗi endpoint gọi tuần tự 16 lần, bỏ 2 lần đầu; 14 mẫu còn lại tính p50/p95 theo nearest rank. Request chỉ đọc, không đụng đơn hàng hoặc thông tin khách.
- HTML dùng GET với cache `no-store`; catalog dùng REST GET với anon key public và chỉ lấy 10 gói active, các cột `id,game,name,price`. Thời gian gồm request và đọc hết body.
- Đây là mẫu nhỏ tại một vị trí/mạng; p95 có độ bất định lớn và không đại diện cho tải đồng thời.

| Endpoint | HTTP | Body | p50 | p95 |
|---|---:|---:|---:|---:|
| Trang chủ `/` | 200 | 8,884 B | 73.4 ms | 619.6 ms |
| Danh mục `/napgame.html` | 200 | 8,493 B | 124.9 ms | 398.7 ms |
| Chi tiết `/napgame-detail.html?game=genshin` | 200 | 15,451 B | 123.6 ms | 1,586.6 ms |
| Supabase `packages` active (10 rows) | 200 | 1,245 B | 125.9 ms | 397.4 ms |

## Quan sát và giới hạn

- Danh mục từng bị ẩn vì hai thẻ đóng `button` sai làm `.ng-catalog-wrap` nằm trong `.ng-slider-container` có `overflow:hidden`. Commit `6c0024f` sửa hai thẻ thành `div`. Preview và production xác nhận catalog là con trực tiếp của `body`, 4 game nổi bật và 4 mục login được render.
- PageSpeed Insights API trả HTTP 429 tại thời điểm đo. Không có kết quả Lighthouse mobile hay Core Web Vitals LCP/CLS/INP đáng tin để ghi nhận.
- Kết quả trên **không** phải thời gian trang hiển thị hoàn chỉnh, không đo thời gian tương tác, ảnh/font/JS toàn trang hay API dưới tải đồng thời.
- G7 có baseline HTTP và catalog API, nhưng phần browser mobile/Web Vitals vẫn **chưa xác minh**. Không tuyên bố G7 đạt hoàn toàn.
