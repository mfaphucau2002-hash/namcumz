# 📐 QUY TẮC LÀM VIỆC — NAMCUMZ PROJECT

Áp dụng cho mọi session build. AI **bắt buộc** tuân thủ toàn bộ các quy tắc này.

---

## 1. CẤU TRÚC THƯ MỤC — KHÔNG ĐƯỢC PHÁ VỠ

```
namcumz/
├── 🌐 *.html          — Các trang web (index, dashboard, login, v.v.)
├── ⚙️  vercel.json     — Cấu hình deploy
├── 🚫 .gitignore       — File loại trừ git
│
├── 📂 assets/          — Tài nguyên tĩnh
│   ├── css/            — Stylesheet (style.css + file riêng theo trang)
│   ├── js/             — JavaScript (app.js + file riêng theo tính năng)
│   └── images/         — Hình ảnh (logo.jpg, games/, v.v.)
│
├── 📂 public/          — Media upload (video, ảnh user)
│   └── media/
│
├── 📂 _docs/           — Tài liệu kế hoạch, ghi chú
│   ├── NAP_GAME_PLAN.md
│   ├── MEDIA_REQUIREMENTS.md
│   └── WORKSPACE_NOTES.md
│
├── 📂 _db/             — SQL scripts Supabase
│   ├── supabase_setup.sql
│   └── *.sql
│
└── 📂 _backup/         — Backup database (không push GitHub)
    ├── backup_supabase.ps1
    └── BACKUP_*.json
```

---

## 2. QUY TẮC FILE

### ✅ Được phép
- Tạo file mới đúng vị trí theo cấu trúc trên
- Tạo file `.css` mới cho trang mới trong `assets/css/`
- Tạo file `.js` mới cho tính năng mới trong `assets/js/`
- Tạo subfolder trong `assets/images/` cho từng loại ảnh

### ❌ KHÔNG được phép
- Đặt file `.sql` ngoài thư mục `_db/`
- Đặt file `.md` ngoài thư mục `_docs/`
- Đặt backup/dump files ngoài thư mục `_backup/`
- Tạo file test/debug (`check.js`, `out.json`, `*_dump.json`) ở root
- Để file tạm bợ ở root project sau khi xong việc
- Push file `BACKUP_*.json` lên GitHub

---

## 3. QUY TẮC CODE

### HTML
- Mỗi trang HTML có comment phân vùng rõ ràng: `<!-- SECTION NAME -->`
- Inline style chỉ dùng khi cần thiết, ưu tiên class CSS
- Luôn có `<title>` và `<meta description>` đúng nội dung trang

### CSS
- Khai báo CSS variables ở `:root` hoặc trong `style.css`
- Nhóm CSS theo component: `/* HEADER */`, `/* HERO */`, `/* CARDS */`
- Mobile breakpoints luôn ở cuối file (sau desktop styles)
- Prefix vars của landing page: `--lp-*`
- Prefix vars của napgame page: `--ng-*`

### JavaScript
- Mỗi hàm có comment mô tả ngắn gọn
- `console.log` debug phải xóa trước khi commit
- Supabase credentials chỉ khai báo 1 lần ở đầu file chính
- Không duplicate code — nếu dùng lại 2+ lần thì tách thành hàm

---

## 4. QUY TẮC GIT COMMIT

Format commit message:
```
<type>: <mô tả ngắn gọn bằng tiếng Anh>

Types:
  feat:    Tính năng mới
  fix:     Sửa bug
  style:   Thay đổi UI/CSS (không ảnh hưởng logic)
  refactor: Tái cấu trúc code
  docs:    Cập nhật tài liệu
  chore:   Dọn dẹp, cấu hình
```

Ví dụ tốt:
- `feat: add napgame order form with Supabase integration`
- `fix: mobile menu not closing on overlay click`
- `style: improve game card hover animation`
- `docs: update NAP_GAME_PLAN with backup info`

---

## 5. QUY TẮC BACKUP

- **Trước mỗi feature lớn:** chạy `_backup/backup_supabase.ps1`
- **Backup file không được push** lên GitHub (đã gitignore)
- **Note vào `_docs/NAP_GAME_PLAN.md`** mỗi khi tạo backup mới
- Nếu user muốn rollback → restore từ file `BACKUP_*.json` mới nhất

---

## 6. QUY TẮC STYLE/UI

- **Luôn dùng font stack của brand:** `"Baloo 2"`, `"Nunito"`, `"Be Vietnam Pro"`
- **Màu sắc phải từ CSS vars:** không hardcode hex tùy tiện
- **Animation phải nhẹ nhàng** (duration 200-500ms, easing `ease` hoặc `cubic-bezier`)
- **Hover effect luôn có** cho mọi element tương tác
- **Mobile responsive bắt buộc** — test breakpoint 768px trước khi commit

---

## 7. QUY TẮC CSKH & TRẢI NGHIỆM NGƯỜI DÙNG

- Luôn có đường dẫn nhanh đến Zalo CSKH
- Form phải có validation và loading state
- Success/error state phải rõ ràng với animation
- Không để trang blank — luôn có skeleton/placeholder khi load

---

*Quy tắc này được lưu tại `_docs/PROJECT_RULES.md` và `.agents/rules/GEMINI.md`*  
*AI đọc file này ở đầu mỗi session và tuân thủ nghiêm túc.*
