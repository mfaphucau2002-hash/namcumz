# NAMCUMZ V2 — TOÀN DIỆN AUDIT & KẾ HOẠCH NÂNG CẤP KIẾN TRÚC THƯƠNG MẠI DỊCH VỤ GAME

> **Vai trò đảm nhiệm:** Principal Product Designer • Senior Frontend Engineer • Senior Supabase/Backend Engineer • CRO Strategist • Motion Designer • UX Researcher • QA/Performance Engineer  
> **Phiên bản:** NAMCUMZ V2 Architecture Audit  
> **Mục tiêu:** Tái cấu trúc và nâng cấp toàn diện website NAMCUMZ thành nền tảng Game Service Commerce / Game Top-up / Boosting Platform chuẩn mực, sống động, dễ hiểu, dễ mua, tin cậy tuyệt đối và mang bản sắc riêng biệt.

---

## 1. CURRENT ARCHITECTURE (KIẾN TRÚC HIỆN TẠI)

### 1.1. Frontend Stack
- **Cấu trúc:** Vanilla HTML5 Semantic + Modern CSS3 (Grid/Flexbox, Custom Properties, Glassmorphism) + Vanilla JavaScript (ES Modules).
- **Hệ thống tệp:**
  - 14 tệp HTML chính (`index.html`, `caythue.html`, `napgame.html`, `napgame-detail.html`, `dashboard.html`, `profile.html`, `login.html`, `admin.html`, `booster.html`, `checkscam.html`, `reviews.html`, `faq.html`, `luu-y.html`, `terms.html`, `privacy.html`).
  - Phân tầng CSS: `design-tokens.css`, `style.css`, `ui.css`, `landing.css`, `napgame.css`, `farming.css`, `booster.css`, `checkscam.css`, `legal.css`.
  - Phân tầng JS: `runtime-config.js`, `public-auth.js`, `landing.js`, `landing-ranking.js`, `napgame.js`, `order-api.js`, `order-request.js`, `app.js`.
- **Hosting & Phân phối:** Vercel Static Hosting (thư mục `dist/` thông qua build script `_tools/build.cjs`).

### 1.2. Backend & Cơ sở dữ liệu (Supabase PostgreSQL)
- **Xác thực (Auth):** Supabase Auth JWT (Email/Password, Session Storage), đồng bộ trạng thái qua custom event `namcumz-auth-updated`.
- **Phân quyền & RLS:**
  - Bảng `user_roles` với 4 cấp: `customer`, `booster`, `admin`, `super_admin`.
  - Bảng `orders`: Toàn bộ thao tác cập nhật trạng thái thực hiện qua RPC `order_action` và `create_order`. Chống tấn công giả mạo quyền từ client.
  - Concurrency & Idempotency: Kiểm soát phiên bản lạc quan (`version`), idempotency keys (`p_request`) chống duplicate click.
- **Bảo mật mật khẩu tài khoản game:**
  - Sử dụng tiện ích mở rộng `pgcrypto` ở cấp máy chủ.
  - Mã hóa PGP hai chiều an toàn cho đơn Nạp Login & Cày thuê.
  - Khách hàng và bên thứ ba không thể đọc plaintext. Chỉ Admin và Booster được phân công cụ thể mới có quyền decrypt theo từng phiên thao tác.
- **Tệp đính kèm (Storage):**
  - Bucket riêng tư `order-files`, kiểm soát truy cập thông qua RLS storage.objects.

---

## 2. CURRENT UX STRENGTHS (ĐIỂM MẠNH HIỆN TẠI)

1. **Hiệu năng tải trang cực nhanh:** Nhờ kiến trúc Vanilla HTML/CSS/JS không phụ thuộc framework nặng (không React/Next bundle size), First Contentful Paint < 0.8s, không có chi phí hydrate.
2. **Cam kết trung thực về dữ liệu (Factual Honesty):** Không sử dụng số liệu ảo, không fake booking count, không tạo đánh giá rác. Bảng xếp hạng Booster kết nối trực tiếp với RPC thật `booster_profiles()`.
3. **Luồng nghiệp vụ chặt chẽ:** Quy trình Báo giá → Chấp thuận giá → Thanh toán → Phân công Booster → Báo tiến độ → Nghiệm thu → Review cực kỳ chuyên nghiệp và chuẩn chỉ về mặt kỹ thuật.
4. **Hệ thống bảo mật vượt trội:** Kiến trúc pgcrypto + RLS + optimistic locking thuộc top đầu các website dịch vụ game tại Việt Nam.
5. **Nền tảng thương hiệu rõ ràng:** Bảng màu Deep Space (`#070912`, `#0b1018`) kết hợp Cyan (`#70dce5`), Violet và Gold đã định hình được phong cách Dark Gaming sang trọng.

---

## 3. CURRENT UX PROBLEMS (CÁC VẤN ĐỀ UX & CRO CẦN GIẢI QUYẾT)

1. **Homepage mang cảm giác "Website giới thiệu tĩnh" hơn là "Sàn thương mại dịch vụ game sống động":**
   - Thiếu nhịp thở vận hành (operational pulse). Người dùng bước vào không cảm nhận được website có đang sôi động phục vụ khách hàng hay không.
   - Không có announcement/ticker cập nhật patch game (ví dụ phiên bản mới của Genshin, Honkai Star Rail, Zenless Zone Zero, Wuthering Waves).
2. **Thiếu neo giá (Price Anchors) trên thẻ dịch vụ cày thuê:**
   - Các card cày thuê trên homepage hiện tại chỉ có tên danh mục và nút "CHỌN DỊCH VỤ", buộc khách phải đăng nhập và tạo đơn mới biết khoảng giá. Điều này tạo rào cản tâm lý (friction) rất lớn khiến tỷ lệ drop-off cao.
   - Thiếu các thông tin thiết yếu mà khách cày thuê quan tâm ngay lập tức: Thời gian hoàn thành ước tính (ETA), Cam kết cày tay 100%, Nghiệm thu chụp ảnh, Bảo hiểm rủi ro.
3. **Phân cấp chú ý (Attention Hierarchy) chưa tối ưu:**
   - Hero banner bên trái và carousel/ranking panel bên phải đang tranh giành sự chú ý của người xem.
   - Khu vực chọn nhanh game nạp đặt dưới dạng danh sách text nhỏ, chưa làm nổi bật được artwork và tỷ giá hấp dẫn.
4. **Khu vực Đánh giá (Social Proof) bị ngắt quãng:**
   - Trang `reviews.html` hiển thị "Chưa có phản hồi công khai", trong khi Homepage hoàn toàn thiếu social proof tóm tắt (ví dụ: điểm uy tín, số đơn hoàn tất, cam kết bồi thường).
5. **Trải nghiệm Mobile chưa tối ưu cho Commerce:**
   - Chiều cao các khối trên màn hình điện thoại chiếm nhiều diện tích cuộn.
   - Thiếu thanh tác vụ nhanh (Quick Action / Sticky CTA) giúp khách hàng lập tức chọn game hoặc tra cứu đơn hàng mà không cần cuộn ngược lên đầu.
6. **Màn hình tải ban đầu (Initial Load / Gateway Experience):**
   - Khi vào trang lần đầu, các tài nguyên ảnh/video có độ trễ nhẹ, thiếu một Gateway Transition tinh tế để định hình đẳng cấp thương hiệu.

---

## 4. COMPETITOR PATTERN ANALYSIS (PHÂN TÍCH ĐỐI THỦ)

### 4.1. KachiBeo (`kachibeo.online`)
- **Điểm mạnh đáng học hỏi:**
  - **Public Pricing Tiers:** Công khai bảng giá và các mốc chi tiết (ví dụ: La Hoàn tầng 9-12, Thám hiểm map từng khu vực, Thần đồng, Nhiệm vụ Ma Thần). Khách hàng biết chính xác chi phí trước khi quyết định.
  - **Hero tập trung mạnh vào Social Proof & Trust Badges:** 4 huy hiệu thống kê nổi bật đặt ngay dưới CTA chính: `Cày tay 100%`, `3.800+ Đơn hoàn thành`, `Hỗ trợ Zalo 24/7`, `Bảo hiểm nick`.
  - **Hero 3D/Cinematic Showcase:** Khung video 16:9 sắc nét kèm nút chuyển cảnh nhân vật (Furina / Columbina) tạo cảm giác studio game cao cấp.
  - **Category Filter Pills mượt mà:** Khách có thể chuyển đổi nhanh giữa Genshin, Honkai Star Rail, Wuthering Waves, ZZZ.
- **Hạn chế của KachiBeo cần tránh:**
  - Phụ thuộc vào việc bán tài khoản game (Kho Acc), tiềm ẩn nhiều rủi ro pháp lý và tranh chấp nguồn gốc nick.
  - Giao diện có phần chật chội, nhiều yếu tố neon phát sáng cùng lúc làm giảm tính tập trung của người dùng.
  - Cơ chế bảo mật đơn hàng còn cơ bản, thiếu mã hóa PGP server-side như NAMCUMZ.

### 4.2. Duck Streamer (`duckstreamer.store`)
- **Điểm mạnh đáng học hỏi:**
  - **Intro Loading Screen (Gateway Boot Loader):** Màn hình kéo rèm mở ra với vòng xoay % và logo, lưu trạng thái `sessionStorage` (`duck_intro_loaded`) để khách quay lại không bị làm phiền.
  - **Cyber Live Orders Ticker:** Dải thông báo đơn hàng thời gian thực chạy ngang dưới hero, hiển thị các đơn hoàn thành gần nhất, tạo social proof mạnh mẽ.
  - **Bố cục Hero Banner + Leaderboard Sidebar (Tỷ lệ 7:3):** Banner khuyến mãi siêu lớn 16:9 đi kèm bảng Top Chi Tiêu / Bảng Vinh Danh bên cạnh.
  - **Bento Grid Commerce Cards:** Card sản phẩm chia làm 2 tầng rõ rệt: Khung artwork phía trên kèm HUD badge nổi bật (`NẠP SIÊU TỐC`, `CÀY THUÊ 24/7`), phần thông tin phía dưới có đường viền màu đặc trưng theo từng game.
  - **Tách bạch 3 trụ cột thương mại:** Cày Thuê — Nạp Game — Thẻ Game.
  - **Chế độ Eco Mode:** Tùy chọn tắt hiệu ứng để tiết kiệm pin trên máy yếu/mobile.
- **Hạn chế của Duck Streamer cần tránh:**
  - Bảng "Top Chi Tiêu" công khai số tiền và kích thích tiêu tiền kiểu cờ bạc/gacha quá mức, không phù hợp với định vị dịch vụ văn minh và bảo mật của NAMCUMZ.
  - Màu sắc hơi chói (Neon Pink + Cyan tương phản gắt), dễ gây mỏi mắt khi lướt lâu.
  - AI Assistant mang tính chất trang trí nếu dữ liệu trả lời không chính xác về tài khoản game.

---

## 5. FEATURE GAP MATRIX (BẢNG ĐỐI CHIẾU TÍNH NĂNG)

| Tính năng / Pattern | NAMCUMZ Hiện Tại | KachiBeo | Duck Streamer | Giá trị UX / CRO | Quyết định | Priority | Lý do / Hướng triển khai |
|---|---|---|---|---|---|---|---|
| **Gateway Boot Loader** | Không có (load thẳng) | Không có | Có (kèm progress %) | Tạo ấn tượng thương hiệu, che giấu load layout | **ADD** | **P2** | Thiết kế NAMCUMZ Boot Gateway nhẹ nhàng, chỉ hiện 1 lần/session, timeout an toàn 0.8s, tôn trọng `prefers-reduced-motion`. |
| **Hero Campaign Engine** | Carousel 4 ảnh tĩnh cơ bản | 2 video chuyển cảnh | Carousel 5 banner khuyến mãi | Thu hút mắt nhìn, làm nổi bật chương trình trọng điểm | **REDESIGN** | **P1** | Xây dựng Data-Driven Hero Engine: Hỗ trợ Banner chiến dịch, Video ambient fallback, nút CTA kép rõ ràng. |
| **Trust Badges Strip** | Có text nhỏ rải rác | 4 pill badges nổi bật dưới Hero | Dưới slider | Tăng độ tin cậy ngay trong 3 giây đầu tiên | **IMPROVE** | **P1** | Gom cụm 4 trụ cột: `Cày tay thuần túy`, `Tiến độ Real-time`, `Mã hóa PGP`, `Bảo hiểm giao dịch`. |
| **Live Activity Ticker** | Không có | Không có | Marquee đơn mới | Tín hiệu thị trường sống động (Social Proof) | **ADD** | **P2** | Dải chạy chậm thông tin trạng thái hoạt động: Mã đơn che mờ (VD: `#NMC-8***`), game, dịch vụ, trạng thái. Dữ liệu thật/trung thực, pause khi hover. |
| **Game Category Tabs** | Đặt dọc dạng quick list | Filter pills ngang | Phân theo section | Giảm friction tìm kiếm game | **IMPROVE** | **P1** | Tab switcher tương tác mượt mà giữa Genshin Impact, Honkai Star Rail, Zenless Zone Zero, Wuthering Waves. |
| **Service Card V2 (Cày thuê)** | Card tổng quát, không giá | Card chi tiết, có giá công khai | Bento card | Cung cấp đủ thông tin để quyết định mua hàng | **REDESIGN** | **P1** | Đưa thông số vào card: Giá từ, Thời gian ước tính, Cam kết bảo hành, Badge nổi bật (`HOT`, `NHANH`, `TIÊU BIỂU`). |
| **Top-up Package Preview** | Chỉ có ở trang detail | Không có nạp | Card dẫn vào detail | Cho khách thấy trước các mốc đá/vé tháng | **IMPROVE** | **P1** | Thẻ nạp game kèm preview các gói hot nhất (Thẻ tháng, 300, 980, 6480) và tag "Nạp UID / Login". |
| **Announcement Bar** | Không có | Không có | Marquee trên top | Thông báo patch mới, ưu đãi | **ADD** | **P2** | Thanh thông báo có nút đóng (dismissable), lưu sessionStorage. |
| **Check Scam Shortcut** | Nằm riêng ở menu hỗ trợ | Không có | Không có | Trấn an khách hàng mới, chống lừa đảo | **IMPROVE** | **P1** | Tích hợp huy hiệu xác minh Check Scam trực tiếp tại Hero, luồng thanh toán và footer. |
| **Booster Ranking** | Có panel tải từ DB | Không có | Top spender | Minh bạch năng lực đội ngũ | **KEEP** | **P1** | Giữ nguyên tính năng kết nối DB thật, nâng cấp visual card sang trọng và chỉn chu hơn. |
| **Bảng Đua Top Tiêu Tiền** | Không có | Bảng phong thần | Top chi tiêu + quà | Gây áp lực tâm lý, rủi ro bảo mật số tiền | **AVOID** | — | Không áp dụng. NAMCUMZ là dịch vụ hỗ trợ game thủ, không khuyến khích đua tiền phản cảm. |
| **Kho Acc / Bán Nick** | Không có | Có kho nick lớn | Không có | Rủi ro pháp lý, tranh chấp hoàn tiền | **AVOID** | — | Không làm. Tập trung 100% vào dịch vụ Cày thuê & Nạp game chính chủ. |
| **Chế độ Eco Mode** | Chỉ có prefers-reduced-motion | Không có | Nút bật tắt hiệu ứng | Tiết kiệm pin, tối ưu máy yếu | **EXPERIMENT**| **P2** | Tích hợp nút chuyển đổi chế độ tiết kiệm tài nguyên bên cạnh các tương tác giao diện. |

---

## 6. FEATURES WE SHOULD COPY AS PATTERNS & FEATURES TO AVOID

### 6.1. Patterns chúng ta chọn lọc và tái thiết kế (Copy as Patterns)
1. **The Gateway Experience (Duck Streamer):**
   - *Lý do:* Tạo cảm giác hệ thống chuyên nghiệp chuẩn bị sẵn sàng trước khi bước vào thế giới game.
   - *Cách NAMCUMZ làm khác:* Không dùng mascot hoạt hình lòe loẹt, sử dụng visual "NAMCUMZ GATEWAY — Đồng bộ dữ liệu thế giới Teyvat / Astral Express", thời gian mượt mà dưới 0.9s, auto-dismiss, có nút bỏ qua lập tức.
2. **Operational Activity Stream (Duck Streamer):**
   - *Lý do:* Giải quyết sự im lặng của website tĩnh, chứng minh shop đang xử lý đơn hàng liên tục.
   - *Cách NAMCUMZ làm khác:* Không fake đơn vô tội vạ. Tích hợp thanh trạng thái minh bạch: số lượng Booster đang trực tuyến, trạng thái gateway, che mờ danh tính khách (`Khách #71** • Khám phá 100% Natlan • Đã nghiệm thu`).
3. **Public Pricing Anchors & Feature Checklist (KachiBeo):**
   - *Lý do:* Khách hàng ghét việc phải click nhiều bước chỉ để biết dịch vụ có đắt không.
   - *Cách NAMCUMZ làm khác:* Mỗi thẻ cày thuê nêu rõ: `Giá từ 50.000đ`, `Thời gian 1–2 ngày`, `✓ 100% Cày tay`, `✓ Cập nhật tiến độ trực tiếp`, `✓ Nghiệm thu qua ảnh`.

### 6.2. Features chúng ta kiên quyết KHÔNG COPY (To Avoid)
1. **Không sao chép giao diện cờ bạc / Top Spender Podium:** Đua top chi tiêu tạo cảm giác chợ búa và vi phạm sự riêng tư tài chính của khách hàng. Thay vào đó, NAMCUMZ tôn vinh **Top Booster Hoàn Thành Đơn** và **Khách hàng thân thiết (Adventurer Badges)** dựa trên sự gắn bó.
2. **Không làm Chợ Bán Acc:** Mua bán acc tiềm ẩn hack nick, back nick, tranh chấp email rắc rối. NAMCUMZ chỉ phục vụ tài khoản chính chủ của khách.
3. **Không dùng Chatbot AI giả cầy:** Tránh trường hợp bot trả lời sai lệch thông tin bảo mật hay cam kết đền bù nick. Thay vào đó dùng **Smart Help Center + Kênh Zalo CSKH chính chủ 1 chạm**.
4. **Không chạy Marquee chữ tốc độ cao:** Hiệu ứng giật cục gây mất tập trung và khó đọc trên mobile. Toàn bộ ticker chuyển động phải êm ái, tạm dừng khi rê chuột.

---

## 7. BRAND DIFFERENTIATION: 4 TRỤ CỘT BẢN SẮC CỦA NAMCUMZ

1. **The Adventurer’s Command Center (Trung Tâm Chỉ Huy Nhà Lữ Hành):**
   - Tái định nghĩa quy trình đặt dịch vụ thành "Nhiệm vụ Ủy Thác". Khách hàng là Nhà Lữ Hành (Traveler / Trailblazer / Rover / Proxy), đội ngũ NAMCUMZ là các Resonator / Booster đồng hành.
2. **100% Progress Transparency (Minh Bạch Tiến Độ Tuyệt Đối):**
   - Điểm đối thủ không thể cạnh tranh bằng: Hệ thống Dashboard độc quyền của NAMCUMZ cho phép theo dõi từng % tiến độ, xem ảnh chụp màn hình nghiệm thu từng chặng, chat trực tiếp theo mã đơn.
3. **Zero-Trust Credential Security (Bảo Mật Cấp Độ Kỹ Thuật):**
   - Thay vì khẩu hiệu sáo rỗng "100% an toàn", NAMCUMZ chứng minh bằng kiến trúc công nghệ: Mật khẩu game được mã hóa PGP server-side qua `pgcrypto`, phân quyền RLS chặt chẽ, cơ chế thu hồi quyền tự động sau khi hoàn tất đơn.
4. **Controlled Premium Sci-Fi Visuals (Thẩm Mỹ Game Đẳng Cấp & Kiềm Chế):**
   - Tone màu chủ đạo Deep Space Navy/Black (`#070912`), điểm xuyết Neon Cyan công nghệ (`#70dce5`), Violet hoàng gia (`#8b5cf6`), Gold tiền tệ (`#ffb800`). Ánh sáng neon được kiểm soát tinh tế, không làm chói mắt hay lấn át thông tin mua hàng.

---

## 8. NEW INFORMATION ARCHITECTURE (KIẾN TRÚC THÔNG TIN HOMEPAGE MỚI)

Sắp xếp luồng đọc tự nhiên, chuẩn CRO, dẫn dắt từ Nhận biết → Tin cậy → Khám phá → Quyết định:

```
[01] Global Announcement Bar (Patch mới Genshin/HSR/ZZZ/WuWa • Nút đóng)
 └── [02] Smart Sticky Navigation (Logo, 4 danh mục chính, Hỗ trợ, Auth CTA / User HUD)
      └── [03] Hero Campaign Engine (Split: Headline rõ ràng + CTAs + Showcase Art/Video loop)
           └── [04] Live Trust & Activity Ticker (Operational Pulse: Đơn hoàn tất, Booster trực, SLA)
                └── [05] Fast Game Selector Bar (Genshin • Star Rail • ZZZ • Wuthering Waves)
                     └── [06] Featured Boosting Services (Cards V2: Giá từ, Thời gian, Cam kết tay 100%)
                          └── [07] Fast Top-Up Currency Hub (Bảng nạp game: Thẻ tháng, Mốc đá, Nạp UID/Login)
                               └── [08] 3-Step Adventurer Journey ("Từ Yêu Cầu Đến Nghiệm Thu")
                                    └── [09] Security & Credibility Matrix (Check Scam, PGP, Bồi thường)
                                         └── [10] Top Booster Hall of Fame (Dữ liệu DB thật từ RPC)
                                              └── [11] Verified Reviews & Social Proof Summary
                                                   └── [12] Interactive FAQ Accordion
                                                        └── [13] Final Conversion CTA ("Sẵn sàng lên đường?")
                                                             └── [14] Multi-column Semantic Footer
                                                                  └── [15] Floating Support Widget (Zalo CSKH)
                                                                       └── [16] Gateway Boot Loader (Chạy lần đầu session)
```

---

## 9. COMMERCE ARCHITECTURE (KIẾN TRÚC THƯƠNG MẠI CHI TIẾT)

### 9.1. Phân loại dịch vụ (Taxonomy)
- **Nhóm 1: Game Boosting (Cày thuê)**
  - *Thám hiểm (Exploration):* Mở rương, thần đồng, 100% map từng khu vực.
  - *Nhiệm vụ (Quests):* Ma Thần, Thế giới, Đồng hành, Sự kiện hạn giờ.
  - *Thử thách Endgame (Challenger):* La Hoàn Thâm Cảnh (Abyss), Kể Chuyện Hư Cấu, Ảo Cảnh Ngày Tận Thế, Tháp Thí Luyện.
  - *Phát triển Nhân vật (Build & Resources):* Farm boss, xả nhựa, nâng cấp thiên phú, vũ khí.
  - *Chăm tài khoản (Daily Management):* Ủy thác ngày, điểm danh, tiêu nhựa tuần.
  - *Yêu cầu tùy chỉnh (Custom Requests):* Đặt theo yêu cầu đặc thù của người chơi.
- **Nhóm 2: Game Top-up (Nạp tiền tệ)**
  - Nạp qua UID: Vé tháng, mốc đá sáng thế / mộng cảnh / lunite (chỉ cần UID + Server).
  - Nạp Login: Gói ưu đãi nạp trực tiếp qua tài khoản game, bảo vệ mật khẩu bằng PGP.

### 9.2. Cấu trúc Thẻ Dịch vụ V2 (Service Card V2 Specification)
Mỗi thẻ cày thuê phải cung cấp đủ 7 trường thông tin:
1. **Game Tag:** Biểu tượng & tên game nhận diện.
2. **Tên gói dịch vụ:** Ngắn gọn, chuẩn thuật ngữ game thủ.
3. **Mức giá tham khảo:** "Từ XX.000đ" (neo giá tâm lý tích cực).
4. **Thời gian hoàn thành:** Ước tính trung bình (VD: "1–3 ngày", "Trong ngày").
5. **Đặc tính dịch vụ:** 3 gạch đầu dòng rõ ràng: `✓ Cày tay 100%`, `✓ Cập nhật tiến độ`, `✓ Nghiệm thu ảnh`.
6. **Badge nổi bật:** Tối đa 1 badge (`HOT`, `PHỔ BIẾN`, `SIÊU TỐC`).
7. **Nút tương tác:** CTA nổi bật ("Đặt Gói Này →").

---

## 10. MOTION & PERFORMANCE SYSTEM

### 10.1. Motion Design Tokens
- Microinteractions (Buttons, Badges, Links): `150ms–220ms`, easing `cubic-bezier(0.2, 0.7, 0.2, 1)`.
- Card Elevation / Hover Lift: `translateY(-4px)` kèm subtle shadow glow, không scale quá 1.02.
- Transition rèm/modal: `300ms–450ms`, easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- Tôn trọng thuộc tính hệ thống: Khi `@media (prefers-reduced-motion: reduce)` bật, tắt toàn bộ transform/parallax/video autoplay, giữ nguyên trạng thái tĩnh hoàn hảo.

### 10.2. Performance Budget
- **LCP (Largest Contentful Paint):** $\le 2.0\text{s}$ trên mạng di động 4G.
- **CLS (Cumulative Layout Shift):** $\le 0.05$ (đặt kích thước cố định cho hình ảnh và video frame).
- **INP (Interaction to Next Paint):** $\le 150\text{ms}$.
- **Bundle JS:** Không tăng thêm framework bên thứ ba, giữ mã nguồn Vanilla siêu nhẹ.
- **Tài nguyên hình ảnh:** 100% WebP định dạng nén tối ưu, responsive `srcset`, lazy load các thành phần dưới nếp gấp.

---

## 11. SECURITY & DATA INTEGRITY GUARANTEE

1. **Tuyệt đối không can thiệp trái phép vào database sản xuất:** Mọi thay đổi schema đều qua script kiểm tra an toàn.
2. **Tuyệt đối không lộ mật khẩu:** Tiếp tục bảo đảm quy tắc vàng: Không đưa plaintext password vào client logs, DOM text, hay inline JS.
3. **Không tạo dữ liệu giả mạo:** Bảng xếp hạng, đánh giá và trạng thái live activity phản ánh dữ liệu trung thực, thông báo trạng thái rõ ràng khi chưa có dữ liệu.

---

## 12. IMPLEMENTATION ROADMAP (LỘ TRÌNH TRIỂN KHAI)

- **Giai đoạn 1 (P0 Core Safety):** Kiểm tra toàn diện hệ thống regression test (`_tools/check.cjs`, `database.test.mjs`, `order-api.test.mjs`, `build.cjs`) để đảm bảo không một luồng hiện tại nào bị phá vỡ.
- **Giai đoạn 2 (P1 Design Tokens & Attention Architecture):** Hoàn thiện bộ token V2 trong `assets/css/design-tokens.css` và `assets/css/landing.css`, chuẩn hóa bảng màu, độ sâu bề mặt, font stack.
- **Giai đoạn 3 (P1 Homepage Re-architecture):** Nâng cấp `index.html` với Hero Campaign Engine, Announcement Bar, Game Selector, Service Cards V2 có mức giá tham khảo, Top-up Hub trực quan, Trust Strip và Check Scam integration.
- **Giai đoạn 4 (P2 Engagement & Polish):** Bổ sung Gateway Boot Loader (session-based, auto-skip, fallback), Live Operational Ticker êm ái, Eco Mode controller và tối ưu micro-interactions.
- **Giai đoạn 5 (QA & Verification):** Chạy lại toàn bộ test suite, kiểm tra responsive trên mọi breakpoint (360px, 390px, 768px, 1024px, 1440px), build dist, kiểm tra syntax và viết báo cáo tổng kết.
