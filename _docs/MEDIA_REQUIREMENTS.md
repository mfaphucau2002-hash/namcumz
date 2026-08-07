# MEDIA REQUIREMENTS

Dưới đây là danh sách toàn bộ các file hình ảnh và video cần thiết cho website NAMCUMZ, phân loại theo thư mục. Vui lòng chuẩn bị các file theo đúng tên, định dạng và tỷ lệ để tự động khớp với giao diện.

## 1. Hero Section (Phần đầu trang)
Thư mục: `/public/media/genshin/hero/`

| Tên File | Loại | Kích thước / Tỷ lệ | Định dạng | Dung lượng tối đa | Mô tả nội dung |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `hero-video-desktop.mp4` | Video | 1920x1080 (16:9) hoặc 21:9 | MP4 (H.264) | < 5MB | Cảnh chiến đấu đẹp mắt hoặc phong cảnh Teyvat hùng vĩ, góc máy ngang. Không có chữ (text). |
| `hero-video-mobile.mp4` | Video | 1080x1920 (9:16) hoặc 4:5 | MP4 (H.264) | < 3MB | Bản cắt dọc của video hero, tập trung vào nhân vật chính để phù hợp màn hình điện thoại. |
| `hero-poster.webp` | Ảnh | 1920x1080 (16:9) | WEBP / JPG | < 300KB | Hình ảnh đẹp, rõ nét trích xuất từ video hoặc cảnh tương tự để làm ảnh chờ trước khi video chạy. |

## 2. Card Dịch Vụ
Thư mục: `/public/media/genshin/services/`
*Yêu cầu chung: Tỷ lệ 16:10 (Ví dụ: 600x375). Dung lượng < 100KB/ảnh. Định dạng WEBP/JPG.*

| Tên File | Sử dụng cho | Nội dung gợi ý |
| :--- | :--- | :--- |
| `spiral-abyss.webp` | La Hoàn Thâm Cảnh | Cảnh cửa ải La Hoàn, sao vực sâu, giao diện tầng 12. |
| `rush-map.webp` | Rush Map & Khám phá | La bàn, 100% rương, thần đồng, hoặc bản đồ khu vực đầy sáng. |
| `daily.webp` | Daily & Xả Nhựa | Nhựa đặc, hoa chỉ thị, hoặc biểu tượng nhiệm vụ ủy thác. |
| `build-character.webp` | Build Nhân Vật | Giao diện thiên phú, vũ khí trấn, thánh di vật có chỉ số khủng. |
| `imaginarium-theater.webp` | Nhà Hát Giả Tưởng | Biểu tượng sói rạp hát, giao diện khiêu chiến rạp hát. |
| `custom.webp` | Theo yêu cầu | Hình ảnh tổng hợp hoặc biểu tượng phép thuật chung. |

## 3. Teyvat TV (Video nổi bật)
Thư mục: `/public/media/genshin/videos/`

| Tên File | Loại | Tỷ lệ | Định dạng | Dung lượng tối đa |
| :--- | :--- | :--- | :--- | :--- |
| `create-order.mp4` | Video chính | 16:9 | MP4 | < 10MB |
| `create-order-poster.webp` | Ảnh chờ | 16:9 | WEBP | < 150KB |
| `rush-map-progress.mp4` | Video phụ | 16:9 | MP4 | < 5MB |
| `rush-map-poster.webp` | Ảnh chờ | 16:9 | WEBP | < 100KB |
| `highlight-abyss.mp4` | Video phụ | 16:9 | MP4 | < 5MB |
| `highlight-poster.webp` | Ảnh chờ | 16:9 | WEBP | < 100KB |

## 4. Booster Profiles
Thư mục: `/public/media/genshin/boosters/`
*Yêu cầu chung: Tỷ lệ 1:1 (Ví dụ: 300x300). Dung lượng < 50KB/ảnh. Định dạng WEBP/PNG.*

| Tên File | Sử dụng cho | Nội dung gợi ý |
| :--- | :--- | :--- |
| `booster-1.webp` | Booster 1 (Kazuha_Main) | Fanart chất lượng cao hoặc ảnh ingame crop mặt nhân vật Kazuha. |
| `booster-2.webp` | Booster 2 (Explorer_Pro) | Avatar phong cách thám hiểm, Aether/Lumine. |
| `booster-3.webp` | Booster 3 (YaeMiko_Teyvat) | Avatar Yae Miko chuyên nghiệp, sắc nét. |

## 5. Dashboard Showcase
Thư mục: `/public/media/genshin/decorations/`

| Tên File | Loại | Tỷ lệ | Định dạng | Dung lượng tối đa | Mô tả nội dung |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dashboard-preview.webp` | Ảnh | Free size | WEBP / PNG | < 400KB | Ảnh chụp màn hình giao diện Dashboard thực tế (khu vực theo dõi tiến độ, chat). |

## 6. Mascot Anime
Thư mục: `/public/media/genshin/mascot/`

| Tên File | Loại | Tỷ lệ | Định dạng | Dung lượng tối đa | Mô tả nội dung |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `chibi-guide.png` | Ảnh | Tự do | PNG (nền trong suốt) | < 200KB | Ảnh nhân vật anime/Genshin phong cách chibi, tách nền trong suốt, vẫy tay hoặc cầm biển chỉ dẫn. |

---

### Hướng dẫn sử dụng `mediaConfig.js`
Sau khi bạn đã đưa các file này vào đúng thư mục, hãy mở file `/assets/js/mediaConfig.js` và cập nhật các chuỗi rỗng `""` thành đường dẫn tương ứng (Ví dụ: `"/public/media/genshin/hero/hero-video-desktop.mp4"`). Website sẽ tự động tải các tài nguyên này mà không cần sửa code HTML.
