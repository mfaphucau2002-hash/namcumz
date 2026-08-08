/**
 * NẠP GAME LOGIC - NAMCUMZ (V3)
 * 2-page: Catalog (napgame.html) + Detail (napgame-detail.html)
 */

// ==========================================
// 1. GAME DATA
// ==========================================
const GAMES_CATALOG = {
    featured: [
        { id: 'genshin-login', name: 'Genshin Impact', image: 'assets/images/games/genshin.webp', badge: 'HOT', badgeCls: 'badge-hot', filter: 'login' },
        { id: 'hsr-login',     name: 'Honkai Star Rail', image: 'assets/images/games/hsr.webp', badge: 'HOT', badgeCls: 'badge-hot', filter: 'login' },
        { id: 'zzz-login',     name: 'Zenless Zone Zero', image: 'assets/images/games/zzz.webp', badge: 'NEW', badgeCls: 'badge-new', filter: 'login' },
        { id: 'wuwa-login',    name: 'Wuthering Waves', image: 'assets/images/games/wuwa.webp', badge: '', badgeCls: '', filter: 'login' }
    ],
    uid: [
        { id: 'hsr',       name: 'Honkai Star Rail',      sub: 'Nạp qua UID',  discount: '-20%', icon: 'assets/images/games/hsr_icon.webp' },
        { id: 'wuwa',      name: 'Wuthering Waves',       sub: 'Nạp qua UID',  discount: '-15%', icon: 'assets/images/games/wuwa_icon.webp' },
        { id: 'zzz',       name: 'Zenless Zone Zero',     sub: 'Nạp qua UID',  discount: '-20%', icon: 'assets/images/games/zzz_icon.webp' },
        { id: 'genshin',   name: 'Genshin Impact',        sub: 'Nạp qua UID',  discount: '-10%', icon: 'assets/images/games/genshin_icon.webp' },
        { id: 'hi3',       name: 'Honkai Impact 3',       sub: 'Nạp qua UID',  discount: '-20%', icon: 'assets/images/games/hi3_icon.webp' },
        { id: 'pgr',       name: 'Punishing Gray Raven',  sub: 'Nạp qua UID',  discount: '-10%', icon: 'assets/images/games/pgr_icon.webp' },
        { id: 'ba',        name: 'Blue Archive',          sub: 'Nạp qua UID',  discount: '-15%', icon: 'assets/images/games/ba_icon.webp' },
        { id: 'id-v',      name: 'Identity V',            sub: 'Nạp qua UID',  discount: '-10%', icon: 'assets/images/games/idv_icon.webp' },
        { id: 'honor',     name: 'Honor of Kings',        sub: 'Nạp qua UID',  discount: '-15%', icon: 'assets/images/games/honor_icon.webp' },
        { id: 'lad',       name: 'Love & Deepspace',      sub: 'Nạp qua UID',  discount: '-10%', icon: 'assets/images/games/lad_icon.webp' }
    ],
    login: [
        { id: 'genshin-login', name: 'Genshin Impact (LOGIN)', sub: 'Nạp Login, rẻ hơn UID', discount: '-15%', icon: 'assets/images/games/genshin_icon.webp' },
        { id: 'hsr-login',     name: 'Honkai Star Rail (LOGIN)', sub: 'Nạp Login', discount: '-30%', icon: 'assets/images/games/hsr_icon.webp' },
        { id: 'wuwa-login',    name: 'Wuthering Waves (LOGIN)', sub: 'Nạp Login', discount: '-15%', icon: 'assets/images/games/wuwa_icon.webp' },
        { id: 'zzz-login',     name: 'Zenless Zone Zero (LOGIN)', sub: 'Nạp Login', discount: '-20%', icon: 'assets/images/games/zzz_icon.webp' },
        { id: 'valo',          name: 'Valorant', sub: 'Nạp Login', discount: '-10%', icon: 'assets/images/games/valorant_icon.webp' },
        { id: 'lol',           name: 'League of Legends', sub: 'Nạp Login', discount: '-10%', icon: 'assets/images/games/lol_icon.webp' },
        { id: 'mlbb',          name: 'Mobile Legends', sub: 'Nạp Login', discount: '-15%', icon: 'assets/images/games/mlbb_icon.webp' },
        { id: 'pubg',          name: 'PUBG Mobile', sub: 'Nạp Login', discount: '-10%', icon: 'assets/images/games/pubg_icon.webp' },
        { id: 'gfl2',          name: 'Girls Frontline 2', sub: 'Nạp Login', discount: '-20%', icon: 'assets/images/games/gfl2_icon.webp' },
        { id: 'arknights',     name: 'Arknights (LOGIN)', sub: 'Nạp Login', discount: '-10%', icon: 'assets/images/games/arknights_icon.webp' }
    ]
};

const GAME_INFO = {
    'genshin':       { name: 'Genshin Impact (Nạp UID)',              icon: 'assets/images/games/genshin_icon.webp',  rating: '5.0', sold: '9.777 đã bán', type: 'uid',   sold_n: 9777 },
    'genshin-login': { name: 'Genshin Impact (Login – rẻ hơn UID 15%)', icon: 'assets/images/games/genshin_icon.webp', rating: '5.0', sold: '9.777 đã bán', type: 'login', sold_n: 9777 },
    'hsr':           { name: 'Honkai Star Rail (Nạp UID)',            icon: 'assets/images/games/hsr_icon.webp',      rating: '4.9', sold: '5.412 đã bán', type: 'uid',   sold_n: 5412 },
    'hsr-login':     { name: 'Honkai Star Rail (Login)',              icon: 'assets/images/games/hsr_icon.webp',      rating: '4.9', sold: '5.412 đã bán', type: 'login', sold_n: 5412 },
    'zzz':           { name: 'Zenless Zone Zero (Nạp UID)',           icon: 'assets/images/games/zzz_icon.webp',      rating: '5.0', sold: '3.200 đã bán', type: 'uid',   sold_n: 3200 },
    'zzz-login':     { name: 'Zenless Zone Zero (Login)',             icon: 'assets/images/games/zzz_icon.webp',      rating: '5.0', sold: '3.200 đã bán', type: 'login', sold_n: 3200 },
    'wuwa':          { name: 'Wuthering Waves (Nạp UID)',             icon: 'assets/images/games/wuwa_icon.webp',     rating: '5.0', sold: '4.100 đã bán', type: 'uid',   sold_n: 4100 },
    'wuwa-login':    { name: 'Wuthering Waves (Login)',               icon: 'assets/images/games/wuwa_icon.webp',     rating: '5.0', sold: '4.100 đã bán', type: 'login', sold_n: 4100 },
    'default':       { name: 'Game Top-up',                           icon: 'assets/images/logo.jpg',                 rating: '5.0', sold: '100+ đã bán',  type: 'uid',   sold_n: 100 }
};

const GAME_PACKAGES = {
    'genshin': [
        { id: 'g-60',     name: '60 Đá Sáng Thế',           price: 17100,   img: 'assets/images/games/crystals_60.webp',   tag: '' },
        { id: 'g-300',    name: '300 + 30 Đá Sáng Thế',     price: 80750,   img: 'assets/images/games/crystals_300.webp',  tag: '' },
        { id: 'g-980',    name: '980 + 110 Đá Sáng Thế',    price: 242250,  img: 'assets/images/games/crystals_980.webp',  tag: '' },
        { id: 'g-1980',   name: '1980 + 260 Đá Sáng Thế',   price: 484500,  img: 'assets/images/games/crystals_1980.webp', tag: '' },
        { id: 'g-3280',   name: '3280 + 600 Đá Sáng Thế',   price: 807500,  img: 'assets/images/games/crystals_3280.webp', tag: '' },
        { id: 'g-6480',   name: '6480 + 1600 Đá Sáng Thế',  price: 1615000, img: 'assets/images/games/crystals_6480.webp', tag: '' },
        { id: 'g-welkin', name: 'Không Nguyệt Chúc Phúc',   price: 76500,   img: 'assets/images/games/welkin.webp',        tag: 'monthly' },
        { id: 'g-bp',     name: 'Battle Pass Gnostic Hymn',  price: 180000,  img: 'assets/images/games/genshin_bp.webp',    tag: 'battlepass' }
    ],
    'hsr': [
        { id: 'hsr-60',   name: '60 Mộng Cảnh',              price: 17000,   img: 'assets/images/games/hsr_60.webp',   tag: '' },
        { id: 'hsr-300',  name: '300 + 30 Mộng Cảnh',        price: 75000,   img: 'assets/images/games/hsr_300.webp',  tag: '' },
        { id: 'hsr-980',  name: '980 + 110 Mộng Cảnh',       price: 218000,  img: 'assets/images/games/hsr_980.webp',  tag: '' },
        { id: 'hsr-1980', name: '1980 + 260 Mộng Cảnh',      price: 436000,  img: 'assets/images/games/hsr_1980.webp', tag: '' },
        { id: 'hsr-3280', name: '3280 + 600 Mộng Cảnh',      price: 726000,  img: 'assets/images/games/hsr_3280.webp', tag: '' },
        { id: 'hsr-pass', name: 'Thẻ Tháng Express Supply',   price: 75000,   img: 'assets/images/games/hsr_pass.webp', tag: 'monthly' }
    ],
    'default': [
        { id: 'd-1', name: 'Gói Nạp Cơ Bản',  price: 20000,  img: 'assets/images/logo.jpg', tag: '' },
        { id: 'd-2', name: 'Gói Nạp Vừa',     price: 50000,  img: 'assets/images/logo.jpg', tag: '' },
        { id: 'd-3', name: 'Gói Nạp Cao Cấp', price: 100000, img: 'assets/images/logo.jpg', tag: '' }
    ]
};

const FAKE_REVIEWS = [
    { name: 'Li**Nguyên',  stars: 5, text: 'Nạp nhanh lắm, tầm 3 phút là có rồi. Giá rẻ hơn nạp trực tiếp, sẽ ủng hộ tiếp.', date: 'Đây 2 ngày' },
    { name: 'Du**Đạt',     stars: 5, text: 'Admin nhiệt tình, bill rõ ràng. Đã nạp 3 lần rồi lần nào cũng ổn.', date: 'Đây 5 ngày' },
    { name: 'Nh**Huyền',   stars: 5, text: 'Uy tín, giao dịch an toàn. Mình lo lúc đầu nhưng kết quả rất tốt!', date: '1 tuần trước' }
];

const FAKE_ORDERS = [
    { user: 'Hi*****an', game: 'Genshin Impact', pkg: '980 Đá Sáng Thế', price: '242.000đ', time: '2 phút trước' },
    { user: 'T*****ng',  game: 'Honkai Star Rail', pkg: '300+30 Mộng Cảnh', price: '75.000đ', time: '8 phút trước' },
    { user: 'Ng*****êu', game: 'Wuthering Waves', pkg: '60 Astrite', price: '17.000đ', time: '15 phút trước' },
    { user: 'Me*****Me', game: 'Valorant', pkg: '1050 VP', price: '200.000đ', time: '22 phút trước' },
    { user: 'Da*****rk', game: 'Mobile Legends', pkg: '500 Kim Cương', price: '115.000đ', time: '1 giờ trước' }
];

// ==========================================
// 2. TICKER
// ==========================================
function initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;
    const html = FAKE_ORDERS.map(o => `
        <span class="ticker-item">
            <span class="ticker-avatar">${o.user[0]}</span>
            <b>${o.user}</b> vừa nạp <b>${o.game}</b> · ${o.pkg}
            <span class="ticker-price">${o.price}</span>
            <span class="ticker-time">${o.time}</span>
        </span>
    `).join('<span class="ticker-sep">•</span>');
    track.innerHTML = html + '<span class="ticker-sep">•</span>' + html;
}

// ==========================================
// 3. SLIDER (Catalog Page)
// ==========================================
let slideIndex = 0;
let slideInterval;

function goSlide(index) {
    const track = document.getElementById('sliderTrack');
    const dots  = document.querySelectorAll('.ng-dot');
    if (!track) return;
    slideIndex = index;
    const total = track.children.length;
    slideIndex = ((slideIndex % total) + total) % total;
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === slideIndex));
}

function slideTo(dir) {
    goSlide(slideIndex + dir);
    resetSlideTimer();
}

function startSlider() {
    const track = document.getElementById('sliderTrack');
    if (!track) return;
    resetSlideTimer();
}

function resetSlideTimer() {
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(() => goSlide(slideIndex + 1), 5000);
}

// ==========================================
// 4. SOCIAL PROOF POPUP
// ==========================================
const PROOF_DATA = [
    { u: 'Hi*****an', g: 'Genshin Impact', p: '242.000đ' },
    { u: 'Ti*****ng', g: 'Honkai Star Rail', p: '75.000đ' },
    { u: 'Mi*****i',  g: 'Wuthering Waves', p: '420.000đ' },
    { u: 'Da*****rk', g: 'Zenless Zone Zero', p: '180.000đ' }
];
let proofIdx = 0;

function showSocialProof() {
    const container = document.getElementById('socialProofContainer');
    if (!container) return;

    const d = PROOF_DATA[proofIdx % PROOF_DATA.length];
    proofIdx++;

    const popup = document.createElement('div');
    popup.className = 'ng-social-popup';
    popup.innerHTML = `
        <button class="ng-social-popup-close" onclick="this.parentElement.remove()">✕</button>
        <div class="ng-social-popup-avatar">${d.u[0]}</div>
        <div class="ng-social-popup-text">
            <strong>${d.u}</strong> vừa mua<br>
            <span>${d.g}</span> với giá <span class="ng-social-popup-price">${d.p}</span>
        </div>
    `;
    container.innerHTML = '';
    container.appendChild(popup);

    setTimeout(() => {
        popup.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => popup.remove(), 500);
    }, 5000);
}

// ==========================================
// 5. CATALOG RENDERING + FILTER
// ==========================================
function initCatalogPage() {
    startSlider();

    renderPortrait(GAMES_CATALOG.featured);
    renderHorizontal(GAMES_CATALOG.uid, 'gridUid', 'uid');
    renderHorizontal(GAMES_CATALOG.login, 'gridLogin', 'login');

    // Tab filters
    document.querySelectorAll('.ng-cat-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ng-cat-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            const uidSection   = document.getElementById('sectionUid');
            const loginSection = document.getElementById('sectionLogin');
            const featSection  = document.getElementById('sectionFeatured');
            if (f === 'all') {
                [uidSection, loginSection, featSection].forEach(s => s && (s.style.display = ''));
            } else if (f === 'uid') {
                uidSection && (uidSection.style.display = '');
                loginSection && (loginSection.style.display = 'none');
                featSection && (featSection.style.display = 'none');
            } else if (f === 'login') {
                uidSection && (uidSection.style.display = 'none');
                loginSection && (loginSection.style.display = '');
                featSection && (featSection.style.display = 'none');
            } else if (f === 'hot') {
                renderPortrait(GAMES_CATALOG.featured.filter(g => g.badge === 'HOT'));
                [uidSection, loginSection].forEach(s => s && (s.style.display = 'none'));
                featSection && (featSection.style.display = '');
            }
        });
    });

    // Search
    const searchInput = document.getElementById('gameSearch');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.ng-card-hz, .ng-card-portrait').forEach(card => {
                const name = (card.querySelector('.ng-card-hz-title, .ng-card-portrait-title') || {}).innerText || '';
                card.style.display = name.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    // Social proof every 8 seconds
    setTimeout(showSocialProof, 3000);
    setInterval(showSocialProof, 8000);
}

function renderPortrait(data) {
    const grid = document.getElementById('gridFeatured');
    if (!grid) return;
    grid.innerHTML = data.map(g => `
        <a href="napgame-detail.html?game=${g.id}" class="ng-card-portrait">
            <img src="${g.image}" alt="${g.name}" onerror="this.src='assets/images/logo.jpg'">
            <div class="ng-card-portrait-info">
                ${g.badge ? `<div class="ng-card-portrait-badge ${g.badgeCls}">${g.badge}</div>` : ''}
                <div class="ng-card-portrait-title">${g.name}</div>
                <div class="ng-card-portrait-btn">Nạp Ngay</div>
            </div>
        </a>
    `).join('');
}

function renderHorizontal(data, containerId, type) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    const badgeCls = type === 'login' ? 'badge-login' : 'badge-uid';
    const badgeTxt = type === 'login' ? 'Login'       : 'UID';
    grid.innerHTML = data.map(g => `
        <a href="napgame-detail.html?game=${g.id}" class="ng-card-hz">
            <img src="${g.icon}" class="ng-card-hz-icon" onerror="this.src='assets/images/logo.jpg'">
            <div class="ng-card-hz-info">
                <div class="ng-card-hz-title">${g.name}</div>
                <div class="ng-card-hz-sub">${g.sub}</div>
                <div class="ng-card-hz-badges">
                    <span class="ng-card-hz-badge ${badgeCls}">${badgeTxt}</span>
                </div>
            </div>
            <div class="ng-card-hz-discount">${g.discount}</div>
        </a>
    `).join('');
}

// ==========================================
// 6. DETAIL PAGE LOGIC
// ==========================================
let currentSelectedPackage = null;
let currentGameId = 'default';
let activeTabFilter = 'all';

function initDetailPage() {
    const params = new URLSearchParams(window.location.search);
    currentGameId = params.get('game') || 'default';

    // Resolve game info (fallback to id without -login suffix for packages)
    const gameInfo = GAME_INFO[currentGameId] || GAME_INFO['default'];
    const pkgKey   = currentGameId.replace('-login', '');
    const packages = GAME_PACKAGES[pkgKey] || GAME_PACKAGES['default'];

    // Set page title and breadcrumb
    document.title = `${gameInfo.name} - Nạp Game | NAMCUMZ`;
    const bcEl = document.getElementById('breadcrumbGame');
    if (bcEl) bcEl.textContent = gameInfo.name;

    // Set header
    const iconEl = document.getElementById('detailGameIcon');
    if (iconEl) { iconEl.src = gameInfo.icon; iconEl.onerror = () => iconEl.src = 'assets/images/logo.jpg'; }
    const nameEl = document.getElementById('detailGameName');
    if (nameEl) nameEl.textContent = gameInfo.name;
    const ratingEl = document.getElementById('detailRating');
    if (ratingEl) ratingEl.textContent = gameInfo.rating;
    const soldEl = document.getElementById('detailSold');
    if (soldEl) soldEl.textContent = gameInfo.sold;
    const badgeEl = document.getElementById('detailTypeBadge');
    if (badgeEl) {
        badgeEl.textContent = gameInfo.type === 'login' ? 'Nạp Login' : 'Nạp UID';
        badgeEl.className = `ng-detail-type-badge ${gameInfo.type === 'login' ? 'ng-type-login' : 'ng-type-uid'}`;
    }

    // Toggle form fields
    const isLogin = gameInfo.type === 'login';
    const show = id => { const el = document.getElementById(id); if(el) el.style.display = ''; };
    const hide = id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; };
    if (isLogin) {
        hide('formGroupUid'); hide('formGroupServer');
        show('formGroupUsername'); show('formGroupPassword');
    } else {
        show('formGroupUid'); show('formGroupServer');
        hide('formGroupUsername'); hide('formGroupPassword');
    }

    // Pre-fill phone if logged in
    if (window.currentUser) {
        const phEl = document.getElementById('formPhone');
        if (phEl && !phEl.value) phEl.value = window.currentUser.phone || '';
    }

    // Render packages
    renderPackages(packages, 'all');

    // Tab filter for packages
    document.querySelectorAll('.ng-tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ng-tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTabFilter = btn.dataset.tab;
            renderPackages(packages, activeTabFilter);
        });
    });

    // Render reviews
    renderReviews();
}

function renderPackages(packages, filter) {
    const grid = document.getElementById('pkgGrid');
    if (!grid) return;
    const filtered = filter === 'all' ? packages : packages.filter(p => p.tag === filter);
    grid.innerHTML = filtered.map(pkg => `
        <div class="ng-pkg-card" onclick="selectDetailPackage(${JSON.stringify(pkg).replace(/"/g, '&quot;')}, this)">
            ${pkg.tag ? `<div class="ng-pkg-badge">${pkg.tag === 'monthly' ? 'Thẻ tháng' : 'BP'}</div>` : ''}
            <img src="${pkg.img}" class="ng-pkg-img" onerror="this.src='assets/images/logo.jpg'">
            <span class="ng-pkg-name">${pkg.name}</span>
            <span class="ng-pkg-price">${pkg.price.toLocaleString('vi-VN')} đ</span>
        </div>
    `).join('');
    // Re-select if already selected
    if (currentSelectedPackage) {
        document.querySelectorAll('.ng-pkg-card').forEach(card => {
            if (card.querySelector('.ng-pkg-name').textContent === currentSelectedPackage.name) {
                card.classList.add('selected');
            }
        });
    }
}

function renderReviews() {
    const list = document.getElementById('reviewList');
    if (!list) return;
    list.innerHTML = FAKE_REVIEWS.map(r => `
        <div class="ng-review-item">
            <div class="ng-review-avatar">${r.name[0]}</div>
            <div class="ng-review-content">
                <div class="ng-review-header">
                    <span class="ng-review-name">${r.name}</span>
                    <span class="ng-review-date">${r.date}</span>
                </div>
                <div class="ng-review-stars">${'★'.repeat(r.stars)}</div>
                <div class="ng-review-text">${r.text}</div>
            </div>
        </div>
    `).join('');
}

function selectDetailPackage(pkg, element) {
    currentSelectedPackage = pkg;
    document.querySelectorAll('.ng-pkg-card').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    updateCart();
}

function updateCart() {
    if (!currentSelectedPackage) return;
    const priceStr = currentSelectedPackage.price.toLocaleString('vi-VN') + ' đ';

    // Desktop cart
    const emptyCt = document.getElementById('emptyCart');
    const filledCt = document.getElementById('filledCart');
    if (emptyCt)  emptyCt.style.display = 'none';
    if (filledCt) filledCt.style.display = '';

    const nameEl  = document.getElementById('cartPkgName');
    const priceEl = document.getElementById('cartPkgPrice');
    const totalEl = document.getElementById('cartTotalPrice');
    const imgEl   = document.getElementById('cartPkgImg');
    const btnEl   = document.getElementById('btnSubmitOrder');

    if (nameEl)  nameEl.textContent  = currentSelectedPackage.name;
    if (priceEl) priceEl.textContent = priceStr;
    if (totalEl) totalEl.textContent = priceStr;
    if (imgEl)   { imgEl.src = currentSelectedPackage.img; imgEl.onerror = () => imgEl.src='assets/images/logo.jpg'; }
    if (btnEl)   btnEl.disabled = false;

    // Mobile bar
    const mobilePrice = document.getElementById('mobileBarPrice');
    const mobileBtn   = document.getElementById('mobileBarBtn');
    if (mobilePrice) mobilePrice.textContent = priceStr;
    if (mobileBtn)   mobileBtn.disabled = false;
}

function applyPromo() {
    const code = (document.getElementById('promoInput') || {}).value || '';
    if (!code.trim()) return;
    // Placeholder — add real promo logic here
    alert(`Mã "${code.trim()}" không hợp lệ hoặc đã hết hạn.`);
}

function showUidHelp() {
    alert('Hướng dẫn tìm UID:\n1. Mở game → Menu chính\n2. Chọn hồ sơ / Avatar\n3. Số UID hiển thị bên dưới tên nhân vật\n\nLưu ý: UID là dãy số 9 chữ số, không phải username.');
}

// ==========================================
// 7. SUBMIT ORDER → SUPABASE
// ==========================================
async function submitDetailOrder() {
    if (!currentSelectedPackage) return alert('Vui lòng chọn 1 gói nạp!');

    const gameInfo = GAME_INFO[currentGameId] || GAME_INFO['default'];
    const isLogin  = gameInfo.type === 'login';

    const phone = (document.getElementById('formPhone') || {}).value?.trim();
    if (!phone) return alert('Vui lòng nhập SĐT Zalo liên hệ!');

    let uid = 'login', server = 'login', note = '';
    if (isLogin) {
        const user = (document.getElementById('formUsername') || {}).value?.trim();
        const pass = (document.getElementById('formPassword') || {}).value?.trim();
        if (!user || !pass) return alert('Vui lòng nhập Tên đăng nhập và Mật khẩu!');
        note = `Login: ${user} | Pass: ${pass}`;
    } else {
        uid = (document.getElementById('formUid') || {}).value?.trim();
        server = (document.getElementById('formServer') || {}).value;
        if (!uid) return alert('Vui lòng nhập UID trong game!');
        if (!server) return alert('Vui lòng chọn máy chủ!');
    }

    const btnIds = ['btnSubmitOrder', 'mobileBarBtn'];
    const originalTexts = {};
    btnIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) { originalTexts[id] = el.innerHTML; el.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...'; el.disabled = true; }
    });

    try {
        const orderData = {
            user_id: window.currentUser?.id || null,
            customer_name: window.currentUser?.email || 'Khách vãng lai',
            customer_phone: phone,
            game_id: currentGameId,
            game_name: gameInfo.name,
            package_id: currentSelectedPackage.id,
            package_name: currentSelectedPackage.name,
            price: currentSelectedPackage.price,
            uid_ingame: uid,
            server: server,
            note: note,
            status: 'pending',
            payment_method: 'manual',
            is_public: true
        };

        const { error } = await supabaseClient.from('napgame_orders').insert([orderData]);
        if (error) throw error;

        // Success
        btnIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = '<i class="fa-solid fa-check"></i> Thành công!'; el.style.background = '#16a34a'; }
        });
        setTimeout(() => {
            alert('✅ Đặt hàng thành công!\n\nAdmin sẽ liên hệ qua Zalo ' + phone + ' trong vài phút để xác nhận và hướng dẫn thanh toán.');
            window.location.reload();
        }, 1500);

    } catch (err) {
        console.error('Order error:', err);
        alert('Có lỗi khi tạo đơn hàng. Vui lòng thử lại hoặc liên hệ Zalo trực tiếp.');
        btnIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = originalTexts[id]; el.disabled = false; el.style.background = ''; }
        });
    }
}

// ==========================================
// INIT ROUTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTicker();

    if (document.getElementById('sliderTrack')) {
        initCatalogPage();
    }
    if (document.getElementById('pkgGrid')) {
        initDetailPage();
    }
});
