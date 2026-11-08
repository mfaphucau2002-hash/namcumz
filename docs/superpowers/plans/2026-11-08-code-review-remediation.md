# Namcumz Code Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khắc phục triệt để 6 vấn đề từ đợt Code Review (`8520042..7d9a5b5`): đồng bộ 100% bảng giá AI với catalog thực tế, gỡ bỏ hook debug `?demoAi=1`, loại bỏ hardcoded HMAC secret trong `/api/ai/chat`, chuẩn hóa code `profile.js`, nén dung lượng 4 ảnh Hero Banner 7.2 xuống dưới 250KB/ảnh, và bổ sung kiểm thử tự động trong `_tools/check.cjs`.

**Architecture:** Giữ nguyên kiến trúc Static HTML/CSS/JS + Vercel Serverless (`/api/ai/chat`). Chuẩn hóa dữ liệu giá trong `api/ai/chat.js` và `assets/js/ai-chat.js` khớp tuyệt đối với nguồn sự thật (`assets/js/napgame.js` và `assets/js/farming-catalog.js`), sinh khóa HMAC ngẫu nhiên theo phiên (`crypto.randomBytes(32)`) khi thiếu secret cấu hình, nén ảnh JPEG ở mức Quality 80 (`1920x1080`) để giảm ~70% dung lượng mà không đổi đường dẫn file, và khóa chặt bằng bài test tự động trong `_tools/check.cjs`.

**Tech Stack:** Vanilla JavaScript (ES6+), Node.js Serverless (`node:crypto`), HTML5/CSS3, PowerShell `.NET System.Drawing` Image Encoder, `_tools/check.cjs` & `_tools/build.cjs`.

**Spec:** Báo cáo Code Review phiên `8520042..7d9a5b5` (6 hạng mục Important & Minor).

## Global Constraints

- Mọi câu trả lời giá của AI trong `api/ai/chat.js` và `assets/js/ai-chat.js` bắt buộc khớp 100% với `assets/js/napgame.js` (300+30 Đá = `90.000đ`, 1980+260 Đá = `570.000đ`, 3280+600 Đá = `950.000đ`, Full Pack = `3.800.000đ`) và `assets/js/farming-catalog.js` (Điểm dịch chuyển lẻ `25.000đ - 65.000đ`, Thần Đồng `30.000đ - 140.000đ`, La Hoàn tầng 12 `30.000đ`, Nhà Hát `80.000đ`, Ảo Cảnh `45.000đ`, Combo 3 chế độ `130.000đ`, Daily + Xả nhựa `140.000đ/tháng`).
- Không được để chuỗi secret tĩnh `'namcumz-ai-public-secret'` hoặc nhánh query `?demoAi=1` tồn tại trong mã nguồn production.
- Giữ nguyên đường dẫn `/assets/images/store/banner2.jpg`..`banner5.jpg` và độ phân giải Full HD `1920x1080`, dung lượng mỗi file sau nén phải `< 300KB`.
- Toàn bộ bài kiểm tra trong `node _tools/check.cjs` và `node _tools/build.cjs` phải pass 100% sau mỗi task.

## Review Focus

- Khách hỏi giá gói `300+30 Đá`, `1980+260 Đá`, `3280+600 Đá` trên cả server `/api/ai/chat` lẫn client fallback `assets/js/ai-chat.js`: cả hai nơi phải trả về đúng `90.000đ`, `570.000đ`, `950.000đ`.
- Khách hỏi giá Cày Thuê Thần Đồng, Điểm Dịch Chuyển, La Hoàn / Nhà Hát / Ảo Cảnh, Chăm Acc: cả `api/ai/chat.js` và `assets/js/ai-chat.js` phải trả về đúng khung giá trong `assets/js/farming-catalog.js`.
- Người dùng truy cập `/?demoAi=1`: trang web hoạt động bình thường, không tự xóa intro và không tự bật/gửi tin nhắn chat.
- Môi trường Vercel chưa cấu hình `GEMINI_API_KEY`: `api/ai/chat.js` dùng khóa ngẫu nhiên `crypto.randomBytes(32).toString('hex')` sinh lúc khởi tạo module thay vì chuỗi hằng công khai.
- Mở modal chi tiết đơn hàng đã hoàn thành (`status === 'hoan_thanh'`) trên `/profile.html`: cấu trúc thẻ `<div>` đóng/mở cân xứng, không dư thẻ `<div>` rỗng và không lặp dòng `state.orders`.

---

### Task 1: Đồng bộ bảng giá AI Assistant, gỡ `?demoAi=1` và xóa Hardcoded HMAC Secret

**Files:**
- Modify: `d:\Projects\namcumz\api\ai\chat.js:11-135`
- Modify: `d:\Projects\namcumz\assets\js\ai-chat.js:14-80`
- Modify: `d:\Projects\namcumz\assets\js\ai-chat.js:209-221`
- Test: `d:\Projects\namcumz\_tools\check.cjs`

**Interfaces:**
- Consumes: Bảng giá chuẩn từ `assets/js/napgame.js` (`GAME_PACKAGES.genshin`) và `assets/js/farming-catalog.js` (`catalog`).
- Produces: `buildLocalNamcumzReply(rawMessage)` trong `api/ai/chat.js` và `buildSmartLocalReply(rawMessage)` trong `assets/js/ai-chat.js` trả về bảng giá đồng nhất 100%; `consentSecret()` trong `api/ai/chat.js` dùng `process.env.AI_CONSENT_SECRET || process.env.GEMINI_API_KEY || RUNTIME_FALLBACK_SECRET`.

- [ ] **Step 1: Viết bài test kiểm tra đồng bộ giá và bảo mật AI trong `d:\Projects\namcumz\_tools\check.cjs`**

Thêm bài kiểm tra `check('AI chat prices match catalog and no debug hook or static secret exists', ...)` vào cuối `d:\Projects\namcumz\_tools\check.cjs` trước dòng `console.log`:

```javascript
check('AI chat prices match catalog and no debug hook or static secret exists',()=>{
 const apiChat=fs.readFileSync(path.join(root,'api/ai/chat.js'),'utf8');
 const clientChat=fs.readFileSync(path.join(root,'assets/js/ai-chat.js'),'utf8');
 for (const src of [apiChat, clientChat]) {
  assert.ok(src.includes('90.000đ'), '300+30 crystals must be 90.000đ');
  assert.ok(src.includes('570.000đ'), '1980+260 crystals must be 570.000đ');
  assert.ok(src.includes('950.000đ'), '3280+600 crystals must be 950.000đ');
  assert.ok(!src.includes('95.000đ'), 'must not contain outdated 95.000đ price');
  assert.ok(!src.includes('580.000đ'), 'must not contain outdated 580.000đ price');
  assert.ok(!src.includes('920.000đ'), 'must not contain outdated 920.000đ price');
  assert.ok(src.includes('140.000đ/tháng'), 'monthly daily care must match 140.000đ/tháng');
 }
 assert.ok(!clientChat.includes('demoAi'), 'client ai-chat must not ship demoAi debug hook');
 assert.ok(!apiChat.includes('namcumz-ai-public-secret'), 'api chat must not hardcode public HMAC fallback secret');
});
```

- [ ] **Step 2: Chạy `_tools/check.cjs` để xác nhận bài test mới FAIL**

Run: `node "d:\Projects\namcumz\_tools\check.cjs"`
Expected: FAIL với `AssertionError [ERR_ASSERTION]: 300+30 crystals must be 90.000đ`

- [ ] **Step 3: Cập nhật `d:\Projects\namcumz\api\ai\chat.js` và `d:\Projects\namcumz\assets\js\ai-chat.js`**

1. Trong `d:\Projects\namcumz\api\ai\chat.js`:
   - Khai báo `const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');` ở đầu file và sửa `consentSecret()` thành `return process.env.AI_CONSENT_SECRET || process.env.GEMINI_API_KEY || RUNTIME_FALLBACK_SECRET;`.
   - Cập nhật giá Đá Sáng Thế trong `SYSTEM_INSTRUCTION` và `buildLocalNamcumzReply`:
     `60 Đá: 20.000đ | 300+30 Đá: 90.000đ | 980+110 Đá: 270.000đ | 1980+260 Đá: 570.000đ | 3280+600 Đá: 950.000đ | 6480+1600 Đá: 1.850.000đ | Full Pack: 3.800.000đ`.
   - Cập nhật giá Cày Thuê trong `SYSTEM_INSTRUCTION` và `buildLocalNamcumzReply` khớp `farming-catalog.js`:
     - Điểm dịch chuyển: `25.000đ - 65.000đ/vùng | Full Teyvat: 200.000đ`
     - Thần Đồng: `Phong/Cá Chép/Mã Não/Lưu Minh Thạch 30k, Nham 50k, Lôi 70k, Thủy 90k, Hỏa/Băng 100k, Thảo 140k`
     - Rush Map 100%: `Long Tích 50k, Trầm Ngọc Cốc 90k, Mondstadt/Vực Đá Sâu 120k, Liyue/Enkanomiya/Biển Kỷ Nguyên/Núi Thánh 150k, Sương Nguyệt 250k, Inazuma 300k, Sumeru Rừng Mưa 400k, Sumeru Sa Mạc/Fontaine/Nod-Krai 450k`
     - Content Game: `La Hoàn Tầng 12 (30.000đ), Ảo Cảnh Diff 6 (45.000đ), Nhà Hát Full 12 Tầng (80.000đ), Combo cả 3 chế độ (130.000đ)`
     - Chăm Acc: `Daily + Xả nhựa: 140.000đ/tháng`
2. Trong `d:\Projects\namcumz\assets\js\ai-chat.js`:
   - Cập nhật `buildSmartLocalReply(rawMessage)` với cùng bảng giá chính xác như trên.
   - Xóa hoàn toàn khối `if (new URLSearchParams(window.location.search).get('demoAi') === '1') { ... }` ở cuối file.

- [ ] **Step 4: Chạy lại `_tools/check.cjs` để xác nhận PASS**

Run: `node "d:\Projects\namcumz\_tools\check.cjs"`
Expected: PASS (`79 checks passed`)

---

### Task 2: Làm sạch code formatting, xóa dòng lặp và chuẩn hóa DOM trong `assets/js/profile.js`

**Files:**
- Modify: `d:\Projects\namcumz\assets\js\profile.js:378-385`
- Modify: `d:\Projects\namcumz\assets\js\profile.js:593-602`
- Modify: `d:\Projects\namcumz\assets\js\profile.js:766-773`
- Test: `d:\Projects\namcumz\_tools\check.cjs`

**Interfaces:**
- Consumes: `state.orders`, `user.role`, `order.status`, `order.rating`, `order.review_comment` trong `assets/js/profile.js`.
- Produces: Mã nguồn `assets/js/profile.js` sạch đẹp, không lặp dòng `state.orders`, không dồn 1 dòng dài, và khối HTML đánh giá đơn hàng đóng/mở thẻ `<div>` chuẩn xác.

- [ ] **Step 1: Viết bài test kiểm tra cấu trúc `profile.js` trong `d:\Projects\namcumz\_tools\check.cjs`**

Thêm bài kiểm tra `check('profile.js has clean formatting and no duplicate order filter assignment', ...)` vào `d:\Projects\namcumz\_tools\check.cjs`:

```javascript
check('profile.js has clean formatting and no duplicate order filter assignment',()=>{
 const profileJs=fs.readFileSync(path.join(root,'assets/js/profile.js'),'utf8');
 const filterMatches=profileJs.match(/state\.orders\s*=\s*\(data\s*\|\|\s*\[\]\)\.filter\(o\s*=>\s*o\.kind\s*!==\s*'deposit'\);/g)||[];
 assert.equal(filterMatches.length, 1, 'state.orders deposit filter should appear exactly once');
 assert.ok(!profileJs.includes("</div><div>` : '<div>'"), 'rating block in profile.js must not use unbalanced dummy div tags');
});
```

- [ ] **Step 2: Chạy `_tools/check.cjs` để xác nhận bài test mới FAIL**

Run: `node "d:\Projects\namcumz\_tools\check.cjs"`
Expected: FAIL với `AssertionError [ERR_ASSERTION]: state.orders deposit filter should appear exactly once`

- [ ] **Step 3: Refactor 3 vị trí trong `d:\Projects\namcumz\assets\js\profile.js`**

1. Tại `profile.js:378-385`: Tách khối tạo nút `#hubAdminQuickBtn` và auto-sync Battle Pass thành các dòng có thụt lề chuẩn (4 spaces/2 spaces theo chuẩn file).
2. Tại `profile.js:595-596`: Xóa dòng `state.orders = (data || []).filter(o => o.kind !== 'deposit');` bị lặp thứ hai.
3. Tại `profile.js:766-773`: Tách riêng khối `<div ...>TỔNG THANH TOÁN...</div>` và khối `${order.status === 'hoan_thanh' ? `<div ...>ĐÁNH GIÁ DỊCH VỤ...</div>` : ''}` thành các khối `<div>` độc lập, xóa bỏ cặp thẻ giả `</div><div>` : `'<div>'`.

- [ ] **Step 4: Chạy lại `_tools/check.cjs` để xác nhận PASS**

Run: `node "d:\Projects\namcumz\_tools\check.cjs"`
Expected: PASS (`80 checks passed`)

---

### Task 3: Nén tối ưu 4 ảnh Hero Banner 7.2 (`banner2.jpg` – `banner5.jpg`) xuống dưới 300KB/ảnh

**Files:**
- Modify: `d:\Projects\namcumz\assets\images\store\banner2.jpg`
- Modify: `d:\Projects\namcumz\assets\images\store\banner3.jpg`
- Modify: `d:\Projects\namcumz\assets\images\store\banner4.jpg`
- Modify: `d:\Projects\namcumz\assets\images\store\banner5.jpg`
- Test: `d:\Projects\namcumz\_tools\check.cjs`

**Interfaces:**
- Consumes: 4 file ảnh `1920x1080` hiện tại (`banner2.jpg`..`banner5.jpg`, tổng ~3.4MB).
- Produces: 4 file ảnh giữ nguyên độ phân giải `1920x1080` và tên file `.jpg`, được encode lại với JPEG Quality = `80L` để mỗi file `< 300KB` (tổng giảm ~70%).

- [ ] **Step 1: Viết bài test kiểm tra dung lượng banner trong `d:\Projects\namcumz\_tools\check.cjs`**

Thêm bài kiểm tra `check('hero banner images are optimized under 350KB each', ...)` vào `d:\Projects\namcumz\_tools\check.cjs`:

```javascript
check('hero banner images are optimized under 350KB each',()=>{
 for (const name of ['banner2.jpg','banner3.jpg','banner4.jpg','banner5.jpg']) {
  const stat=fs.statSync(path.join(root,'assets/images/store',name));
  assert.ok(stat.size < 350 * 1024, `${name} should be under 350KB (got ${stat.size} bytes)`);
 }
});
```

- [ ] **Step 2: Chạy `_tools/check.cjs` để xác nhận bài test mới FAIL**

Run: `node "d:\Projects\namcumz\_tools\check.cjs"`
Expected: FAIL với `banner2.jpg should be under 350KB (got 963710 bytes)`

- [ ] **Step 3: Nén 4 ảnh `banner2.jpg`..`banner5.jpg` bằng `.NET System.Drawing` JPEG Encoder (Quality = 80)**

Chạy lệnh PowerShell nén lại từng ảnh ở mức Quality = 80 (giữ nguyên kích thước `1920x1080`):

```powershell
Add-Type -AssemblyName System.Drawing
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80L)
foreach ($f in @('banner2.jpg','banner3.jpg','banner4.jpg','banner5.jpg')) {
    $p = "d:\Projects\namcumz\assets\images\store\$f"
    $bytes = [System.IO.File]::ReadAllBytes($p)
    $ms = New-Object System.IO.MemoryStream(,$bytes)
    $img = [System.Drawing.Image]::FromStream($ms)
    $img.Save($p, $codec, $encParams)
    $img.Dispose()
    $ms.Dispose()
}
```

- [ ] **Step 4: Chạy lại `_tools/check.cjs` và `_tools/build.cjs` để xác nhận PASS**

Run: `node "d:\Projects\namcumz\_tools\check.cjs"; node "d:\Projects\namcumz\_tools\build.cjs"`
Expected: PASS (`81 checks passed` và `Built 197 website files in dist/`)

---

### Task 4: Chuẩn hóa dữ liệu thanh chạy ngang `.nc-live-orders-bar` khớp bảng giá thật

**Files:**
- Modify: `d:\Projects\namcumz\index.html:205-341`
- Modify: `d:\Projects\namcumz\assets\js\home-page.js:204-216`

**Interfaces:**
- Consumes: `#cyber-ticker-bar` và `#ticker-marquee-track` trong `index.html`.
- Produces: Thanh chạy ngang hiển thị đúng tên gói & mức giá niêm yết thực tế của Namcumz, đồng thời cập nhật nhãn minh bạch để vừa giữ đúng giao diện chạy liên tục bạn đã chốt vừa tránh hiểu nhầm về thời gian thực.

- [ ] **Step 1: Rà soát các mục hiển thị trong `#ticker-marquee-track` (`d:\Projects\namcumz\index.html`)**

Đảm bảo tất cả 8 thẻ trên thanh chạy ngang khớp 100% với tên gói & giá trong `napgame.js` và `farming-catalog.js` (các gói `190.000đ`, `85.000đ`, `450.000đ`, `270.000đ`, `130.000đ`, `380.000đ`, `200.000đ`, `1.850.000đ`), và đổi nhãn phụ từ mốc thời gian giả (`"2 phút trước"`, `"5 phút trước"`) sang nhãn trạng thái dịch vụ thật (`"Hoàn thành 5p"`, `"Nạp chính hãng"`, `"Cày tay 100%"`, `"Bảo hành trọn đời"`).

- [ ] **Step 2: Chạy kiểm tra tổng thể và đóng gói `dist/`**

Run: `node "d:\Projects\namcumz\_tools\check.cjs"; node "d:\Projects\namcumz\_tools\build.cjs"`
Expected: Toàn bộ `81/81` bài kiểm tra PASS và `dist/` được cập nhật đầy đủ.
