
let currentQuantity = 1;

window.changeQuantity = function(delta) {
    currentQuantity = 1;
    const disp = document.getElementById('qtyDisplay');
    if (disp) disp.textContent = currentQuantity;
    updateCart();
};

window.togglePasswordVisibility = function() {
    const input = document.getElementById('formPassword');
    const icon = document.getElementById('pwdEyeIcon');
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fas fa-eye';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fas fa-eye-slash';
    }
};

window.toggleDescExpand = function(btn) {
    const col = document.getElementById('descCollapsible');
    if (!col) return;
    if (col.style.display === 'none' || !col.style.display) {
        col.style.display = 'block';
        if (btn) btn.innerHTML = 'Thu gọn <i class="fas fa-chevron-up"></i>';
    } else {
        col.style.display = 'none';
        if (btn) btn.innerHTML = 'Xem tất cả <i class="fas fa-chevron-down"></i>';
    }
};

window.addToCartClick = function() {
    if (!currentSelectedPackage?.id) {
        alert('Vui lòng chọn một gói nạp trước khi thêm vào giỏ hàng.');
        return;
    }
    alert(`Đã thêm gói "${currentSelectedPackage.name}" (Số lượng: ${currentQuantity}) vào giỏ hàng!`);
};

async function loadSavedAccounts() {
    const select = document.getElementById('savedAccountSelect');
    if (!select || !supabaseClient || !window.currentUser?.id) return;
    try {
        const { data, error } = await supabaseClient
            .from('user_game_accounts')
            .select('*')
            .eq('user_id', window.currentUser.id);
        if (!error && data && data.length) {
            select.innerHTML = '<option value="">-- Chọn tài khoản / UID đã lưu --</option>';
            data.forEach(acc => {
                const uidLabel = acc.uid || acc.ingame_name || '';
                const nickLabel = acc.nickname || acc.account_identifier || acc.game || 'Tài khoản';
                const opt = document.createElement('option');
                opt.value = JSON.stringify(acc);
                opt.textContent = uidLabel
                    ? `${nickLabel} — UID: ${uidLabel} (${acc.server || 'Asia'})`
                    : `${nickLabel} (${acc.server || 'Asia'})`;
                select.appendChild(opt);
            });
        }
    } catch (_) {}
}

window.onSavedAccountSelect = function(sel) {
    if (!sel || !sel.value) return;
    try {
        const acc = JSON.parse(sel.value);
        if (acc.account_identifier) {
            const userInp = document.getElementById('formUsername');
            if (userInp && !userInp.value) userInp.value = acc.account_identifier;
        }
        const savedUid = acc.uid || acc.ingame_name || '';
        if (savedUid) {
            const uidInp = document.getElementById('formUID');
            if (uidInp) uidInp.value = savedUid;
        }
        if (acc.server) {
            const srvInp = document.getElementById('formServer');
            if (srvInp) srvInp.value = acc.server;
        }
    } catch (_) {}
};

/**
 * NAP GAME LOGIC - NAMCUMZ (V3 - Login Top-up Only)
 * 2-page: Catalog (napgame.html) + Detail (napgame-detail.html)
 */

const ZALO_LINK = 'https://zalo.me/0763550673';

// ==========================================
// 1. GAME DATA
// ==========================================
const GAMES_CATALOG = {
    featured: [
        { id: 'genshin', name: 'Genshin Impact', image: 'assets/images/games/genshin_card.jpg' },
        { id: 'hsr', name: 'Honkai Star Rail', image: 'assets/images/games/hsr_card.jpg' },
        { id: 'zzz', name: 'Zenless Zone Zero', image: 'assets/images/games/zzz_card.jpg' },
        { id: 'wuwa', name: 'Wuthering Waves', image: 'assets/images/games/wuwa_card.jpg' }
    ]
};
const GAME_INFO = {
    'genshin': { name: 'Genshin Impact', icon: 'assets/images/games/genshin_icon.webp', type: 'login' },
    'genshin-login': { name: 'Genshin Impact', icon: 'assets/images/games/genshin_icon.webp', type: 'login' },
    'hsr': { name: 'Honkai Star Rail', icon: 'assets/images/games/hsr_icon.webp', type: 'login' },
    'hsr-login': { name: 'Honkai Star Rail', icon: 'assets/images/games/hsr_icon.webp', type: 'login' },
    'zzz': { name: 'Zenless Zone Zero', icon: 'assets/images/games/zzz_icon.webp', type: 'login' },
    'zzz-login': { name: 'Zenless Zone Zero', icon: 'assets/images/games/zzz_icon.webp', type: 'login' },
    'wuwa': { name: 'Wuthering Waves', icon: 'assets/images/games/wuwa_icon.webp', type: 'login' },
    'wuwa-login': { name: 'Wuthering Waves', icon: 'assets/images/games/wuwa_icon.webp', type: 'login' },
    'default': { name: 'Game Top-up', icon: 'assets/images/logo.webp', type: 'login' }
};

// ============================================================
// BẢNG GIÁ CHÍNH THỨC GENSHIN IMPACT (NGUYỄN HOÀNG NAM)
// Các game khác hiện đang trong trạng thái bảo trì ([]).
// ============================================================
const GAME_PACKAGES = {
    // ---------- GENSHIN IMPACT ----------
    'genshin': [
        { id: '10000000-0000-0000-0000-000000000001', name: 'Không Nguyệt Chúc Phúc (Thẻ Tháng)', price:   85000, img: 'assets/images/games/genshin_welkin.png',       tag: 'monthly',    desc: 'Thẻ tháng 30 ngày' },
        { id: '10000000-0000-0000-0000-000000000009', name: 'Nhật Ký Hành Trình Trân Châu',       price:  190000, img: 'assets/images/games/genshin_bp_pearl.png',     tag: 'battlepass', desc: 'Nhật Ký Hành Trình' },
        { id: '10000000-0000-0000-0000-000000000010', name: 'Bài Ca Trân Châu',                   price:  380000, img: 'assets/images/games/genshin_bp_hymn.png',      tag: 'battlepass', desc: 'Bài Ca Trân Châu' },
        { id: '10000000-0000-0000-0000-000000000002', name: '60 Đá Sáng Thế',                     price:   20000, img: 'assets/images/games/genshin_crystals_60.png',  tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000003', name: '300 + 30 Đá Sáng Thế',               price:   90000, img: 'assets/images/games/genshin_crystals_300.png', tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000004', name: '980 + 110 Đá Sáng Thế',              price:  270000, img: 'assets/images/games/genshin_crystals_980.png', tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000005', name: '1980 + 260 Đá Sáng Thế',             price:  570000, img: 'assets/images/games/genshin_crystals_1980.png',tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000006', name: '3280 + 600 Đá Sáng Thế',             price:  950000, img: 'assets/images/games/genshin_crystals_3280.png',tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000007', name: '6480 + 1600 Đá Sáng Thế',            price: 1850000, img: 'assets/images/games/genshin_crystals_6480.png',tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000008', name: 'FULL PACK GENSHIN IMPACT',           price: 3800000, img: 'assets/images/games/genshin_crystals_all.jpg', tag: 'topup',      desc: 'Trọn bộ tất cả các gói nạp đá' }
    ],
    'genshin-login': 'genshin',

    // ---------- CÁC GAME ĐANG BẢO TRÌ ----------
    'hsr': [],
    'hsr-login': 'hsr',
    'zzz': [],
    'zzz-login': 'zzz',
    'wuwa': [],
    'wuwa-login': 'wuwa',

    // ---------- DEFAULT fallback ----------
    'default': []
};

// 2. TICKER
// ==========================================
function initTicker() {
    document.querySelectorAll('.ng-ticker-wrap').forEach(ticker => ticker.remove());
}
// 3. SLIDER (Catalog Page)
// ==========================================
let slideIndex = 0;
let slideInterval;

function goSlide(index) {
    const track = document.getElementById('sliderTrack');
    const dots  = document.querySelectorAll('.ng-dot');
    if (!track) return;
    const total = track.children.length;
    slideIndex = ((index % total) + total) % total;
    track.style.transform = `translateX(-${slideIndex * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === slideIndex));
}

function slideTo(dir) {
    goSlide(slideIndex + dir);
    resetSlideTimer();
}

function startSlider() {
    if (!document.getElementById('sliderTrack')) return;
    goSlide(0);
}

function resetSlideTimer() {
    if (slideInterval) clearInterval(slideInterval);
}

// ==========================================
// 5. CATALOG RENDERING + FILTER
// ==========================================
async function initCatalogPage() {
    startSlider();
    showCatalogMessage('gridFeatured', 'Đang tải danh mục...');
    document.querySelectorAll('a[href*="zalo.me"]').forEach(a => a.href = ZALO_LINK);

    const availableFeatured = GAMES_CATALOG.featured.filter(game => game.id === 'genshin');
    renderPortrait(availableFeatured);
    if (!availableFeatured.length) showCatalogMessage('gridFeatured', 'Hiện chưa có game nào mở bán.');

    const searchInput = document.getElementById('gameSearch');
    if (searchInput) {
        searchInput.addEventListener('input', event => {
            const query = event.target.value.toLowerCase().trim();
            document.querySelectorAll('.ng-card-portrait').forEach(card => {
                const title = card.querySelector('.ng-card-portrait-title');
                card.style.display = (title?.innerText || '').toLowerCase().includes(query) ? '' : 'none';
            });
        });
    }
}
function renderPortrait(data) {
    const grid = document.getElementById('gridFeatured');
    if (!grid) return;
    grid.innerHTML = data.map(game => `
        <a href="napgame-detail.html?game=${game.id}" class="ng-card-portrait">
            <img src="${game.image}" alt="${game.name}" onerror="this.src='assets/images/logo.jpg'">
            <div class="ng-card-portrait-info">
                ${game.badge ? `<div class="ng-card-portrait-badge ${game.badgeCls}">${game.badge}</div>` : ''}
                <div class="ng-card-portrait-title">${game.name}</div>
                <div class="ng-card-portrait-btn">Nạp Ngay</div>
            </div>
        </a>
    `).join('');
}
// 6. DETAIL PAGE LOGIC
// ==========================================
let currentSelectedPackage = null;
let currentGameId = 'default';
let activeTabFilter = 'all';

function getPackagePresentation(packageId, packageName) {
    for (const value of Object.values(GAME_PACKAGES)) {
        if (Array.isArray(value)) {
            const match = value.find(item => item.id === packageId || (packageName && item.name === packageName));
            if (match) return match;
        }
    }
    return {};
}

// Pick game-specific catalog artwork when older rows contain only generic assets.
function getPackageImage(gameName, packageId, packageName, tag) {
    const presentation = getPackagePresentation(packageId, packageName);
    if (presentation.img) return presentation.img;
    const gameKey = Object.entries(GAME_INFO).find(([, info]) => info.name === gameName)?.[0]?.replace('-login', '');
    if (gameKey && ['genshin', 'hsr', 'zzz', 'wuwa'].includes(gameKey)) {
        const prefix = gameKey === 'genshin' ? 'crystals' : gameKey;
        const match = String(packageName || '').match(/(?:^|\s)(60|300|980|1980|3280|6480)(?:\s|\+|$)/);
        if (tag === 'monthly') {
            const monthly = { genshin:'genshin_welkin.png', hsr:'hsr_pass.webp', zzz:'zzz_pass.webp', wuwa:'wuwa_pass.webp' }[gameKey];
            return `assets/images/games/${monthly}`;
        }
        if (tag === 'battlepass' && gameKey === 'genshin') {
            if (packageId === '10000000-0000-0000-0000-000000000010' || /bài\s*ca|hymn/i.test(packageName || '')) {
                return 'assets/images/games/genshin_bp_hymn.png';
            }
            return 'assets/images/games/genshin_bp_pearl.png';
        }
        if (tag === 'battlepass' && gameKey === 'hsr') return 'assets/images/games/hsr_bp.webp';
        if (match) {
            if (gameKey === 'genshin') return `assets/images/games/genshin_crystals_${match[1]}.png`;
            return `assets/images/games/${prefix}_${match[1]}.webp`;
        }
        if (gameKey === 'genshin' && /full\s*pack|toàn\s*bộ/i.test(packageName || '')) return 'assets/images/games/genshin_crystals_all.jpg';
        if (gameKey === 'genshin') return 'assets/images/games/genshin_card.jpg';
    }
    return Object.values(GAME_INFO).find(info => info.name === gameName)?.icon || 'assets/images/logo.jpg';
}

// Load active catalog rows; names, ids, and prices come from database, with fallback for offline/preview
async function loadActivePackages(gameName) {
    const gameKey = Object.entries(GAME_INFO).find(([, info]) => info.name === gameName)?.[0]?.replace('-login', '') || 'genshin';
    const fallbackList = (GAME_PACKAGES[gameKey] || []).slice();
    if (!fallbackList.length || !supabaseClient) {
        return fallbackList;
    }
    try {
        const { data, error } = await supabaseClient.from('packages')
            .select('id,game,name,price,active')
            .eq('game', gameName)
            .eq('active', true)
            .order('price', { ascending: true });
        if (error || !data || data.length === 0) {
            return fallbackList;
        }
        // Build lookup from official price sheet so visual order & updated prices stay consistent
        const fbById = new Map(fallbackList.map(item => [item.id, item]));
        const dbPackages = data
            .filter(row => row && typeof row.name === 'string' && Number.isFinite(Number(row.price)) && Number(row.price) > 0)
            .map(row => {
                const presentation = fbById.get(row.id) || getPackagePresentation(row.id, row.name);
                return {
                    ...presentation,
                    id: row.id,
                    name: presentation.name || row.name,
                    price: Number(row.price),
                    img: getPackageImage(gameName, row.id, row.name, presentation.tag || 'topup'),
                    tag: presentation.tag || 'topup'
                };
            });

        const dbMap = new Map();
        dbPackages.forEach(pkg => {
            dbMap.set(pkg.id, pkg);
            if (pkg.name) dbMap.set(pkg.name, pkg);
        });

        const result = [];
        const seenIds = new Set();
        fallbackList.forEach(fb => {
            const dbMatch = dbMap.get(fb.id) || dbMap.get(fb.name);
            if (dbMatch) {
                result.push(dbMatch);
                seenIds.add(dbMatch.id);
                seenIds.add(fb.id);
            } else {
                result.push(fb);
                seenIds.add(fb.id);
            }
        });

        dbPackages.forEach(pkg => {
            if (!seenIds.has(pkg.id)) {
                result.push(pkg);
                seenIds.add(pkg.id);
            }
        });

        return result.length ? result : fallbackList;
    } catch (_) {
        return fallbackList;
    }
}

// Build an allowlisted, non-sensitive return URL for the selected top-up package.
function buildTopupReturnPath(packageId) {
    const supportedGames = ['genshin', 'genshin-login', 'hsr', 'hsr-login', 'zzz', 'zzz-login', 'wuwa', 'wuwa-login'];
    if (!supportedGames.includes(currentGameId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(packageId || '')) return '';
    const params = new URLSearchParams({ game: currentGameId, package: packageId });
    return '/napgame-detail.html?' + params.toString();
}

// Return guests to the selected package after account authentication.
function continueTopupAfterLogin() {
    const returnPath = buildTopupReturnPath(currentSelectedPackage?.id);
    if (!returnPath) {
        showCheckoutMessage('Không thể giữ lại gói này. Vui lòng tải lại danh mục và chọn lại.');
        return;
    }
    window.location.href = 'login.html?form=login&next=' + encodeURIComponent(returnPath);
}

function showCatalogMessage(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    status.className = 'ng-catalog-status';
    status.textContent = message;
    container.replaceChildren(status);
}

async function initDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const rawGameParam = (params.get('game') || 'genshin').toLowerCase();
    const rawTypeParam = (params.get('type') || 'login').toLowerCase();
    currentGameId = Object.hasOwn(GAME_INFO, rawGameParam) ? rawGameParam : 'default';
    const gameInfo = GAME_INFO[currentGameId] || GAME_INFO.default;
    const themeGameId = currentGameId.replace('-login', '');
    document.body.dataset.game = themeGameId;
    const detailHeader = document.querySelector('.ng-detail-header');
    if (detailHeader) detailHeader.dataset.game = themeGameId;

    document.title = `${gameInfo.name} - Nạp Game | NAMCUMZ`;
    const breadcrumb = document.getElementById('breadcrumbGame');
    if (breadcrumb) breadcrumb.textContent = gameInfo.name;
    const icon = document.getElementById('detailGameIcon');
    if (icon) { icon.src = gameInfo.icon; icon.alt = gameInfo.name; icon.onerror = () => { icon.src = 'assets/images/logo.jpg'; }; }
    const cover = document.getElementById('detailGameCover');
    if (cover && GAMES_CATALOG.featured.some(game => game.id === themeGameId)) {
        cover.style.backgroundImage = "url(assets/images/games/" + themeGameId + "_banner.jpg)";
    }
    const name = document.getElementById('detailGameName');
    if (name) name.textContent = gameInfo.name;
    const badge = document.getElementById('detailTypeBadge');
    if (badge) {
        badge.textContent = rawTypeParam === 'uid' ? 'Nạp UID (Đang bảo trì)' : 'Nạp Login';
        badge.className = 'ng-detail-type-badge ng-type-login';
    }
    if (window.currentUser) {
        const phone = document.getElementById('formPhone');
        if (phone && !phone.value) phone.value = window.currentUser.phone || '';
    }

    const requestedPackageId = params.get('package') || '';
    let packages = rawTypeParam === 'uid' ? [] : (GAME_PACKAGES[themeGameId] || []).slice();
    if (!packages.length) {
        renderUnsupportedGame(gameInfo);
        return;
    }
    const restoredPackage = requestedPackageId ? packages.find(pkg => pkg.id === requestedPackageId) : null;
    currentSelectedPackage = restoredPackage || null;
    renderPackages(packages, 'all');
    updateCart();

    try {
        const livePackages = await loadActivePackages(gameInfo.name);
        if (livePackages && livePackages.length) {
            packages = livePackages;
            currentSelectedPackage = requestedPackageId ? packages.find(pkg => pkg.id === requestedPackageId) : (currentSelectedPackage || null);
            renderPackages(packages, 'all');
            updateCart();
        }
    } catch (error) {
        console.warn('Lấy giá từ cache:', error);
    }
    document.querySelectorAll('.ng-tab-btn[data-tab]').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.ng-tab-btn[data-tab]').forEach(tab => { tab.classList.remove('active'); tab.setAttribute('aria-pressed', 'false'); });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
            activeTabFilter = button.dataset.tab;
            renderPackages(packages, activeTabFilter);
        });
    });
    document.querySelectorAll('.ng-btn-zalo').forEach(button => {
        button.onclick = () => window.open(ZALO_LINK, '_blank');
    });
    renderReviews();
    loadSavedAccounts();
}
// Give unavailable catalogs a clear return path and prevent checkout.
function renderUnsupportedGame(gameInfo) {
    currentSelectedPackage = null;
    showCatalogMessage('pkgGrid', gameInfo && gameInfo.name !== 'Game Top-up'
        ? `Dịch vụ nạp cho ${gameInfo.name} hiện đang bảo trì cập nhật bảng giá. Quý khách vui lòng chọn Nạp Genshin Impact (Login) hoặc liên hệ Zalo CSKH 0763.550.673 để được hỗ trợ.`
        : 'Dịch vụ này hiện đang bảo trì cập nhật bảng giá. Vui lòng chọn Nạp Genshin Impact (Login) hoặc liên hệ Zalo CSKH.');
    const status = document.querySelector('#pkgGrid .ng-catalog-status');
    if (status) {
        const link = document.createElement('a');
        link.className = 'ng-support-link';
        link.href = 'napgame-detail.html?game=genshin&type=login';
        link.textContent = '→ Chuyển sang Nạp Genshin Impact (Đang mở)';
        const homeLink = document.createElement('a');
        homeLink.className = 'ng-support-link';
        homeLink.style.marginLeft = '16px';
        homeLink.href = '/index.html#recharge-game-list';
        homeLink.textContent = '← Về trang chủ';
        status.append(document.createElement('br'), link, homeLink);
    }
    document.querySelectorAll('.ng-pkg-tabs, .ng-order-steps, #orderInfoBlock, #paymentBlock, .ng-col-right, .ng-mobile-bar').forEach(element => { element.hidden = true; });
    ['btnSubmitOrder', 'mobileBarBtn'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = true;
    });
}
// Render database catalog data with text nodes so package names cannot inject markup.
// Render active package data as safe, native radio choices.
function renderPackages(packages, filter) {
    const grid = document.getElementById('pkgGrid');
    if (!grid) return;
    const filtered = filter === 'all' ? packages : packages.filter(pkg => pkg.tag === filter);
    if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ng-catalog-status';
        empty.textContent = 'Không có gói nào trong danh mục này.';
        grid.replaceChildren(empty);
        return;
    }

    const cards = filtered.map(pkg => {
        const card = document.createElement('label');
        card.className = 'ng-pkg-card';
        card.style.display = 'block';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'selectedPackage';
        radio.value = pkg.id;
        radio.setAttribute('aria-label', `${pkg.name} ${pkg.price.toLocaleString('vi-VN')} đ`);
        radio.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;';
        radio.checked = currentSelectedPackage?.id === pkg.id;
        card.appendChild(radio);
        const image = document.createElement('img');
        image.className = 'ng-pkg-img';
        image.src = pkg.img || (pkg.tag === 'monthly' ? 'assets/images/topup/pass.svg' : pkg.tag === 'battlepass' ? 'assets/images/topup/battlepass.svg' : 'assets/images/topup/crystals.svg');
        image.onerror = () => { image.src = pkg.tag === 'monthly' ? 'assets/images/topup/pass.svg' : pkg.tag === 'battlepass' ? 'assets/images/topup/battlepass.svg' : 'assets/images/topup/crystals.svg'; };
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        const packageName = document.createElement('span');
        packageName.className = 'ng-pkg-name';
        packageName.textContent = pkg.name;
        const price = document.createElement('span');
        price.className = 'ng-pkg-price';
        price.textContent = pkg.price.toLocaleString('vi-VN') + 'đ';
        card.append(image, packageName, price);

        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            currentSelectedPackage = pkg;
            grid.querySelectorAll('.ng-pkg-card').forEach(item => item.classList.remove('selected'));
            card.classList.add('selected');
            updateCart();
        });
        if (radio.checked) card.classList.add('selected');
        return card;
    });
    grid.replaceChildren(...cards);
}
function renderReviews() {
    const list = document.getElementById('reviewList');
    if (!list) return;
    const note = document.createElement('p');
    note.textContent = 'Đánh giá đã xác minh sẽ hiển thị sau khi có đơn được nghiệm thu.';
    list.replaceChildren(note);
}
function updateCart() {
    const summaryPkg = document.getElementById('summaryPkgName');
    const summaryTotal = document.getElementById('summaryTotal');
    const emptyCt  = document.getElementById('emptyCart');
    const filledCt = document.getElementById('filledCart');

    if (!currentSelectedPackage) {
        if (emptyCt)  emptyCt.style.display  = '';
        if (filledCt) filledCt.style.display = 'none';
        if (summaryPkg) summaryPkg.textContent = 'Chưa chọn gói';
        if (summaryTotal) summaryTotal.textContent = '0đ';
        return;
    }
    const packageError = document.getElementById('packageError');
    if (packageError) packageError.hidden = true;
    const totalAmount = currentSelectedPackage.price * currentQuantity;
    const priceStr = totalAmount.toLocaleString('vi-VN') + 'đ';

    if (emptyCt)  emptyCt.style.display  = 'none';
    if (filledCt) filledCt.style.display = '';

    const nameEl  = document.getElementById('cartPkgName');
    const priceEl = document.getElementById('cartPkgPrice');
    const totalEl = document.getElementById('cartTotalPrice');
    const imgEl   = document.getElementById('cartPkgImg');
    const btnEl   = document.getElementById('btnSubmitOrder');

    if (nameEl)  nameEl.textContent  = currentSelectedPackage.name;
    if (priceEl) priceEl.textContent = currentSelectedPackage.price.toLocaleString('vi-VN') + 'đ';
    if (totalEl) totalEl.textContent = priceStr;
    if (summaryPkg) summaryPkg.textContent = currentSelectedPackage.name;
    if (summaryTotal) summaryTotal.textContent = priceStr;
    if (imgEl) {
        imgEl.src = currentSelectedPackage.img || (currentSelectedPackage.tag === 'monthly' ? 'assets/images/topup/pass.svg' : currentSelectedPackage.tag === 'battlepass' ? 'assets/images/topup/battlepass.svg' : 'assets/images/topup/crystals.svg');
        imgEl.onerror = () => { imgEl.src = 'assets/images/topup/crystals.svg'; };
    }
    if (btnEl)   btnEl.disabled = false;

    const mobileName = document.getElementById('mobileBarName');
    const mobilePrice = document.getElementById('mobileBarPrice');
    if (mobileName) mobileName.textContent = currentSelectedPackage.name;
    const mobileBar   = document.getElementById('mobileBar');
    const mobileBtn   = document.getElementById('mobileBarBtn');
    if (mobileBar) mobileBar.classList.add('has-selection');
    if (mobilePrice) mobilePrice.textContent = priceStr;
    if (mobileBtn)   mobileBtn.disabled = false;
    syncTopupAccountLink();
}

// Show a field error and connect it to the affected control.
function setFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (field) field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) {
        error.textContent = message;
        error.hidden = !message;
    }
}

// Show order status in the page without interrupting keyboard or screen reader flow.
function showCheckoutMessage(message, state = 'error') {
    const status = document.getElementById('checkoutMessage');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = !message;
}

// Explain current promo availability without claiming a discount.
function applyPromo() {
    const input = document.getElementById('promoInput');
    const error = document.getElementById('promoError');
    if (!input || !error) return;
    const code = input.value.trim();
    error.textContent = code ? 'Hiện chưa hỗ trợ áp dụng mã giảm giá trực tuyến. Tổng tiền không thay đổi.' : 'Vui lòng nhập mã giảm giá.';
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
}

// Submit the selected database package through the existing secure order API.
async function submitDetailOrder() {
    showCheckoutMessage('');
    setFieldError('formUsername', 'usernameError', '');
    setFieldError('formPassword', 'passwordError', '');
    setFieldError('formPhone', 'phoneError', '');
    setFieldError('formUID', 'uidError', '');
    const packageError = document.getElementById('packageError');
    if (packageError) packageError.hidden = true;

    if (!currentSelectedPackage?.id) {
        if (packageError) {
            packageError.textContent = 'Vui lòng chọn một gói nạp.';
            packageError.hidden = false;
            packageError.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return;
    }
    if (!window.currentUser?.id) {
        continueTopupAfterLogin();
        return;
    }

    const server = (document.getElementById('formServer')?.value || 'Asia').trim();
    const loginMethod = (document.getElementById('formLoginMethod')?.value || 'Hoyoverse').trim();
    const account = (document.getElementById('formUsername')?.value || '').trim();
    const password = document.getElementById('formPassword')?.value || '';
    const phone = (document.getElementById('formPhone')?.value || '').trim();
    const rawNotes = (document.getElementById('formNotes')?.value || '').trim();
    const uidVal = (document.getElementById('formUID')?.value || '').replace(/\s+/g, '');
    let notes = rawNotes;
    if (uidVal) {
        notes = `[UID: ${uidVal}] ` + (notes ? notes : '');
    }
    if (currentQuantity > 1) {
        notes = `[SL: ${currentQuantity}] ` + (notes ? notes : '');
    }
    let firstInvalid = null;
    if (!account) { setFieldError('formUsername', 'usernameError', 'Vui lòng nhập email hoặc tên đăng nhập.'); firstInvalid ||= 'formUsername'; }
    if (uidVal && !/^\d{9,10}$/.test(uidVal)) {
        setFieldError('formUID', 'uidError', 'UID Genshin Impact gồm 9 hoặc 10 chữ số (VD: 812345678).');
        firstInvalid ||= 'formUID';
    }
    if (!password) { setFieldError('formPassword', 'passwordError', 'Vui lòng nhập mật khẩu tài khoản game.'); firstInvalid ||= 'formPassword'; }
    if (!phone || !/^[0-9+ .()\-]{8,25}$/.test(phone)) {
        setFieldError('formPhone', 'phoneError', 'Vui lòng nhập số điện thoại Zalo hợp lệ (8-15 chữ số).');
        firstInvalid ||= 'formPhone';
    }
    if (firstInvalid) {
        document.getElementById(firstInvalid)?.focus();
        showCheckoutMessage('Vui lòng kiểm tra các trường được đánh dấu.');
        return;
    }

    const btn = document.getElementById('btnSubmitOrder');
    const mobileBtn = document.getElementById('mobileBarBtn');
    const originalText = btn?.innerHTML || '';
    const mobileText = mobileBtn?.textContent || 'Đặt hàng';
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'Đang tạo đơn...'; }
    if (mobileBtn) { mobileBtn.disabled = true; mobileBtn.setAttribute('aria-busy', 'true'); mobileBtn.textContent = 'Đang xử lý...'; }
    try {
        const client = supabaseClient;
        if (!client) throw new Error('Không tìm thấy kết nối hệ thống.');
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError || !authData?.user?.id || authData.user.id !== window.currentUser.id) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử tạo đơn.');
        }

        // Save UID/Server to user_game_accounts if checkbox is checked (never stores password)
        const saveCheckbox = document.getElementById('saveAccountCheckbox');
        if (saveCheckbox?.checked && uidVal) {
            try {
                const { data: existing } = await client
                    .from('user_game_accounts')
                    .select('id')
                    .eq('user_id', authData.user.id)
                    .eq('uid', uidVal)
                    .limit(1);
                if (!existing || !existing.length) {
                    await client.from('user_game_accounts').insert({
                        user_id: authData.user.id,
                        game: 'Genshin Impact',
                        uid: uidVal,
                        server,
                        nickname: account.split('@')[0].slice(0, 40) || 'Traveler',
                        notes: `Login: ${loginMethod}`
                    });
                }
            } catch (_) {}
        }

        const order = await OrderAPI.topup(client, authData.user.id, currentSelectedPackage.id, server, loginMethod, account, password, phone, notes);
        showCheckoutMessage('Đã tạo đơn. Đang chuyển đến trang thanh toán...', 'success');
        window.location.href = `checkout.html?order=${encodeURIComponent(order.order_code || order.id)}`;
    } catch (err) {
        console.error('Lỗi tạo đơn nạp game:', err);
        showCheckoutMessage(err.message?.includes('Authenticated owner required') ? 'Không xác định được chủ đơn. Vui lòng tải lại trang và thử lại; nếu vẫn lỗi, liên hệ CSKH.' : (err.message || 'Không thể tạo đơn. Vui lòng kiểm tra lại hoặc liên hệ Zalo.'));
    } finally {
        if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.innerHTML = originalText; }
        if (mobileBtn) { mobileBtn.disabled = false; mobileBtn.removeAttribute('aria-busy'); mobileBtn.textContent = mobileText; }
    }
}

// ==========================================
// INIT ROUTER
// ==========================================
// Keep the shared top-up header aligned with the actual Supabase session.
function syncTopupAccountLink() {
    const signedIn = Boolean(window.currentUser?.id);
    const returnPath = currentSelectedPackage?.id ? buildTopupReturnPath(currentSelectedPackage.id) : window.location.pathname + window.location.search;
    const href = signedIn ? '/dashboard.html' : '/login.html?form=login&next=' + encodeURIComponent(returnPath);
    const name = localStorage.getItem('username') || window.currentUser?.user_metadata?.display_name || 'Tài khoản';
    [document.getElementById('ngAccountLink'), document.getElementById('lpMobileAccount')].forEach(link => {
        if (!link) return;
        link.href = href;
        link.textContent = signedIn ? name + ' / Đơn hàng' : 'Đăng nhập / Đăng ký';
        link.title = signedIn ? 'Mở tài khoản và đơn hàng' : 'Đăng nhập để tiếp tục';
    });
}
window.addEventListener('namcumz-auth-updated', syncTopupAccountLink);
document.addEventListener('DOMContentLoaded', () => {
    syncTopupAccountLink();

    initTicker();
    if (document.getElementById('sliderTrack')) initCatalogPage();
    if (document.getElementById('pkgGrid')) initDetailPage();
    initZaloWidget();
    document.querySelectorAll('.ng-faq-question').forEach((button, index) => {
        const answer = button.nextElementSibling;
        if (!answer) return;
        answer.id = 'faqAnswer' + index;
        answer.hidden = true;
        button.setAttribute('aria-controls', answer.id);
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', () => {
            const opening = button.getAttribute('aria-expanded') !== 'true';
            button.classList.toggle('active', opening);
            button.setAttribute('aria-expanded', String(opening));
            answer.hidden = !opening;
        });
    });
});

// ==========================================
// 8. FLOATING ZALO WIDGET
// ==========================================
function initZaloWidget() {
    if (document.getElementById('nc-ai-btn') || document.querySelector('.lp-support-float')) return;
    const link = document.createElement('a');
    link.className = 'ng-zalo-float';
    link.href = ZALO_LINK;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Liên hệ Zalo CSKH');
    link.innerHTML = '<i class="fa-regular fa-comment-dots" aria-hidden="true"></i><span>CSKH</span>';
    document.body.appendChild(link);
}
