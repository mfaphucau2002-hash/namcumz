# 🎮 KẾ HOẠCH XÂY DỰNG TRANG NẠP GAME — NAMCUMZ
## (Phiên bản đã đánh giá + cập nhật đầy đủ)

> **Phiên bản kế hoạch:** v2.0 (Revised after brand audit)  
> **Ngày tạo:** 2026-08-07 | **Cập nhật:** 2026-08-07  
> **Trạng thái tổng thể:** 🟡 Đang lên kế hoạch

---

## 🔍 TỰ ĐÁNH GIÁ BẢN KẾ HOẠCH v1.0

### ✅ Những điểm đã đúng với brand NAMCUMZ
| Điểm | Đánh giá |
|------|---------|
| Dark background `#070B15` | ✅ Đúng hoàn toàn |
| Màu gold `#E0C276` / `#F4C430` cho giá tiền | ✅ Đúng brand |
| Purple `#9A74F5` → Teal `#68D5C1` gradient | ✅ Logo gradient signature |
| Glassmorphism card style | ✅ Đang dùng trong index.html |
| Font Baloo 2 / Nunito / Be Vietnam Pro | ✅ Đúng font stack hiện tại |
| `observe` scroll-in animation (fadeUp) | ✅ Pattern đang dùng |
| Game card hover `translateY(-3px)` + gold border | ✅ Đúng style |

### ❌ Những điểm THIẾU hoặc CHƯA KHỚP brand
| Thiếu | Vấn đề | Giải pháp |
|-------|---------|----------|
| Font `Montserrat` trong plan | ❌ NAMCUMZ không dùng Montserrat | Dùng `Baloo 2` cho heading giá |
| Plan dùng `Inter` làm body | ❌ Nhầm — body dùng `Nunito` / `Be Vietnam Pro` | Fix lại font |
| Không có notification ticker | ❌ Thiếu tính năng social proof động | Thêm ticker mới |
| Không có floating CSKH widget | ❌ Thiếu điểm tiếp cận nhanh | Thêm widget mới |
| Không có slogans / copywriting | ❌ Trang sẽ nhàm và thiếu hồn | Thêm slogan list |
| Plan dùng CSS vars `--bg-dark` | ❌ Landing page dùng `--lp-*` prefix | Align lại naming |
| Không đề cập `shimmer-btn` class | ❌ Class signature của brand | Áp dụng cho CTA |
| Không đề cập particles animation | ❌ Thiếu ambiance | Thêm particle effect |
| `scrollLeft` review ticker | ❌ Chưa plan cho order notification ticker | Cần ticker riêng |
| Mascot / floating element style | ❌ Chưa plan cho CSKH widget style | Thêm chi tiết |

---

## 🎨 DESIGN SYSTEM (Đã căn chỉnh theo brand thực tế)

### Token màu CHÍNH XÁC từ index.html
```css
/* Landing Page vars (napgame.html sẽ dùng) */
--lp-bg:          #070B15;          /* nền chính */
--lp-bg-sec:      #0D1424;          /* nền phụ (section alternating) */
--lp-card:        rgba(18,25,43,.88); /* card glassmorphism */
--lp-border:      rgba(224,194,118,.28); /* border mặc định */
--lp-gold:        #E0C276;          /* CTA, giá, accent chính */
--lp-purple:      #9A74F5;          /* primary brand */
--lp-teal:        #68D5C1;          /* secondary brand */
--lp-text:        #F7F3E8;          /* text chính */
--lp-text-muted:  #AEB8CC;          /* text phụ */

/* Màu bổ sung cho napgame */
--ng-hot:         #ef4444;          /* badge HOT */
--ng-new:         #68D5C1;          /* badge NEW */
--ng-sale:        #f59e0b;          /* badge SALE */
--ng-selected:    rgba(154,116,245,.25); /* package selected bg */
```

### Font Stack (đúng theo brand)
```css
--font-head: "Baloo 2", "Nunito", "Be Vietnam Pro", system-ui;   /* heading */
--font-body: "Nunito", "Be Vietnam Pro", system-ui;               /* body */
```

### Animation Tokens (kế thừa + mở rộng)
```css
/* Đã có trong brand */
@keyframes gradientMove  /* logo, hero text */
@keyframes fadeUp        /* hero content */
@keyframes floatUp       /* particles */
@keyframes scrollLeft    /* review track */
@keyframes float         /* mascot floating */
@keyframes popIn         /* mascot bubble */
@keyframes shimmer       /* CTA button glow */

/* MỚI thêm cho napgame */
@keyframes tickerScroll  /* purchase notification ticker */
@keyframes cardGlow      /* game card hover glow pulse */
@keyframes priceReveal   /* giá count-up khi scroll into view */
@keyframes slideInRight  /* CSKH widget toggle */
@keyframes typewriter    /* slogan typewriter effect */
@keyframes pulseDot      /* live indicator dot */
@keyframes floatBubble   /* chill ambient floating elements */
```

---

## ✨ CÁC TÍNH NĂNG UI ĐỘNG (Chill & Premium)

### 1. 🔔 Purchase Notification Ticker (như ảnh)
Thanh chạy ngang ở top của trang (dưới header), màu `rgba(0,0,0,0.5)` + blur:
```
🔔 Hi*****an đã mua thành công Genshin 980 Đá với giá 270.000đ  2 giờ trước  |
   T*****ng đã nạp MLBB Diamond 500  1 giờ trước  |  ...
```
- **Looping marquee** tự động cuộn trái
- **Avatar mini** 24px với initial letter màu gradient
- **Dot "LIVE"** nhấp nháy màu đỏ/xanh bên trái
- Data: hardcode fake + thực từ Supabase `napgame_orders` (latest 10)
- Hover: animation dừng, tooltip chi tiết

### 2. 🌟 Floating CSKH Widget (như ảnh)
Panel cố định bên phải màn hình, toggle slide-in từ phải:

```
[>] ← Nút toggle (collapsed)

Khi mở:
┌─────────────────────┐
│  💬  Hỗ trợ        │ → Link Zalo cá nhân
│  👥  Zalo Group    │ → Link Group
│  🎮  Nạp Game      │ → /napgame.html
│  🎵  Nhạc: Tắt/ON  │ → Toggle music
│  ─────────────────  │
│  [💬 CSKH]         │ → Nút nổi bật chính
└─────────────────────┘
```

**Style:** Glassmorphism `rgba(13,20,36,.9)` + `backdrop-filter: blur(20px)`, border `rgba(154,116,245,.3)`, icon circles gradient purple→teal  
**Animation:** `slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)`  
**Vị trí:** `position: fixed; right: 0; bottom: 50%; transform: translateY(50%)`

### 3. 💫 Hero Animated Slogans (Typewriter + Fade)
```javascript
const slogans = [
  "Nạp game uy tín — An tâm tận hưởng ✨",
  "Giá tốt nhất thị trường — Có bill đầy đủ 💎",
  "Xử lý trong 5 phút — Không chờ đợi ⚡",
  "Hơn 15.000 đơn hàng thành công 🏆",
  "Bảo mật tuyệt đối — Không lo mất acc 🔒",
];
```
Chạy typewriter effect → hiển thị đủ → fade out → slogan tiếp theo

### 4. 🌌 Ambient Background
- **Particle mesh** (floating dots `rgba(154,116,245,.15)`) — nhẹ nhàng như index.html
- **Radial gradient pulse** ở center, nhịp thở chậm `6s ease-in-out infinite`
- **Game-specific glow** khi hover card: màu gradient của game đó tỏa sáng nhẹ

### 5. 🃏 Game Card Micro-interactions
- **3D tilt** nhẹ khi hover (CSS `perspective + rotateX/rotateY` 3-5deg)
- **Gradient border glow** theo màu game khi hover
- **"Đang có người xem"** counter random `12–38 người` animate vào/ra
- **Ribbon badge** (HOT/NEW/SALE) với shimmer animation

### 6. 📊 Price Count-up
Khi package selector hiện ra, số tiền count-up từ 0 → giá thật  
`0đ → 270.000đ` (duration 400ms, ease-out)

### 7. 🧊 Purchase Social Proof Popup
Sau 10s, hiện popup nhỏ bottom-left (không át nội dung):
```
┌──────────────────────────────┐
│ 🎮 T*****n vừa nạp Genshin  │
│    Gói 300+30 Đá · 2 phút trước│
│ [✓ An toàn và minh bạch]    │
└──────────────────────────────┘
```
Auto-dismiss sau 5s, slide animation.

### 8. ⚡ Loading States
- Skeleton loading cho game grid (shimmer grey bars)
- Submit button spinner + text đổi "Đang đặt hàng..."
- Success confetti nhẹ (CSS only, không library) + checkmark animate

---

## 💬 SLOGANS & COPYWRITING

### Hero Section
- **Main headline:** "Nạp Game Giá Tốt — Minh Bạch — Có Bill"
- **Subhead:** "Hơn 10 tựa game hot. Xử lý trong 5 phút. An toàn tuyệt đối."
- **Eyebrow:** "⚡ DỊCH VỤ NẠP GAME UY TÍN"

### Trust Badges
- ⚡ "Xử lý < 5 phút"
- 📄 "Có bill đầy đủ"  
- 🔒 "Bảo mật 100%"
- 💯 "Hoàn tiền nếu lỗi"

### Game Section Header
- "Chọn Game · Chọn Gói · Nhận Nạp"
- Sub: "Từ Genshin đến Free Fire — NAMCUMZ lo hết 🎮"

### Form Modal
- "Còn lại 3 bước là xong 👇"
- "UID của bạn được bảo mật tuyệt đối 🔒"
- "Sau khi đặt hàng, chúng tôi sẽ liên hệ xác nhận trong 5 phút"

### Trust Section
- "Tại sao chọn NAMCUMZ?"
- Sub: "Không phải tự nói — 15.000+ khách hàng đã tin tưởng"

### FAQ
- "Nạp có an toàn không?" → "Tuyệt đối an toàn. Chúng tôi không cần mật khẩu game, chỉ cần UID."
- "Mất bao lâu?" → "Thường dưới 5 phút với game phổ biến."
- "Nếu nạp nhầm gói?" → "Liên hệ CSKH ngay — hoàn tiền hoặc đổi gói."

### Footer CTA
- "Còn thắc mắc? Chat ngay với NAMCUMZ 💬"

### CSKH Widget Labels
- "Hỗ trợ" (Zalo cá nhân)
- "Zalo Group" (Group khách hàng)  
- "Nạp Game" (Link nhanh)
- "Nhạc: ON/Tắt"
- **Nút chính:** "💬 CSKH"

---

## 📁 CẤU TRÚC FILE (Cập nhật)

```
namcumz/
├── index.html                    [MODIFY] Thêm section teaser + ticker + CSKH widget
├── napgame.html                  [NEW] Trang nạp game chính
├── assets/
│   ├── css/
│   │   ├── style.css             [KEEP] Không sửa vars hiện tại
│   │   └── napgame.css           [NEW] CSS riêng, dùng lại --lp-* vars
│   ├── js/
│   │   └── napgame.js            [NEW] Game data, form logic, Supabase, ticker
│   └── images/
│       └── games/                [NEW DIR] User cung cấp sau
│           ├── genshin.webp      ← pending
│           ├── hsr.webp          ← pending
│           └── ...
└── NAP_GAME_PLAN.md              [THIS FILE] — Cập nhật liên tục
```

---

## 🗄️ DATABASE SCHEMA (Supabase)

### Table: `napgame_orders`
```sql
CREATE TABLE napgame_orders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  user_id         UUID REFERENCES auth.users(id),     -- null nếu guest
  customer_name   TEXT,
  customer_phone  TEXT NOT NULL,
  game_id         TEXT NOT NULL,        -- 'genshin', 'hsr', 'wuwa', ...
  game_name       TEXT NOT NULL,
  package_id      TEXT NOT NULL,        -- 'genshin-60da'
  package_name    TEXT NOT NULL,        -- '60 Đá Sáng Thế'
  price           BIGINT NOT NULL,      -- VNĐ
  uid_ingame      TEXT NOT NULL,
  server          TEXT DEFAULT 'Asia',
  note            TEXT,
  status          TEXT DEFAULT 'pending',  -- pending|processing|done|failed|refunded
  payment_method  TEXT DEFAULT 'manual',
  admin_note      TEXT,
  is_public       BOOLEAN DEFAULT true  -- hiện trên ticker hay không
);

-- Index để query ticker nhanh
CREATE INDEX idx_napgame_orders_created ON napgame_orders(created_at DESC);
CREATE INDEX idx_napgame_orders_status ON napgame_orders(status);
```

---

## 🏗️ GAME CATALOG (Phase 1 — 10 games)

| # | Game ID | Tên | Platform | Gradient Card | Badge |
|---|---------|-----|----------|---------------|-------|
| 1 | `genshin` | Genshin Impact | PC/Mobile | `#4c1d95→#1e3a8a` | 🔥 HOT |
| 2 | `hsr` | Honkai: Star Rail | PC/Mobile | `#1e1b4b→#7f1d1d` | 🔥 HOT |
| 3 | `wuwa` | Wuthering Waves | PC/Mobile | `#0f172a→#1e3a5f` | ✨ NEW |
| 4 | `mlbb` | Mobile Legends | Mobile | `#1c1917→#92400e` | 🔥 HOT |
| 5 | `pubg` | PUBG Mobile | Mobile | `#1c1917→#78350f` | — |
| 6 | `lol` | League of Legends | PC | `#1e1b08→#3b2a00` | — |
| 7 | `valorant` | Valorant | PC | `#1e0000→#3b0000` | — |
| 8 | `fc-online` | EA FC Online | PC | `#001a3a→#003087` | — |
| 9 | `lien-quan` | Liên Quân Mobile | Mobile | `#1a0038→#2d0057` | — |
| 10 | `free-fire` | Free Fire | Mobile | `#1c0a00→#3b1200` | — |

---

## 📐 LAYOUT CÁC SECTION (`napgame.html`) — CHI TIẾT

### SECTION 0 — NOTIFICATION TICKER (full width, fixed top dưới header)
```
[● LIVE] 🔔 Hi*****an đã nạp Genshin Impact 980 Đá  •  270.000đ  •  2 giờ trước  |  T*****ng đã nạp...
```
Height: `44px`, bg: `rgba(0,0,0,0.7)`, blur, border-bottom: `1px solid rgba(154,116,245,.2)`

### SECTION 1 — HERO
```
[BG: Animated radial gradient mesh + particles]
[Eyebrow: ⚡ DỊCH VỤ NẠP GAME UY TÍN]

Nạp Game Giá Tốt
Minh Bạch — Có Bill

[Slogan typewriter: "Xử lý trong 5 phút — Không chờ đợi ⚡"]

[🔍 Tìm tên game...                    ] [🔍]

[⚡ <5 phút] [📄 Có bill] [🔒 Bảo mật] [💯 Hoàn tiền]
```

### SECTION 2 — GAME GRID
```
[Tabs: Tất cả (10) | 📱 Mobile (6) | 💻 PC (4) | 🔥 Hot (3)]

4 columns desktop / 2 tablet / 1 mobile
┌────────────────┐
│ [Game Image]   │  ← aspect-ratio: 3/4
│ ┌──[🔥HOT]    │
│ Game Name      │
│ "Từ 20.000đ"   │
│ [Nạp ngay →]  │
└────────────────┘
```

### SECTION 3 — FORM NẠP (Drawer từ phải, 480px wide)
```
Backdrop: rgba(0,0,0,0.7)

┌──── Nạp Genshin Impact ────┐ [✕]
│ [Game logo 48px] Genshin   │
│ ════════════════════════   │
│ BƯỚC 1 ─── Chọn gói nạp   │
│                             │
│ ┌──────┐ ┌──────┐          │
│ │ 60 Đá│ │300 Đá│          │
│ │ 20k  │ │ 90k  │ ← BEST   │
│ └──────┘ └──────┘          │
│ ┌──────┐ ┌──────┐          │
│ │980 Đá│ │1980Đ │          │
│ │ 270k │ │ 570k │          │
│ └──────┘ └──────┘          │
│                             │
│ BƯỚC 2 ─── Thông tin       │
│ UID: [__________________]  │
│ Máy chủ: [Asia ▼]          │
│ SĐT/Tên: [______________]  │
│ Ghi chú: [______________]  │
│                             │
│ ╔══════════════════════╗   │
│ ║ 980+110 Đá → 270.000đ║   │
│ ╚══════════════════════╝   │
│                             │
│ [💬 Zalo]   [✅ Đặt hàng] │
│                             │
│ 🔒 An toàn  📄 Bill  ⚡ 5' │
└─────────────────────────────┘
```

### SECTION 4 — QUY TRÌNH (Steps với animation)
```
① Chọn game  →  ② Chọn gói  →  ③ Nhập UID  →  ④ Xác nhận  →  ⑤ Nhận nạp ✓
   Icon: 🎮          💎             📋             💬              🎉
```
Line connector fade-in dần theo scroll.

### SECTION 5 — TRUST STATS
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ 15.000+ │ │  4.9 ★  │ │ < 5 ph  │ │  100%   │
│ Đơn nạp │ │ Đánh giá│ │ Xử lý  │ │ Bảo mật │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
[Count-up animation khi scroll vào view]
```

### SECTION 6 — TESTIMONIALS (kế thừa `scrollLeft` từ index.html)
Review cards từ khách hàng đã nạp

### SECTION 7 — FAQ (accordion)

---

## 🔧 FLOATING CSKH WIDGET (Fixed, tất cả pages)

Widget sẽ được thêm vào cả `index.html` và `napgame.html`.

```html
<!-- HTML Structure -->
<div id="cskh-widget" class="cskh-widget">
  <button class="cskh-toggle" onclick="toggleCSKH()">
    <i class="fa-solid fa-chevron-left" id="cskh-arrow"></i>
  </button>
  <div class="cskh-panel" id="cskhPanel">
    <a href="[ZALO_LINK]" class="cskh-item" target="_blank">
      <div class="cskh-icon"><i class="fa-solid fa-comment-dots"></i></div>
      <span>Hỗ trợ</span>
    </a>
    <a href="[ZALO_GROUP]" class="cskh-item" target="_blank">
      <div class="cskh-icon"><i class="fa-solid fa-users"></i></div>
      <span>Zalo Group</span>
    </a>
    <a href="/napgame.html" class="cskh-item">
      <div class="cskh-icon"><i class="fa-solid fa-gamepad"></i></div>
      <span>Nạp Game</span>
    </a>
    <button class="cskh-item" onclick="toggleMusic()">
      <div class="cskh-icon"><i class="fa-solid fa-volume-high"></i></div>
      <span id="musicLabel">Nhạc: Tắt</span>
    </button>
    <a href="[ZALO_LINK]" class="cskh-main-btn" target="_blank">
      <i class="fa-solid fa-headset"></i> CSKH
    </a>
  </div>
</div>
```

**CSS Style:**
```css
.cskh-widget {
  position: fixed; right: 0; top: 50%; transform: translateY(-50%);
  z-index: 1100; display: flex; align-items: center;
}
.cskh-toggle {
  width: 36px; height: 70px;
  background: linear-gradient(135deg, #9A74F5, #68D5C1);
  border-radius: 10px 0 0 10px; border: none; color: #fff;
  cursor: pointer; transition: 0.3s;
}
.cskh-panel {
  background: rgba(13,20,36,0.92); backdrop-filter: blur(20px);
  border: 1px solid rgba(154,116,245,0.3); border-right: none;
  border-radius: 16px 0 0 16px; padding: 16px 12px;
  display: flex; flex-direction: column; gap: 10px;
  transform: translateX(100%); transition: 0.35s cubic-bezier(0.175,0.885,0.32,1.275);
}
.cskh-panel.open { transform: translateX(0); }
.cskh-icon {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, rgba(154,116,245,.3), rgba(104,213,193,.3));
  border: 1px solid rgba(154,116,245,.4);
  display: flex; align-items: center; justify-content: center;
  color: #9A74F5; font-size: 18px;
}
.cskh-item {
  display: flex; align-items: center; gap: 12px;
  color: #F7F3E8; text-decoration: none; font-size: 14px;
  font-weight: 600; padding: 4px 0; transition: 0.2s;
}
.cskh-item:hover .cskh-icon { background: linear-gradient(135deg, #9A74F5, #68D5C1); }
.cskh-main-btn {
  background: linear-gradient(135deg, #9A74F5, #68D5C1);
  color: #fff; padding: 12px 20px; border-radius: 10px;
  font-weight: 800; text-align: center; margin-top: 4px;
  transition: 0.2s; font-size: 15px;
}
.cskh-main-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(154,116,245,.4); }
```

---

## 🎬 PURCHASE NOTIFICATION TICKER

```javascript
// napgame.js
const FAKE_ORDERS = [
  { user: 'Hi*****an', game: 'Genshin Impact', pkg: '980+110 Đá', price: '270.000đ', time: '2 giờ trước' },
  { user: 'T*****ng', game: 'MLBB', pkg: '500 Kim Cương', price: '120.000đ', time: '3 giờ trước' },
  { user: 'Ng*****êu', game: 'Honkai Star Rail', pkg: '60 Jade', price: '20.000đ', time: '4 giờ trước' },
  // + data thực từ Supabase napgame_orders (is_public=true, status=done)
];

function buildTicker(orders) {
  return orders.map(o =>
    `<span class="ticker-item">
      <span class="ticker-avatar">${o.user[0]}</span>
      <b>${o.user}</b> đã mua thành công <b>${o.game}</b> - ${o.pkg}
      <span class="ticker-price">${o.price}</span>
      <span class="ticker-time">${o.time}</span>
    </span>`
  ).join('<span class="ticker-sep">•</span>');
}
```

CSS:
```css
.ticker-wrap {
  position: sticky; top: 72px; /* dưới header */ z-index: 900;
  background: rgba(7,11,21,0.85); backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(154,116,245,.2);
  height: 44px; overflow: hidden; display: flex; align-items: center;
}
.ticker-live { 
  display: flex; align-items: center; gap: 8px; padding: 0 16px;
  border-right: 1px solid rgba(255,255,255,.1); flex-shrink: 0;
  font-size: 12px; font-weight: 700; color: #ef4444;
}
.ticker-dot { 
  width: 8px; height: 8px; background: #ef4444; border-radius: 50%;
  animation: pulseDot 1.5s ease-in-out infinite;
}
.ticker-content { overflow: hidden; flex: 1; }
.ticker-track { display: inline-flex; gap: 0; animation: tickerScroll 40s linear infinite; }
.ticker-track:hover { animation-play-state: paused; }
@keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
@keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
```

---

## 🗓️ BUILD ROADMAP (Cập nhật)

### 🔴 PHASE 1A — Nền tảng
- [ ] SQL: Tạo `napgame_orders` trên Supabase
- [ ] `napgame.css`: CSS vars, game card, package selector, drawer, ticker, widget
- [ ] `napgame.html`: Skeleton + Hero + Ticker + CSKH Widget placeholder
- [ ] `napgame.js`: Game data config object + package pricing
- [ ] CSKH widget HTML + CSS (dùng chung cho index.html)

### 🟡 PHASE 1B — Core Features
- [ ] Game card render (dynamic từ JS data)
- [ ] Filter tabs + Search
- [ ] Drawer form nạp game
- [ ] Package selector interactive
- [ ] Form validation + submit → Supabase
- [ ] Success state animation
- [ ] Purchase notification ticker (fake data + Supabase live)

### 🟢 PHASE 1C — Polish & Animations
- [ ] Hero slogan typewriter effect
- [ ] Ambient particles + radial pulse
- [ ] Game card 3D tilt hover
- [ ] Price count-up animation
- [ ] Social proof popup (bottom-left)
- [ ] Trust stats count-up
- [ ] FAQ accordion
- [ ] Full responsive mobile
- [ ] Teaser section trên `index.html`
- [ ] Add CSKH widget vào `index.html`
- [ ] Hình ảnh game (sau khi bạn cung cấp)

### 🔵 PHASE 1D — Admin
- [ ] Tab "Nạp Game" trong dashboard
- [ ] Bảng đơn nạp + filter
- [ ] Update status actions
- [ ] Revenue stats

### ⚫ PHASE 2 — Thanh toán
- [ ] VNPay / MoMo
- [ ] QR code ngân hàng tự động

---

## 📌 ĐIỂM CHỜ (Input từ bạn)

| # | Cần gì | Trạng thái |
|---|--------|-----------|
| 1 | Ảnh logo/banner từng game | ⏳ Chờ |
| 2 | Bảng giá từng gói nạp theo game | ⏳ Chờ |
| 3 | Link Zalo cá nhân CSKH | ⏳ Chờ |
| 4 | Link Zalo Group | ⏳ Chờ |
| 5 | Số TK ngân hàng / QR code | ⏳ Phase 2 |

---

## 📊 BẢNG TIẾN ĐỘ

| Phase | Task | Trạng thái | Ngày |
|-------|------|-----------|------|
| 1A | SQL `napgame_orders` | ⬜ | — |
| 1A | `napgame.css` | ⬜ | — |
| 1A | `napgame.html` skeleton | ⬜ | — |
| 1A | `napgame.js` game data | ⬜ | — |
| 1A | CSKH Widget CSS/HTML | ⬜ | — |
| 1B | Game card render | ⬜ | — |
| 1B | Filter + Search | ⬜ | — |
| 1B | Form drawer | ⬜ | — |
| 1B | Package selector | ⬜ | — |
| 1B | Submit → Supabase | ⬜ | — |
| 1B | Ticker (fake + live) | ⬜ | — |
| 1C | Hero slogan typewriter | ⬜ | — |
| 1C | Particles + pulse BG | ⬜ | — |
| 1C | 3D tilt hover cards | ⬜ | — |
| 1C | Price count-up | ⬜ | — |
| 1C | Social proof popup | ⬜ | — |
| 1C | Trust stats count-up | ⬜ | — |
| 1C | FAQ accordion | ⬜ | — |
| 1C | Responsive mobile | ⬜ | — |
| 1C | Teaser trên index.html | ⬜ | — |
| 1C | CSKH widget → index.html | ⬜ | — |
| 1D | Admin tab nạp game | ⬜ | — |
| 1D | Table đơn + filter | ⬜ | — |

> ⬜ Chưa bắt đầu | 🔄 Đang làm | ✅ Hoàn thành | ❌ Bị chặn

---

*File này được cập nhật sau mỗi session build. Đọc bảng tiến độ để tiếp tục từ đúng chỗ.*
