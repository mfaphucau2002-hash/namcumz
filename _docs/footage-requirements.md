# NAMCUMZ — FOOTAGE REQUIREMENTS SPECIFICATION

Tài liệu quy định chi tiết nhu cầu footage chuyển động cho từng trang, từng khu vực và từng tựa game trên nền tảng NAMCUMZ.

---

## 1. Ma trận nhu cầu Footage theo Trang & Khu vực

| Game | Trang (Page) | Khu vực (Section) | Nhu cầu Footage (Desired Footage) | Tỉ lệ (Aspect Ratio) | Sắc thái (Mood) | Độ ưu tiên |
|---|---|---|---|:---:|:---:|:---:|
| **Toàn site / Generic** | `index.html` | Hero Banner Desktop | Cực quang vũ trụ, tinh vân sao trời, chuyển động êm dịu, không giật khung | 16:9 / 21:9 | EPIC / DREAMY / BLUE | **P0** |
| **Toàn site / Generic** | `index.html` | Hero Banner Mobile | Tinh vân sao trời cắt dọc trung tâm, tối ưu tải nhẹ (<600 KB) | 9:16 / 4:5 | DREAMY / CYAN | **P0** |
| **Genshin Impact** | `index.html` | Hero Background Alt | Phong cảnh Teyvat (Fontaine / Natlan / Liyue) slow camera pan | 16:9 | DREAMY / FANTASY | **P0** |
| **Genshin Impact** | `index.html` | Game Card Hover | Paimon / Nhà lữ hành chào đón, hoặc đoạn lướt gió phong cảnh ngắn (2-3s) | 4:3 / 16:9 | BRIGHT / CUTE | **P2** |
| **Honkai: Star Rail** | `index.html` | Game Card Hover | Tàu Astral Express tăng tốc xuyên qua dải ngân hà (2-3s) | 4:3 / 16:9 | COSMIC / ENERGETIC | **P2** |
| **Zenless Zone Zero** | `index.html` | Game Card Hover | Phố đêm New Eridu Sixth Street biển hiệu neon chớp nháy (2-3s) | 4:3 / 16:9 | URBAN / NEON / DARK | **P2** |
| **Wuthering Waves** | `index.html` | Game Card Hover | Resonator lướt bay trên đỉnh núi Kim Châu (2-3s) | 4:3 / 16:9 | ATMOSPHERIC / CYAN | **P2** |
| **Genshin Impact** | `index.html` | Dịch vụ Cày thuê | Hào quang nguyên tố, La Hoàn Thâm Cảnh portal loop | 16:9 | MYSTERIOUS / PURPLE | **P2** |
| **Toàn site** | `index.html` | Quy trình & Footer | Hạt sáng ma thuật trôi nhẹ trên nền tối (subtle particle drift) | 16:9 | MINIMAL / CALM | **P3** |
| **Honkai: Star Rail** | `napgame.html` | Hero Slider Slide 1 | Cảnh thành phố Penacony về đêm hoặc không gian vũ trụ rộng lớn | 16:9 / 21:9 | MAGICAL / GOLD | **P1** |
| **Genshin Impact** | `napgame.html` | Hero Slider Slide 2 | Phong cảnh đảo nổi Đảo Thiên Không hoặc thành phố Fontaine rực rỡ | 16:9 / 21:9 | DREAMY / BLUE | **P1** |
| **Zenless Zone Zero** | `napgame.html` | Hero Slider Slide 3 | Không gian Hollow Zero hoặc quán băng đĩa Random Play rực rỡ neon | 16:9 / 21:9 | ENERGETIC / URBAN | **P1** |
| **Wuthering Waves** | `napgame.html` | Hero Slider Slide 4 | Toàn cảnh thành phố Kim Châu đón bình minh | 16:9 / 21:9 | CALM / ATMOSPHERIC | **P1** |
| **Genshin Impact** | `napgame-detail.html` | Game Header Cover | Toàn cảnh Liyue rực rỡ hoa tiêu hoặc đại dương Fontaine | 21:9 | DREAMY / GOLD | **P1** |
| **Honkai: Star Rail** | `napgame-detail.html` | Game Header Cover | Nội thất tàu Astral Express qua cửa sổ vũ trụ | 21:9 | COSMIC / CALM | **P1** |
| **Zenless Zone Zero** | `napgame-detail.html` | Game Header Cover | Đường phố New Eridu góc rộng | 21:9 | DARK / NEON | **P1** |
| **Wuthering Waves** | `napgame-detail.html` | Game Header Cover | Núi Thừa Tiêu (Mt. Firmament) hoặc Biển Đen (Black Shores) | 21:9 | MYSTERIOUS / CYAN | **P1** |
| **Genshin Impact** | `napgame-detail.html` | Chọn gói nạp (Top-up) | Đá Sáng Thế / Nguyên Thạch xoay 3D phát sáng, Không Nguyệt lấp lánh | 1:1 / 16:9 | CYAN / GOLD / PREMIUM | **P1** |
| **Honkai: Star Rail** | `napgame-detail.html` | Chọn gói nạp (Top-up) | Mộng Cảnh / Ngọc Ánh Sao lơ lửng, Vé Tàu lấp lánh hạt sao | 1:1 / 16:9 | BLUE / GOLD / PREMIUM | **P1** |
| **Zenless Zone Zero** | `napgame-detail.html` | Chọn gói nạp (Top-up) | Monochrome / Polychrome tinh thể đa sắc phát sáng nhịp nhàng | 1:1 / 16:9 | MULTICOLOR / NEON | **P1** |
| **Wuthering Waves** | `napgame-detail.html` | Chọn gói nạp (Top-up) | Lunite tinh thể âm hưởng dao động sóng âm | 1:1 / 16:9 | CYAN / BLUE / PREMIUM | **P1** |
| **Genshin / Global** | `napgame-detail.html` | Modal nghiệm thu / thành công | Cầu nguyện 5 sao (5-star wish animation) vệt sáng vàng bay qua bầu trời | 16:9 | GOLD / CELEBRATORY | **P2** |
| **Genshin Impact** | `login.html` | Auth Media (Đăng nhập) | Cánh cửa Celestia mở ra giữa những đám mây vô tận lúc hoàng hôn | 9:16 / 4:5 | MYSTERIOUS / DREAMY | **P1** |
| **Honkai: Star Rail** | `login.html` | Auth Media (Đăng ký) | Nhảy vọt Warp không gian của Tàu Astral Express | 9:16 / 4:5 | COSMIC / BLUE | **P1** |
| **Wuthering / ZZZ** | `login.html` | Auth Media (Booster/CTV) | Trạm kiểm soát công nghệ cao Terminal Solaris-3 / Hollow | 9:16 / 4:5 | DARK / CYAN / TECH | **P2** |
| **Toàn site** | `dashboard.html` | Nền chung Dashboard | Hạt sáng trôi cực chậm trên nền xanh đen (#0b1018), không gây mỏi mắt | 16:9 | DARK / MINIMAL | **P3** |
| **Toàn site** | Tất cả | Loading State | Biểu tượng nạp xoay tròn với hào quang phát sáng | 1:1 | CYAN / CLEAN | **P2** |

---

## 2. Tiêu chí Kỹ thuật (Technical Directives)

1. **Loopability:** Ưu tiên tuyệt đối cảnh quay pan chậm, không lia máy nhanh, không cắt cảnh nhảy cóc (jump cut) mỗi 0.5 giây. Tối thiểu đạt 4/5 điểm loopability.
2. **Audio:** Toàn bộ background loop phải triệt tiêu track âm thanh (no audio track), dung lượng nén WebM / MP4 chuẩn từ 1–4 MB cho Desktop và <800 KB cho Mobile.
3. **Clean Frame:** Không có subtitle người sáng tạo, không watermark Douyin/TikTok, không thanh điều hướng UI, không logo thương mại đè màn hình.
4. **Phân loại bản quyền nghiêm ngặt:** Phân biệt rõ Class A (Official Publisher PV/Teaser/Scenery), Class B (Licensed Stock thương mại miễn phí), Class C (Attribution), Class D (Chưa rõ) và Class E (Reference Only).
