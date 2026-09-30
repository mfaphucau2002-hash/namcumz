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
        { id: 'genshin', name: 'Genshin Impact',    image: 'assets/images/games/genshin.webp',  badge: 'HOT', badgeCls: 'badge-hot' },
        { id: 'hsr',     name: 'Honkai Star Rail',  image: 'assets/images/games/hsr.webp',      badge: 'HOT', badgeCls: 'badge-hot' },
        { id: 'zzz',     name: 'Zenless Zone Zero', image: 'assets/images/games/zzz.webp',      badge: 'NEW', badgeCls: 'badge-new' },
        { id: 'wuwa',    name: 'Wuthering Waves',   image: 'assets/images/games/wuwa.webp',     badge: '',    badgeCls: '' }
    ],
    login: [
        { id: 'genshin',   name: 'Genshin Impact',             sub: 'Nạp Login • Bảo mật 100%', discount: '-15%', icon: 'assets/images/games/genshin_icon.webp', sold: '9.8K' },
        { id: 'hsr',       name: 'Honkai Star Rail',           sub: 'Nạp Login • Xử lý 5p',      discount: '-30%', icon: 'assets/images/games/hsr_icon.webp',     sold: '5.4K' },
        { id: 'wuwa',      name: 'Wuthering Waves',            sub: 'Nạp Login • Có bill',       discount: '-15%', icon: 'assets/images/games/wuwa_icon.webp',    sold: '4.1K' },
        { id: 'zzz',       name: 'Zenless Zone Zero',          sub: 'Nạp Login • Nhanh gọn',     discount: '-20%', icon: 'assets/images/games/zzz_icon.webp',     sold: '3.2K' },
        { id: 'thientinh', name: 'Thiên Tinh Kỳ Vũ',           sub: 'Nạp Login',                 discount: '-20%', icon: 'assets/images/games/thientinh_icon.webp',sold: '1.2K' },
        { id: 'valo',      name: 'Valorant',                   sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/valorant_icon.webp', sold: '2.8K' },
        { id: 'lol',       name: 'League of Legends',          sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/lol_icon.webp',      sold: '3.1K' },
        { id: 'mlbb',      name: 'Mobile Legends Bang Bang',   sub: 'Nạp Login',                 discount: '-15%', icon: 'assets/images/games/mlbb_icon.webp',     sold: '6.5K' },
        { id: 'cnz',       name: 'Chaos Zero Nightmare',       sub: 'Nạp Login',                 discount: '-15%', icon: 'assets/images/games/cnz_icon.webp',      sold: '900' },
        { id: 'gfl2',      name: 'Girls Frontline 2 Exilium',  sub: 'Nạp Login',                 discount: '-20%', icon: 'assets/images/games/gfl2_icon.webp',     sold: '1.5K' },
        { id: 'ba',        name: 'Blue Archive',               sub: 'Nạp Login',                 discount: '-15%', icon: 'assets/images/games/ba_icon.webp',       sold: '2.0K' },
        { id: 'arknights', name: 'Arknights',                  sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/arknights_icon.webp',sold: '1.8K' },
        { id: 'skycotl',   name: 'Sky: Child of the Light',    sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/sky_icon.webp',      sold: '800' },
        { id: 'biubia',    name: 'Biu La Đại Lục: Săn Hồn',    sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/biubia_icon.webp',   sold: '650' },
        { id: 'pgr',       name: 'Punishing Gray Raven',       sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/pgr_icon.webp',      sold: '1.1K' },
        { id: 'rev1999',   name: 'Reverse: 1999',              sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/rev1999_icon.webp',  sold: '1.3K' },
        { id: 'nen2eve',   name: 'Neverness to Everness',      sub: 'Nạp Login',                 discount: '-15%', icon: 'assets/images/games/nen2eve_icon.webp',  sold: '500' },
        { id: 'dislyte',   name: 'Dislyte',                    sub: 'Nạp Login',                 discount: '-10%', icon: 'assets/images/games/dislyte_icon.webp',  sold: '700' }
    ]
};

const GAME_INFO = {
    'genshin':       { name: 'Genshin Impact',    icon: 'assets/images/games/genshin_icon.webp',   rating: '5.0', sold: '9.777 đã bán', type: 'login', sold_n: 9777 },
    'genshin-login': { name: 'Genshin Impact',    icon: 'assets/images/games/genshin_icon.webp',   rating: '5.0', sold: '9.777 đã bán', type: 'login', sold_n: 9777 },
    'hsr':           { name: 'Honkai Star Rail',  icon: 'assets/images/games/hsr_icon.webp',       rating: '4.9', sold: '5.412 đã bán', type: 'login', sold_n: 5412 },
    'hsr-login':     { name: 'Honkai Star Rail',  icon: 'assets/images/games/hsr_icon.webp',       rating: '4.9', sold: '5.412 đã bán', type: 'login', sold_n: 5412 },
    'zzz':           { name: 'Zenless Zone Zero', icon: 'assets/images/games/zzz_icon.webp',       rating: '5.0', sold: '3.200 đã bán', type: 'login', sold_n: 3200 },
    'zzz-login':     { name: 'Zenless Zone Zero', icon: 'assets/images/games/zzz_icon.webp',       rating: '5.0', sold: '3.200 đã bán', type: 'login', sold_n: 3200 },
    'wuwa':          { name: 'Wuthering Waves',   icon: 'assets/images/games/wuwa_icon.webp',      rating: '5.0', sold: '4.100 đã bán', type: 'login', sold_n: 4100 },
    'wuwa-login':    { name: 'Wuthering Waves',   icon: 'assets/images/games/wuwa_icon.webp',      rating: '5.0', sold: '4.100 đã bán', type: 'login', sold_n: 4100 },
    'thientinh':     { name: 'Thiên Tinh Kỳ Vũ',  icon: 'assets/images/games/thientinh_icon.webp', rating: '5.0', sold: '1.200 đã bán', type: 'login', sold_n: 1200 },
    'valo':          { name: 'Valorant',          icon: 'assets/images/games/valorant_icon.webp',  rating: '4.8', sold: '2.800 đã bán', type: 'login', sold_n: 2800 },
    'lol':           { name: 'League of Legends', icon: 'assets/images/games/lol_icon.webp',       rating: '4.8', sold: '3.100 đã bán', type: 'login', sold_n: 3100 },
    'mlbb':          { name: 'Mobile Legends',    icon: 'assets/images/games/mlbb_icon.webp',      rating: '4.9', sold: '6.500 đã bán', type: 'login', sold_n: 6500 },
    'gfl2':          { name: 'Girls Frontline 2', icon: 'assets/images/games/gfl2_icon.webp',      rating: '5.0', sold: '1.500 đã bán', type: 'login', sold_n: 1500 },
    'ba':            { name: 'Blue Archive',      icon: 'assets/images/games/ba_icon.webp',        rating: '4.9', sold: '2.000 đã bán', type: 'login', sold_n: 2000 },
    'ba-login':      { name: 'Blue Archive',      icon: 'assets/images/games/ba_icon.webp',        rating: '4.9', sold: '2.000 đã bán', type: 'login', sold_n: 2000 },
    'arknights':     { name: 'Arknights',         icon: 'assets/images/games/arknights_icon.webp', rating: '4.9', sold: '1.800 đã bán', type: 'login', sold_n: 1800 },
    'default':       { name: 'Game Top-up',       icon: 'assets/images/logo.jpg',                  rating: '5.0', sold: '100+ đã bán',   type: 'login', sold_n: 100  }
};

// ============================================================
// GAME PACKAGES — Seeded with verified UUIDs from migration 003
// ============================================================
const GAME_PACKAGES = {
    // ---------- GENSHIN IMPACT ----------
    'genshin': [
        { id: '10000000-0000-0000-0000-000000000001', name: 'Không Nguyệt Chúc Phúc (Thẻ Tháng)', price:   85000, img: 'assets/images/games/welkin.webp',        tag: 'monthly',    desc: 'Thẻ tháng 30 ngày — 90 đá/ngày' },
        { id: '10000000-0000-0000-0000-000000000002', name: '60 Đá Sáng Thế',                     price:   20000, img: 'assets/images/games/crystals_60.webp',   tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000003', name: '300 + 30 Đá Sáng Thế',               price:   90000, img: 'assets/images/games/crystals_300.webp',  tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000004', name: '980 + 110 Đá Sáng Thế',              price:  270000, img: 'assets/images/games/crystals_980.webp',  tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000005', name: '1980 + 260 Đá Sáng Thế',             price:  570000, img: 'assets/images/games/crystals_1980.webp', tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000006', name: '3280 + 600 Đá Sáng Thế',             price:  950000, img: 'assets/images/games/crystals_3280.webp', tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000007', name: '6480 + 1600 Đá Sáng Thế',            price: 1850000, img: 'assets/images/games/crystals_6480.webp', tag: 'topup',      desc: '' },
        { id: '10000000-0000-0000-0000-000000000008', name: 'FULL PACK GENSHIN IMPACT',           price: 3800000, img: 'assets/images/games/genshin_icon.webp',  tag: 'topup',      desc: 'Toàn bộ gói nạp lớn nhất' }
    ],
    'genshin-login': 'genshin',

    // ---------- HONKAI STAR RAIL ----------
    'hsr': [
        { id: '20000000-0000-0000-0000-000000000001', name: 'Thẻ Tháng Express Supply Pass', price:   75000, img: 'assets/images/games/hsr_pass.webp',   tag: 'monthly',    desc: 'Thẻ tháng 30 ngày' },
        { id: '20000000-0000-0000-0000-000000000002', name: '60 Mộng Cảnh',                 price:   17000, img: 'assets/images/games/hsr_60.webp',    tag: 'topup',      desc: '' },
        { id: '20000000-0000-0000-0000-000000000003', name: '300 + 30 Mộng Cảnh',           price:   75000, img: 'assets/images/games/hsr_300.webp',   tag: 'topup',      desc: '' },
        { id: '20000000-0000-0000-0000-000000000004', name: '980 + 110 Mộng Cảnh',          price:  218000, img: 'assets/images/games/hsr_980.webp',   tag: 'topup',      desc: '' },
        { id: '20000000-0000-0000-0000-000000000005', name: '1980 + 260 Mộng Cảnh',         price:  436000, img: 'assets/images/games/hsr_1980.webp',  tag: 'topup',      desc: '' },
        { id: '20000000-0000-0000-0000-000000000006', name: '3280 + 600 Mộng Cảnh',         price:  726000, img: 'assets/images/games/hsr_3280.webp',  tag: 'topup',      desc: '' },
        { id: '20000000-0000-0000-0000-000000000007', name: '6480 + 1600 Mộng Cảnh',        price: 1452000, img: 'assets/images/games/hsr_6480.webp',  tag: 'topup',      desc: '' },
        { id: '20000000-0000-0000-0000-000000000008', name: 'Nameless Glory (Battle Pass)',  price:  180000, img: 'assets/images/games/hsr_bp.webp',    tag: 'battlepass', desc: 'Battle Pass' }
    ],
    'hsr-login': 'hsr',

    // ---------- ZENLESS ZONE ZERO ----------
    'zzz': [
        { id: '30000000-0000-0000-0000-000000000001', name: 'Thẻ Tháng Ổn Định (30 ngày)', price:   80000, img: 'assets/images/games/zzz_pass.webp',  tag: 'monthly',    desc: 'Thẻ tháng 30 ngày' },
        { id: '30000000-0000-0000-0000-000000000002', name: '60 Polychrome',               price:   18000, img: 'assets/images/games/zzz_60.webp',   tag: 'topup',      desc: '' },
        { id: '30000000-0000-0000-0000-000000000003', name: '300 + 30 Polychrome',         price:   85000, img: 'assets/images/games/zzz_300.webp',  tag: 'topup',      desc: '' },
        { id: '30000000-0000-0000-0000-000000000004', name: '980 + 110 Polychrome',        price:  250000, img: 'assets/images/games/zzz_980.webp',  tag: 'topup',      desc: '' },
        { id: '30000000-0000-0000-0000-000000000005', name: '1980 + 260 Polychrome',       price:  500000, img: 'assets/images/games/zzz_1980.webp', tag: 'topup',      desc: '' },
        { id: '30000000-0000-0000-0000-000000000006', name: '3280 + 600 Polychrome',       price:  830000, img: 'assets/images/games/zzz_3280.webp', tag: 'topup',      desc: '' },
        { id: '30000000-0000-0000-0000-000000000007', name: '6480 + 1600 Polychrome',      price: 1660000, img: 'assets/images/games/zzz_6480.webp', tag: 'topup',      desc: '' }
    ],
    'zzz-login': 'zzz',

    // ---------- WUTHERING WAVES ----------
    'wuwa': [
        { id: '40000000-0000-0000-0000-000000000001', name: 'Lunite Subscription (Thẻ Tháng)', price:   80000, img: 'assets/images/games/wuwa_pass.webp', tag: 'monthly',    desc: 'Thẻ tháng 30 ngày' },
        { id: '40000000-0000-0000-0000-000000000002', name: '60 Astrite',                       price:   17000, img: 'assets/images/games/wuwa_60.webp',   tag: 'topup',      desc: '' },
        { id: '40000000-0000-0000-0000-000000000003', name: '300 + 30 Astrite',                 price:   80000, img: 'assets/images/games/wuwa_300.webp',  tag: 'topup',      desc: '' },
        { id: '40000000-0000-0000-0000-000000000004', name: '980 + 110 Astrite',                price:  240000, img: 'assets/images/games/wuwa_980.webp',  tag: 'topup',      desc: '' },
        { id: '40000000-0000-0000-0000-000000000005', name: '1980 + 260 Astrite',               price:  480000, img: 'assets/images/games/wuwa_1980.webp', tag: 'topup',      desc: '' },
        { id: '40000000-0000-0000-0000-000000000006', name: '3280 + 600 Astrite',               price:  800000, img: 'assets/images/games/wuwa_3280.webp', tag: 'topup',      desc: '' },
        { id: '40000000-0000-0000-0000-000000000007', name: '6480 + 1600 Astrite',              price: 1600000, img: 'assets/images/games/wuwa_6480.webp', tag: 'topup',      desc: '' }
    ],
    'wuwa-login': 'wuwa',

    // ---------- DEFAULT fallback ----------
    'default': [
        { id: '10000000-0000-0000-0000-000000000001', name: 'Gói nạp mặc định', price: 85000, img: 'assets/images/logo.jpg', tag: 'monthly', desc: '' }
    ]
};

const FAKE_REVIEWS = [
    { name: 'Li**Nguyen',  stars: 5, text: 'Nạp nhanh lắm, tầm 3 phút là có rồi. Giá rẻ hơn nạp trực tiếp, sẽ ủng hộ tiếp.', date: '2 ngày trước' },
    { name: 'Du**Dat',     stars: 5, text: 'Admin nhiệt tình, bill rõ ràng. Đã nạp 3 lần rồi lần nào cũng ổn.', date: '5 ngày trước' },
    { name: 'Nh**Huyen',   stars: 5, text: 'Uy tín, giao dịch an toàn. Mình lo lúc đầu nhưng kết quả rất tốt!', date: '1 tuần trước' }
];

const FAKE_ORDERS = [
    { user: 'Hi*****an', game: 'Genshin Impact',    pkg: '980 Đá Sáng Thế',      price: '270.000đ', time: '2 phút trước' },
    { user: 'T*****ng',  game: 'Honkai Star Rail',  pkg: '300+30 Mộng Cảnh',     price: '75.000đ',  time: '8 phút trước' },
    { user: 'Ng*****eu', game: 'Wuthering Waves',   pkg: '60 Astrite',           price: '17.000đ',  time: '15 phút trước' },
    { user: 'Me*****Me', game: 'Valorant',           pkg: '1050 VP',              price: '200.000đ', time: '22 phút trước' },
    { user: 'Da*****rk', game: 'Mobile Legends',    pkg: '500 Kim Cương',        price: '115.000đ', time: '1 giờ trước' }
];

// ==========================================
// 2. TICKER
// ==========================================
async function initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    let ordersList = FAKE_ORDERS;
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('orders')
                .select('*')
                .ilike('content', '%[Nạp Game]%')
                .order('created_at', { ascending: false })
                .limit(10);

            if (!error && data && data.length > 0) {
                ordersList = data.map(o => {
                    const renter = o.renter_name || 'Khách';
                    const parts = o.content ? o.content.split('\n') : [];
                    let pkg = 'Gói nạp';
                    if (parts[0]) {
                        const m = parts[0].match(/\]\s+\[Nạp Game\]\s+(.*)/i);
                        if (m) pkg = m[1];
                    }
                    let game = 'Game';
                    if (parts[1] && parts[1].includes('Game:')) {
                        game = parts[1].replace('Game:', '').trim();
                    }
                    return {
                        user: renter.length > 3 ? renter.substring(0,2) + '***' + renter.slice(-1) : renter + '***',
                        game: game,
                        pkg: pkg,
                        price: (o.price ? parseInt(o.price).toLocaleString('vi-VN') : '0') + ' đ',
                        time: typeof timeAgo === 'function' ? timeAgo(o.created_at) : 'Vừa xong'
                    };
                });
            }
        } catch (err) {
            console.error('Ticker err:', err);
        }
    }

    const html = ordersList.map(o => `
        <span class="ticker-item">
            <span class="ticker-avatar">${o.user[0].toUpperCase()}</span>
            <b>${o.user}</b> vừa nạp <b>${o.game}</b> · ${o.pkg}
            <span class="ticker-price" style="color:var(--ng-hot); font-weight:bold; margin-left:8px;">${o.price}</span>
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
    { u: 'Hi*****an', g: 'Genshin Impact',    p: '270.000đ' },
    { u: 'Ti*****ng', g: 'Honkai Star Rail',  p: '75.000đ' },
    { u: 'Mi*****i',  g: 'Wuthering Waves',   p: '480.000đ' },
    { u: 'Da*****rk', g: 'Zenless Zone Zero', p: '250.000đ' }
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
            <strong>${d.u}</strong> vừa nạp<br>
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
    renderHorizontal(GAMES_CATALOG.login, 'gridLogin');

    // Update all Zalo links
    document.querySelectorAll('a[href*="zalo.me"]').forEach(a => a.href = ZALO_LINK);

    // Tab filters
    document.querySelectorAll('.ng-cat-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ng-cat-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            const loginSec = document.getElementById('sectionLogin');
            const featSec  = document.getElementById('sectionFeatured');
            if (f === 'all') {
                renderPortrait(GAMES_CATALOG.featured);
                if (loginSec) loginSec.style.display = '';
                if (featSec) featSec.style.display = '';
            } else if (f === 'hot') {
                renderPortrait(GAMES_CATALOG.featured.filter(g => g.badge === 'HOT' || g.badge === 'NEW'));
                if (loginSec) loginSec.style.display = 'none';
                if (featSec) featSec.style.display = '';
            }
        });
    });

    // Search
    const searchInput = document.getElementById('gameSearch');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const q = e.target.value.toLowerCase().trim();
            document.querySelectorAll('.ng-card-hz, .ng-card-portrait').forEach(card => {
                const titleEl = card.querySelector('.ng-card-hz-title, .ng-card-portrait-title');
                const name = (titleEl || {}).innerText || '';
                card.style.display = name.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    // Social proof popup
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
                <div style="color:#aaa; font-size:12px; margin-top:8px; display:flex; justify-content:space-between;">
                    <span><i class="fa-solid fa-star" style="color:#eab308;"></i> ${g.rating || '5.0'}</span>
                    <span>Đã bán: ${g.sold || '2.3K'}</span>
                </div>
            </div>
        </a>
    `).join('');
}

function renderHorizontal(data, containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = data.map(g => `
        <a href="napgame-detail.html?game=${g.id}" class="ng-card-hz">
            <img src="${g.icon}" class="ng-card-hz-icon" onerror="this.src='assets/images/logo.jpg'">
            <div class="ng-card-hz-info">
                <div class="ng-card-hz-title">${g.name}</div>
                <div class="ng-card-hz-sub">${g.sub}</div>
                <div class="ng-card-hz-badges">
                    <span class="ng-card-hz-badge badge-login">Login</span>
                    <span class="ng-card-hz-badge" style="background:rgba(255,255,255,0.05); color:#999; border:none;">Đã bán: ${g.sold || '1.1K'}</span>
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

    const gameInfo = GAME_INFO[currentGameId] || GAME_INFO['default'];

    // Resolve packages — follow aliases
    let pkgData = GAME_PACKAGES[currentGameId];
    if (typeof pkgData === 'string') pkgData = GAME_PACKAGES[pkgData];
    if (!pkgData) pkgData = GAME_PACKAGES['default'];
    const packages = pkgData;

    // Page title + breadcrumb
    document.title = `${gameInfo.name} - Nạp Game | NAMCUMZ`;
    const bcEl = document.getElementById('breadcrumbGame');
    if (bcEl) bcEl.textContent = gameInfo.name;

    // Game header
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
        badgeEl.textContent = 'Nạp Login';
        badgeEl.className = 'ng-detail-type-badge ng-type-login';
    }

    // Pre-fill phone if logged in
    if (window.currentUser) {
        const phEl = document.getElementById('formPhone');
        if (phEl && !phEl.value) phEl.value = window.currentUser.phone || '';
    }

    // Render packages + tabs
    renderPackages(packages, 'all');
    document.querySelectorAll('.ng-tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ng-tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTabFilter = btn.dataset.tab;
            renderPackages(packages, activeTabFilter);
        });
    });

    // Zalo buttons
    document.querySelectorAll('.ng-btn-zalo').forEach(btn => {
        btn.onclick = () => window.open(ZALO_LINK, '_blank');
    });

    // FAQ Accordion
    document.querySelectorAll('.ng-faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const isActive = btn.classList.contains('active');
            document.querySelectorAll('.ng-faq-question').forEach(b => b.classList.remove('active'));
            if (!isActive) btn.classList.add('active');
        });
    });

    renderReviews();
}

function renderPackages(packages, filter) {
    const grid = document.getElementById('pkgGrid');
    if (!grid) return;
    const filtered = filter === 'all' ? packages : packages.filter(p => p.tag === filter);
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;padding:32px;">Không có gói nào trong danh mục này.</div>';
        return;
    }
    grid.innerHTML = filtered.map(pkg => `
        <div class="ng-pkg-card" onclick="selectDetailPackage(${JSON.stringify(pkg).replace(/"/g, '&quot;')}, this)">
            ${pkg.tag === 'monthly' ? '<div class="ng-pkg-badge">Thẻ Tháng</div>' : pkg.tag === 'battlepass' ? '<div class="ng-pkg-badge">BP</div>' : ''}
            <img src="${pkg.img}" class="ng-pkg-img" onerror="this.src='assets/images/logo.jpg'">
            <span class="ng-pkg-name">${pkg.name}</span>
            <span class="ng-pkg-price">${pkg.price.toLocaleString('vi-VN')} đ</span>
        </div>
    `).join('');

    // Re-highlight if already selected
    if (currentSelectedPackage) {
        document.querySelectorAll('.ng-pkg-card').forEach(card => {
            const nameEl = card.querySelector('.ng-pkg-name');
            if (nameEl && nameEl.textContent === currentSelectedPackage.name) card.classList.add('selected');
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

    const emptyCt  = document.getElementById('emptyCart');
    const filledCt = document.getElementById('filledCart');
    if (emptyCt)  emptyCt.style.display  = 'none';
    if (filledCt) filledCt.style.display = '';

    const nameEl  = document.getElementById('cartPkgName');
    const priceEl = document.getElementById('cartPkgPrice');
    const totalEl = document.getElementById('cartTotalPrice');
    const imgEl   = document.getElementById('cartPkgImg');
    const btnEl   = document.getElementById('btnSubmitOrder');

    if (nameEl)  nameEl.textContent  = currentSelectedPackage.name;
    if (priceEl) priceEl.textContent = priceStr;
    if (totalEl) totalEl.textContent = priceStr;
    if (imgEl)   { imgEl.src = currentSelectedPackage.img; imgEl.onerror = () => imgEl.src = 'assets/images/logo.jpg'; }
    if (btnEl)   btnEl.disabled = false;

    const mobilePrice = document.getElementById('mobileBarPrice');
    const mobileBtn   = document.getElementById('mobileBarBtn');
    if (mobilePrice) mobilePrice.textContent = priceStr;
    if (mobileBtn)   mobileBtn.disabled = false;
}

function applyPromo() {
    const code = (document.getElementById('promoInput') || {}).value || '';
    if (!code.trim()) return;
    alert('Mã "' + code.trim() + '" không hợp lệ hoặc đã hết hạn.');
}

// ==========================================
// 7. SUBMIT TOPUP ORDER VIA SECURE RPC
// ==========================================
async function submitDetailOrder() {
    if (!window.currentUser?.id) {
        alert('Vui lòng đăng nhập trước khi tạo đơn nạp game.');
        window.location.href = 'login.html';
        return;
    }
    if (!currentSelectedPackage?.id) {
        return alert('Vui lòng chọn một gói nạp.');
    }

    const server = (document.getElementById('formServer')?.value || 'Asia').trim();
    const loginMethod = (document.getElementById('formLoginMethod')?.value || 'Hoyoverse').trim();
    const account = (document.getElementById('formUsername')?.value || '').trim();
    const password = (document.getElementById('formPassword')?.value || '').trim();
    const phone = (document.getElementById('formPhone')?.value || '').trim();
    const notes = (document.getElementById('formNotes')?.value || '').trim();

    if (!account || !password) {
        return alert('Vui lòng nhập tên đăng nhập và mật khẩu tài khoản game.');
    }
    if (!phone) {
        return alert('Vui lòng nhập số điện thoại Zalo để nhận thông báo và hỗ trợ khi nạp.');
    }

    const btn = document.getElementById('btnSubmitOrder');
    const mobileBtn = document.getElementById('mobileBarBtn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...'; }
    if (mobileBtn) { mobileBtn.disabled = true; mobileBtn.innerHTML = 'Đang xử lý...'; }

    try {
        const client = window.supabaseClient;
        if (!client) throw new Error('Không tìm thấy kết nối hệ thống.');
        const order = await OrderAPI.topup(
            client,
            window.currentUser.id,
            currentSelectedPackage.id,
            server,
            loginMethod,
            account,
            password,
            phone,
            notes
        );
        alert('Tạo đơn nạp game thành công! Đang chuyển đến trang theo dõi đơn hàng.');
        window.location.href = `dashboard.html?tab=history&order=${encodeURIComponent(order.id)}`;
    } catch (err) {
        console.error('Lỗi tạo đơn nạp game:', err);
        alert(err.message || 'Không thể tạo đơn nạp game. Vui lòng kiểm tra lại hoặc liên hệ Zalo.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = originalText; }
        if (mobileBtn) { mobileBtn.disabled = false; mobileBtn.innerHTML = 'Đặt hàng'; }
    }
}

// ==========================================
// INIT ROUTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTicker();
    if (document.getElementById('sliderTrack')) initCatalogPage();
    if (document.getElementById('pkgGrid')) initDetailPage();
    initZaloWidget();
});

// ==========================================
// 8. FLOATING ZALO WIDGET
// ==========================================
function initZaloWidget() {
    const div = document.createElement('div');
    div.innerHTML = `
        <a href="https://zalo.me/0763550673" target="_blank" style="
            position: fixed; bottom: 90px; right: 20px; z-index: 9999;
            background: #0068ff; color: white; border-radius: 50%;
            width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 4px 15px rgba(0,104,255,0.4); font-size: 30px;
            animation: bounceZalo 2s infinite; text-decoration: none;
        ">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/1200px-Icon_of_Zalo.svg.png" style="width:35px; height:35px;" alt="Zalo">
        </a>
        <style>
            @keyframes bounceZalo { 
                0%, 100% { transform: translateY(0); } 
                50% { transform: translateY(-10px); } 
            }
            @media (min-width: 993px) {
                a[href*="zalo.me/0763550673"] { bottom: 20px !important; }
            }
        </style>
    `;
    document.body.appendChild(div);
}
