# 🎮 KẾ HOẠCH XÂY DỰNG TRANG NẠP GAME — NAMCUMZ

> **Phiên bản kế hoạch:** v1.0  
> **Ngày tạo:** 2026-08-07  
> **Cập nhật lần cuối:** 2026-08-07  
> **Trạng thái tổng thể:** 🔴 Chưa bắt đầu

---

## 📋 TỔNG QUAN DỰ ÁN

### Mục tiêu
Xây dựng **trang dịch vụ nạp game** cho NAMCUMZ — tương tự napnhanh.vn nhưng mang phong cách **premium dark-mode** của thương hiệu. Giai đoạn 1 là UI tĩnh với form đặt hàng qua Supabase. Giai đoạn 2 tích hợp cổng thanh toán thực.

### Phạm vi Giai đoạn 1 (BUILD NOW)
- ✅ Section nạp game trên `index.html` (teaser + link đến trang riêng)  
- ✅ Trang riêng `napgame.html` với đầy đủ game catalog  
- ✅ UI hiển thị bảng giá theo từng game  
- ✅ Form đặt hàng nạp game (ghi vào Supabase)  
- ✅ Quản lý đơn nạp game trong `dashboard.html` (admin)  
- ⬜ Hình ảnh game (bạn sẽ cung cấp sau)

### Phạm vi Giai đoạn 2 (FUTURE)
- ⬜ Tích hợp VNPay / MoMo / ZaloPay  
- ⬜ Tự động xử lý nạp qua API game  
- ⬜ Hệ thống affiliate / referral

---

## 🎨 DESIGN SYSTEM

### Palette màu (kế thừa từ NAMCUMZ + mở rộng cho napgame)
```
Nền chính:     #080B10  (--bg-dark)
Card:          #15181F  (--card-bg)
Primary:       #9868F8  (tím — nút CTA chính)
Secondary:     #65D5C3  (xanh teal — badge/accent)
Gold:          #F4C430  (--genshin-gold — giá tiền, highlight)
Border:        #292D38  (--border-light)
Text:          #f8fafc / #94a3b8

--- Màu riêng cho napgame ---
Game card overlay: rgba(0,0,0,0.55) gradient
Selected package:  border glow #9868F8 + box-shadow rgba(152,104,248,0.4)
Price tag:         #F4C430 Montserrat 900
Badge HOT:         #ef4444 → #dc2626
Badge NEW:         #65D5C3 → #0891b2
Badge SALE:        #f59e0b → #d97706
```

### Phong cách UI tổng thể
- **Dark glassmorphism** — backdrop-filter blur, gradient border mờ
- **Micro-animations** — card hover lift (translateY -4px), price glow, gradient shimmer CTA
- **Game card** với ribbon "HOT🔥" / "NEW✨" / "SALE💸"
- **Progress steps** hiển thị quy trình nạp (Chọn game → Chọn gói → Nhập UID → Xác nhận)
- Font: `Inter` (body), `Montserrat` (tiêu đề lớn, giá tiền)
- Responsive: Mobile-first, breakpoints 768px / 1024px
- Animations: CSS keyframes, không dùng thư viện ngoài

### Tham khảo UX từ napnhanh.vn (adapt cho NAMCUMZ dark theme)
- Search/filter game theo tên + category tabs
- Game card với logo lớn, gradient overlay game-specific
- Tabs chọn mệnh giá với visual "selected" rõ ràng
- Form 2 cột: bên trái chọn gói, bên phải nhập thông tin
- Trust badges dưới form
- QR code thanh toán (Phase 2)

---

## 📁 CẤU TRÚC FILE

```
namcumz/
├── index.html                    [MODIFY] Thêm section "Nạp Game" teaser
├── napgame.html                  [NEW] Trang nạp game chính
├── assets/
│   ├── css/
│   │   ├── style.css             [MODIFY] Thêm CSS vars cho napgame
│   │   └── napgame.css           [NEW] CSS riêng cho trang nạp game
│   ├── js/
│   │   └── napgame.js            [NEW] Logic nạp game, form, Supabase
│   └── images/
│       └── games/                [NEW DIR] Ảnh logo từng game (user cung cấp)
│           ├── genshin.webp
│           ├── hsr.webp
│           ├── wuwa.webp
│           └── ...
└── NAP_GAME_PLAN.md              [THIS FILE]
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
  customer_phone  TEXT,
  game_id         TEXT NOT NULL,        -- 'genshin', 'hsr', 'wuwa', ...
  game_name       TEXT NOT NULL,
  package_id      TEXT NOT NULL,        -- '60-da', '300-da', ...
  package_name    TEXT NOT NULL,        -- '60 Đá Sáng Thế'
  price           BIGINT NOT NULL,      -- giá VNĐ
  uid_ingame      TEXT NOT NULL,        -- UID trong game
  server          TEXT,                 -- server game (Asia, EU, etc.)
  note            TEXT,
  status          TEXT DEFAULT 'pending',     -- pending|processing|done|failed
  payment_method  TEXT DEFAULT 'manual',      -- manual|vnpay|momo
  admin_note      TEXT
);
```

### Table: `napgame_packages` (Cấu hình giá — admin quản lý về sau)
```sql
CREATE TABLE napgame_packages (
  id              TEXT PRIMARY KEY,     -- 'genshin-60da'
  game_id         TEXT NOT NULL,
  game_name       TEXT NOT NULL,
  name            TEXT NOT NULL,        -- '60 Đá Sáng Thế'
  price           BIGINT NOT NULL,      -- giá VNĐ
  original_price  BIGINT,               -- giá gốc (show discount %)
  description     TEXT,
  badge           TEXT,                 -- 'HOT', 'SALE', 'NEW'
  sort_order      INT DEFAULT 0,
  active          BOOLEAN DEFAULT true
);
```

> **Giai đoạn 1A:** Data packages sẽ hardcode trong `napgame.js` (dễ sửa, không cần DB).  
> **Về sau:** Migrate sang DB để admin chỉnh giá từ dashboard.

---

## 🏗️ GAME CATALOG (Phase 1)

| Game ID | Tên Game | Platform | Màu gradient card |
|---------|----------|----------|-------------------|
| `genshin` | Genshin Impact | PC/Mobile | `#4c1d95 → #1e3a8a` |
| `hsr` | Honkai: Star Rail | PC/Mobile | `#1e1b4b → #7f1d1d` |
| `wuwa` | Wuthering Waves | PC/Mobile | `#0f172a → #1e3a5f` |
| `mlbb` | Mobile Legends | Mobile | `#1c1917 → #92400e` |
| `pubg` | PUBG Mobile | Mobile | `#1c1917 → #78350f` |
| `lol` | League of Legends | PC | `#1e1b08 → #3b2a00` |
| `valorant` | Valorant | PC | `#1e0000 → #3b0000` |
| `fc-online` | EA FC Online | PC | `#001a3a → #003087` |
| `lien-quan` | Liên Quân Mobile | Mobile | `#1a0038 → #2d0057` |
| `free-fire` | Free Fire | Mobile | `#1c0a00 → #3b1200` |

---

## 📐 LAYOUT CÁC SECTION (`napgame.html`)

### SECTION 1 — HERO
```
┌─────────────────────────────────────────────────────────┐
│  BG: animated gradient mesh dark purple/teal            │
│                                                         │
│  ⚡ NẠP GAME GIÁ TỐT — BẢO MẬT — CÓ BILL             │
│  Hỗ trợ 10+ tựa game hot — Xử lý trong 5 phút         │
│                                                         │
│  [🔍 Tìm tên game... ___________________________]      │
│                                                         │
│  [✅ 5 phút] [🔒 Bảo mật] [📄 Có bill] [💯 Uy tín]   │
└─────────────────────────────────────────────────────────┘
```

### SECTION 2 — GAME GRID
```
[Tabs: Tất cả (10) | Mobile (6) | PC (4) | 🔥 Hot (3)]

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ [IMG]    │  │ [IMG]    │  │ [IMG]    │  │ [IMG]    │
│ ─────────│  │ ─────────│  │ ─────────│  │ ─────────│
│ Genshin  │  │  HSR     │  │  WuWa    │  │   MLBB   │
│ Impact   │  │          │  │          │  │          │
│ 🔥HOT    │  │          │  │ ✨NEW    │  │ 🔥HOT    │
│ Từ 20k   │  │ Từ 20k   │  │ Từ 20k   │  │ Từ 20k   │
│[Nạp ngay]│  │[Nạp ngay]│  │[Nạp ngay]│  │[Nạp ngay]│
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### SECTION 3 — FORM NẠP (Modal/Drawer khi click game)
```
┌─────────────────────────────────────────────────┐
│ ← Genshin Impact                          [✕]   │
│ ─────────────────────────────────────────────── │
│ BƯỚC 1: Chọn gói nạp                           │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ 60 Đá │ │300+30Đ │ │980+110 │ │ Full   │   │
│ │  20k  │ │  90k   │ │  270k  │ │ Pack   │   │
│ │       │ │ ★BEST  │ │        │ │1.850k  │   │
│ └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                 │
│ BƯỚC 2: Thông tin tài khoản                     │
│ UID trong game: [___________________________]   │
│ Server:         [Asia ▼]                        │
│ Họ tên / SĐT:  [___________________________]   │
│ Ghi chú:        [___________________________]   │
│                                                 │
│ ╔═══════════════════════════════════════════╗   │
│ ║ GÓI: 980+110 Đá Sáng Thế  →  270.000đ   ║   │
│ ╚═══════════════════════════════════════════╝   │
│                                                 │
│ [💬 Liên hệ Zalo]    [✅ Đặt hàng ngay →]      │
│                                                 │
│ 🔒 An toàn  📄 Có bill  ⚡ Nhanh trong 5 phút  │
└─────────────────────────────────────────────────┘
```

### SECTION 4 — QUY TRÌNH (Steps)
```
[1] Chọn game → [2] Chọn gói → [3] Nhập UID → [4] Xác nhận → [5] Nhận nạp ✅
Với icon + mô tả ngắn cho từng bước
```

### SECTION 5 — TRUST & STATS
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  15,420  │  │  4.9 ★   │  │  < 5min  │  │  100%    │
│  Đơn đã  │  │  Đánh    │  │  Xử lý   │  │  Bảo     │
│  nạp     │  │  giá     │  │  nhanh   │  │  mật     │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### SECTION 6 — FAQ
- Nạp có an toàn không?
- Mất bao lâu để nhận nạp?
- Nếu có lỗi thì sao?
- Cách xem UID trong game?

---

## 🌐 SECTION TEASER TRÊN `index.html`

Thêm sau section "Dịch Vụ Nổi Bật", trước section Teyvat TV:

```
┌─────────────────────────────────────────────────────┐
│  ⚡ NẠP GAME — NHANH · RẺ · CÓ BILL               │
│  Hỗ trợ 10+ tựa game hot nhất hiện nay             │
│                                                     │
│  [Logo1][Logo2][Logo3][Logo4][Logo5][Logo6]  +4     │
│                                                     │
│  [Khám phá dịch vụ nạp game →]                     │
└─────────────────────────────────────────────────────┘
```

---

## 👑 ADMIN DASHBOARD

Thêm tab "🎮 Nạp Game" trong `dashboard.html`:
- Bảng đơn nạp: Mã đơn, Game, Gói, Giá, UID, SĐT, Trạng thái, Ngày
- Filter: Game | Trạng thái | Ngày
- Nút: Xác nhận xử lý, Đánh dấu hoàn thành, Hủy đơn
- Stats: Tổng đơn nạp, Doanh thu nạp, Đơn đang xử lý

---

## 🗓️ BUILD ROADMAP

### 🔴 PHASE 1A — Nền tảng (Làm đầu tiên)
- [ ] SQL: Tạo table `napgame_orders` trên Supabase
- [ ] `napgame.css`: Design tokens, game card, package selector, form styles
- [ ] `napgame.html`: Skeleton layout + Hero + Game Grid (placeholder)
- [ ] `napgame.js`: Game data object + packages config

### 🟡 PHASE 1B — Core Features
- [ ] Game card render từ data (JS dynamic)
- [ ] Filter tabs (Tất cả / Mobile / PC / Hot)
- [ ] Search game theo tên
- [ ] Modal/Drawer form nạp game
- [ ] Package selector interactive (click để chọn, highlight)
- [ ] Form validation
- [ ] Submit form → Supabase `napgame_orders`
- [ ] Success message + email/Zalo redirect

### 🟢 PHASE 1C — Polish
- [ ] Teaser section trên `index.html`
- [ ] Link "Nạp Game" trên nav (`index.html` + `dashboard.html`)
- [ ] Steps visualization (quy trình nạp)
- [ ] Trust badges + Stats section
- [ ] FAQ accordion
- [ ] Full responsive mobile
- [ ] Loading states + error handling
- [ ] Hình ảnh game (sau khi bạn cung cấp)

### 🔵 PHASE 1D — Admin
- [ ] Tab "Nạp Game" trong dashboard admin
- [ ] Table đơn nạp + filter
- [ ] Update status actions
- [ ] Revenue stats cho nạp game

### ⚫ PHASE 2 — Thanh toán thực (Tương lai)
- [ ] VNPay integration
- [ ] MoMo integration
- [ ] Auto-process via API

---

## 📌 ĐIỂM CHỜ (Cần input từ bạn)

| # | Cần gì | Trạng thái | Ghi chú |
|---|--------|-----------|---------|
| 1 | Ảnh logo/banner từng game | ⏳ Chờ | WebP preferred, min 400x400px |
| 2 | Bảng giá chi tiết từng gói nạp | ⏳ Chờ | Theo từng game |
| 3 | Link Zalo / SĐT chăm sóc khách | ⏳ Chờ | Hiện trên form nạp |
| 4 | Có muốn QR code ngân hàng không? | ⏳ Chờ | Cho thanh toán thủ công |
| 5 | API cổng thanh toán | ⏳ Chờ | Phase 2 |

---

## 📊 BẢNG TIẾN ĐỘ (Cập nhật khi build)

| Phase | Task | Trạng thái | Ngày hoàn thành |
|-------|------|-----------|----------------|
| 1A | SQL: `napgame_orders` | ⬜ | — |
| 1A | `napgame.css` design tokens | ⬜ | — |
| 1A | `napgame.html` skeleton | ⬜ | — |
| 1A | `napgame.js` game data | ⬜ | — |
| 1B | Game card render | ⬜ | — |
| 1B | Filter + Search | ⬜ | — |
| 1B | Form modal/drawer | ⬜ | — |
| 1B | Package selector | ⬜ | — |
| 1B | Submit → Supabase | ⬜ | — |
| 1C | Teaser trên index.html | ⬜ | — |
| 1C | Nav link cập nhật | ⬜ | — |
| 1C | Trust + FAQ section | ⬜ | — |
| 1C | Responsive mobile | ⬜ | — |
| 1D | Admin tab nạp game | ⬜ | — |
| 1D | Table đơn + filter | ⬜ | — |

> **Quy ước trạng thái:**  
> ⬜ Chưa bắt đầu | 🔄 Đang làm | ✅ Hoàn thành | ❌ Bị chặn

---

*File này sẽ được cập nhật sau mỗi session build. Đọc bảng tiến độ để biết tiếp tục từ đâu.*
