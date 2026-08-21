/**
 * NAP GAME LOGIC - NAMCUMZ (V3)
 * 2-page: Catalog (napgame.html) + Detail (napgame-detail.html)
 */

const ZALO_LINK = 'https://zalo.me/0763550673';

// ==========================================
// 1. GAME DATA
// ==========================================
const GAMES_CATALOG = {
    featured: [
        { id: 'genshin-login', name: 'Genshin Impact',    image: 'assets/images/games/genshin.webp',  badge: 'HOT', badgeCls: 'badge-hot', filter: 'login' },
        { id: 'hsr-login',     name: 'Honkai Star Rail',  image: 'assets/images/games/hsr.webp',      badge: 'HOT', badgeCls: 'badge-hot', filter: 'login' },
        { id: 'zzz-login',     name: 'Zenless Zone Zero', image: 'assets/images/games/zzz.webp',      badge: 'NEW', badgeCls: 'badge-new', filter: 'login' },
        { id: 'wuwa-login',    name: 'Wuthering Waves',   image: 'assets/images/games/wuwa.webp',     badge: '',    badgeCls: '',          filter: 'login' }
    ],
    uid: [
        { id: 'genshin', name: 'Genshin Impact',              sub: 'Nap qua UID', discount: '-10%', icon: 'assets/images/games/genshin_icon.webp' },
        { id: 'hsr',     name: 'Honkai Star Rail',            sub: 'Nap qua UID', discount: '-20%', icon: 'assets/images/games/hsr_icon.webp' },
        { id: 'wuwa',    name: 'Wuthering Waves',             sub: 'Nap qua UID', discount: '-15%', icon: 'assets/images/games/wuwa_icon.webp' },
        { id: 'zzz',     name: 'Zenless Zone Zero',           sub: 'Nap qua UID', discount: '-20%', icon: 'assets/images/games/zzz_icon.webp' },
        { id: 'hi3',     name: 'Honkai Impact 3rd',           sub: 'Nap qua UID', discount: '-20%', icon: 'assets/images/games/hi3_icon.webp' },
        { id: 'pgr',     name: 'Punishing Gray Raven',        sub: 'Nap qua UID', discount: '-10%', icon: 'assets/images/games/pgr_icon.webp' },
        { id: 'ba',      name: 'Blue Archive',                sub: 'Nap qua UID', discount: '-15%', icon: 'assets/images/games/ba_icon.webp' },
        { id: 'id-v',    name: 'Identity V',                  sub: 'Nap qua UID', discount: '-10%', icon: 'assets/images/games/idv_icon.webp' },
        { id: 'honor',   name: 'Honor of Kings Quoc Te',      sub: 'Nap qua UID', discount: '-15%', icon: 'assets/images/games/honor_icon.webp' },
        { id: 'lad',     name: 'Love & Deepspace',            sub: 'Nap qua UID', discount: '-10%', icon: 'assets/images/games/lad_icon.webp' },
        { id: 'ptn',     name: 'Path to Nowhere',             sub: 'Nap qua UID', discount: '-10%', icon: 'assets/images/games/ptn_icon.webp' },
        { id: 'hpmw',    name: 'Harry Potter Magic Awakened', sub: 'Nap qua UID', discount: '-10%', icon: 'assets/images/games/hpmw_icon.webp' }
    ],
    login: [
        { id: 'genshin-login', name: 'Genshin Impact',             sub: 'Nap Login \u2022 Re hon UID 15%', discount: '-15%', icon: 'assets/images/games/genshin_icon.webp' },
        { id: 'hsr-login',     name: 'Honkai Star Rail',           sub: 'Nap Login',                       discount: '-30%', icon: 'assets/images/games/hsr_icon.webp' },
        { id: 'wuwa-login',    name: 'Wuthering Waves',            sub: 'Nap Login',                       discount: '-15%', icon: 'assets/images/games/wuwa_icon.webp' },
        { id: 'zzz-login',     name: 'Zenless Zone Zero',          sub: 'Nap Login',                       discount: '-20%', icon: 'assets/images/games/zzz_icon.webp' },
        { id: 'thientinh',     name: 'Thien Tinh Ky Vu',           sub: 'Nap Login',                       discount: '-20%', icon: 'assets/images/games/thientinh_icon.webp' },
        { id: 'valo',          name: 'Valorant',                   sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/valorant_icon.webp' },
        { id: 'lol',           name: 'League of Legends',          sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/lol_icon.webp' },
        { id: 'mlbb',          name: 'Mobile Legends Bang Bang',   sub: 'Nap Login',                       discount: '-15%', icon: 'assets/images/games/mlbb_icon.webp' },
        { id: 'cnz',           name: 'Chaos Zero Nightmare',       sub: 'Nap Login',                       discount: '-15%', icon: 'assets/images/games/cnz_icon.webp' },
        { id: 'gfl2',          name: 'Girls Frontline 2 Exilium',  sub: 'Nap Login',                       discount: '-20%', icon: 'assets/images/games/gfl2_icon.webp' },
        { id: 'ba-login',      name: 'Blue Archive',               sub: 'Nap Login',                       discount: '-15%', icon: 'assets/images/games/ba_icon.webp' },
        { id: 'arknights',     name: 'Arknights',                  sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/arknights_icon.webp' },
        { id: 'skycotl',       name: 'Sky: Child of the Light',    sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/sky_icon.webp' },
        { id: 'biubia',        name: 'Biu La Dai Luc: San Hen',    sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/biubia_icon.webp' },
        { id: 'pgr-login',     name: 'Punishing Gray Raven',       sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/pgr_icon.webp' },
        { id: 'rev1999',       name: 'Reverse: 1999',              sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/rev1999_icon.webp' },
        { id: 'nen2eve',       name: 'Neverness to Everness',      sub: 'Nap Login',                       discount: '-15%', icon: 'assets/images/games/nen2eve_icon.webp' },
        { id: 'dislyte',       name: 'Dislyte',                    sub: 'Nap Login',                       discount: '-10%', icon: 'assets/images/games/dislyte_icon.webp' }
    ]
};

const GAME_INFO = {
    'genshin':       { name: 'Genshin Impact (Nap UID)',              icon: 'assets/images/games/genshin_icon.webp',   rating: '5.0', sold: '9.777 da ban', type: 'uid',   sold_n: 9777 },
    'genshin-login': { name: 'Genshin Impact (Login - Re hon UID)', icon: 'assets/images/games/genshin_icon.webp',   rating: '5.0', sold: '9.777 da ban', type: 'login', sold_n: 9777 },
    'hsr':           { name: 'Honkai Star Rail (Nap UID)',            icon: 'assets/images/games/hsr_icon.webp',       rating: '4.9', sold: '5.412 da ban', type: 'uid',   sold_n: 5412 },
    'hsr-login':     { name: 'Honkai Star Rail (Nap Login)',          icon: 'assets/images/games/hsr_icon.webp',       rating: '4.9', sold: '5.412 da ban', type: 'login', sold_n: 5412 },
    'zzz':           { name: 'Zenless Zone Zero (Nap UID)',           icon: 'assets/images/games/zzz_icon.webp',       rating: '5.0', sold: '3.200 da ban', type: 'uid',   sold_n: 3200 },
    'zzz-login':     { name: 'Zenless Zone Zero (Nap Login)',         icon: 'assets/images/games/zzz_icon.webp',       rating: '5.0', sold: '3.200 da ban', type: 'login', sold_n: 3200 },
    'wuwa':          { name: 'Wuthering Waves (Nap UID)',             icon: 'assets/images/games/wuwa_icon.webp',      rating: '5.0', sold: '4.100 da ban', type: 'uid',   sold_n: 4100 },
    'wuwa-login':    { name: 'Wuthering Waves (Nap Login)',           icon: 'assets/images/games/wuwa_icon.webp',      rating: '5.0', sold: '4.100 da ban', type: 'login', sold_n: 4100 },
    'thientinh':     { name: 'Thien Tinh Ky Vu (Nap Login)',         icon: 'assets/images/games/thientinh_icon.webp', rating: '5.0', sold: '1.200 da ban', type: 'login', sold_n: 1200 },
    'valo':          { name: 'Valorant (Nap Login)',                  icon: 'assets/images/games/valorant_icon.webp',  rating: '4.8', sold: '2.800 da ban', type: 'login', sold_n: 2800 },
    'lol':           { name: 'League of Legends (Nap Login)',         icon: 'assets/images/games/lol_icon.webp',       rating: '4.8', sold: '3.100 da ban', type: 'login', sold_n: 3100 },
    'mlbb':          { name: 'Mobile Legends (Nap Login)',            icon: 'assets/images/games/mlbb_icon.webp',      rating: '4.9', sold: '6.500 da ban', type: 'login', sold_n: 6500 },
    'gfl2':          { name: 'Girls Frontline 2 Exilium (Nap Login)', icon: 'assets/images/games/gfl2_icon.webp',      rating: '5.0', sold: '1.500 da ban', type: 'login', sold_n: 1500 },
    'ba-login':      { name: 'Blue Archive (Nap Login)',              icon: 'assets/images/games/ba_icon.webp',        rating: '4.9', sold: '2.000 da ban', type: 'login', sold_n: 2000 },
    'arknights':     { name: 'Arknights (Nap Login)',                 icon: 'assets/images/games/arknights_icon.webp', rating: '4.9', sold: '1.800 da ban', type: 'login', sold_n: 1800 },
    'default':       { name: 'Game Top-up',                           icon: 'assets/images/logo.jpg',                  rating: '5.0', sold: '100+ da ban',   type: 'uid',   sold_n: 100  }
};

// ============================================================
// GAME PACKAGES — Genshin tu menu thuc te cua NAMCUMZ
// Gia tham khao: https://namcumz.com | Zalo: 0763550673
// ============================================================
const GAME_PACKAGES = {
    // ---------- GENSHIN IMPACT — the & pack da ----------
    // Gia theo bieu do menu goc cua Nguyen Hoang Nam
    'genshin': [
        { id: 'g-welkin',   name: 'Khong Nguyet Chuc Phuc',  price:   85000,  img: 'assets/images/games/welkin.webp',        tag: 'monthly',    desc: 'The thang 30 ngay — 90 da/ngay' },
        { id: 'g-60',       name: '60 Da Sang The',           price:   20000,  img: 'assets/images/games/crystals_60.webp',   tag: 'topup',      desc: '' },
        { id: 'g-300',      name: '300 + 30 Da Sang The',     price:   90000,  img: 'assets/images/games/crystals_300.webp',  tag: 'topup',      desc: '' },
        { id: 'g-980',      name: '980 + 110 Da Sang The',    price:  270000,  img: 'assets/images/games/crystals_980.webp',  tag: 'topup',      desc: '' },
        { id: 'g-1980',     name: '1980 + 260 Da Sang The',   price:  570000,  img: 'assets/images/games/crystals_1980.webp', tag: 'topup',      desc: '' },
        { id: 'g-3280',     name: '3280 + 600 Da Sang The',   price:  950000,  img: 'assets/images/games/crystals_3280.webp', tag: 'topup',      desc: '' },
        { id: 'g-6480',     name: '6480 + 1600 Da Sang The',  price: 1850000,  img: 'assets/images/games/crystals_6480.webp', tag: 'topup',      desc: '' },
        { id: 'g-fullpack', name: 'FULL PACK GENSHIN',         price: 3800000,  img: 'assets/images/games/genshin_icon.webp',  tag: 'topup',      desc: 'Toan bo goi nap lon nhat' }
    ],
    'genshin-login': 'genshin',   // alias — dung chung goi voi genshin UID

    // ---------- HONKAI STAR RAIL ----------
    'hsr': [
        { id: 'hsr-pass',  name: 'The Thang Express Supply',   price:   75000,  img: 'assets/images/games/hsr_pass.webp',   tag: 'monthly',    desc: 'The thang 30 ngay' },
        { id: 'hsr-60',    name: '60 Mong Canh',               price:   17000,  img: 'assets/images/games/hsr_60.webp',    tag: 'topup',      desc: '' },
        { id: 'hsr-300',   name: '300 + 30 Mong Canh',         price:   75000,  img: 'assets/images/games/hsr_300.webp',   tag: 'topup',      desc: '' },
        { id: 'hsr-980',   name: '980 + 110 Mong Canh',        price:  218000,  img: 'assets/images/games/hsr_980.webp',   tag: 'topup',      desc: '' },
        { id: 'hsr-1980',  name: '1980 + 260 Mong Canh',       price:  436000,  img: 'assets/images/games/hsr_1980.webp',  tag: 'topup',      desc: '' },
        { id: 'hsr-3280',  name: '3280 + 600 Mong Canh',       price:  726000,  img: 'assets/images/games/hsr_3280.webp',  tag: 'topup',      desc: '' },
        { id: 'hsr-6480',  name: '6480 + 1600 Mong Canh',      price: 1452000,  img: 'assets/images/games/hsr_6480.webp',  tag: 'topup',      desc: '' },
        { id: 'hsr-bp',    name: 'Nameless Glory (Battle Pass)',price:  180000,  img: 'assets/images/games/hsr_bp.webp',    tag: 'battlepass', desc: 'Battle Pass' }
    ],
    'hsr-login': 'hsr',

    // ---------- ZENLESS ZONE ZERO ----------
    'zzz': [
        { id: 'zzz-pass',  name: 'The Thang On Dinh (30 ngay)',price:   80000,  img: 'assets/images/games/zzz_pass.webp',  tag: 'monthly',    desc: 'The thang 30 ngay' },
        { id: 'zzz-60',    name: '60 Polychrome',               price:   18000,  img: 'assets/images/games/zzz_60.webp',   tag: 'topup',      desc: '' },
        { id: 'zzz-300',   name: '300 + 30 Polychrome',         price:   85000,  img: 'assets/images/games/zzz_300.webp',  tag: 'topup',      desc: '' },
        { id: 'zzz-980',   name: '980 + 110 Polychrome',        price:  250000,  img: 'assets/images/games/zzz_980.webp',  tag: 'topup',      desc: '' },
        { id: 'zzz-1980',  name: '1980 + 260 Polychrome',       price:  500000,  img: 'assets/images/games/zzz_1980.webp', tag: 'topup',      desc: '' },
        { id: 'zzz-3280',  name: '3280 + 600 Polychrome',       price:  830000,  img: 'assets/images/games/zzz_3280.webp', tag: 'topup',      desc: '' },
        { id: 'zzz-6480',  name: '6480 + 1600 Polychrome',      price: 1660000,  img: 'assets/images/games/zzz_6480.webp', tag: 'topup',      desc: '' }
    ],
    'zzz-login': 'zzz',

    // ---------- WUTHERING WAVES ----------
    'wuwa': [
        { id: 'wuwa-pass', name: 'Lunite Subscription',         price:   80000,  img: 'assets/images/games/wuwa_pass.webp', tag: 'monthly',    desc: 'The thang 30 ngay' },
        { id: 'wuwa-60',   name: '60 Astrite',                  price:   17000,  img: 'assets/images/games/wuwa_60.webp',   tag: 'topup',      desc: '' },
        { id: 'wuwa-300',  name: '300 + 30 Astrite',            price:   80000,  img: 'assets/images/games/wuwa_300.webp',  tag: 'topup',      desc: '' },
        { id: 'wuwa-980',  name: '980 + 110 Astrite',           price:  240000,  img: 'assets/images/games/wuwa_980.webp',  tag: 'topup',      desc: '' },
        { id: 'wuwa-1980', name: '1980 + 260 Astrite',          price:  480000,  img: 'assets/images/games/wuwa_1980.webp', tag: 'topup',      desc: '' },
        { id: 'wuwa-3280', name: '3280 + 600 Astrite',          price:  800000,  img: 'assets/images/games/wuwa_3280.webp', tag: 'topup',      desc: '' },
        { id: 'wuwa-6480', name: '6480 + 1600 Astrite',         price: 1600000,  img: 'assets/images/games/wuwa_6480.webp', tag: 'topup',      desc: '' }
    ],
    'wuwa-login': 'wuwa',

    // ---------- DEFAULT fallback ----------
    'default': [
        { id: 'd-1', name: 'Goi Nap Nho',     price:  20000, img: 'assets/images/logo.jpg', tag: 'topup', desc: '' },
        { id: 'd-2', name: 'Goi Nap Vua',     price:  50000, img: 'assets/images/logo.jpg', tag: 'topup', desc: '' },
        { id: 'd-3', name: 'Goi Nap Cao Cap', price: 100000, img: 'assets/images/logo.jpg', tag: 'topup', desc: '' }
    ]
};

const FAKE_REVIEWS = [
    { name: 'Li**Nguyen',  stars: 5, text: 'Nap nhanh lam, tam 3 phut la co roi. Gia re hon nap truc tiep, se ung ho tiep.', date: 'Day 2 ngay' },
    { name: 'Du**Dat',     stars: 5, text: 'Admin nhiet tinh, bill ro rang. Da nap 3 lan roi lan nao cung on.', date: 'Day 5 ngay' },
    { name: 'Nh**Huyen',   stars: 5, text: 'Uy tin, giao dich an toan. Minh lo luc dau nhung ket qua rat tot!', date: '1 tuan truoc' }
];

const FAKE_ORDERS = [
    { user: 'Hi*****an', game: 'Genshin Impact',    pkg: '980 Da Sang The',      price: '270.000d', time: '2 phut truoc' },
    { user: 'T*****ng',  game: 'Honkai Star Rail',  pkg: '300+30 Mong Canh',     price: '75.000d',  time: '8 phut truoc' },
    { user: 'Ng*****eu', game: 'Wuthering Waves',   pkg: '60 Astrite',           price: '17.000d',  time: '15 phut truoc' },
    { user: 'Me*****Me', game: 'Valorant',           pkg: '1050 VP',              price: '200.000d', time: '22 phut truoc' },
    { user: 'Da*****rk', game: 'Mobile Legends',    pkg: '500 Kim Cuong',        price: '115.000d', time: '1 gio truoc' }
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
            <b>${o.user}</b> vừa nạp <b>${o.game}</b> \u00b7 ${o.pkg}
            <span class="ticker-price" style="color:var(--ng-hot); font-weight:bold; margin-left:8px;">${o.price}</span>
            <span class="ticker-time">${o.time}</span>
        </span>
    `).join('<span class="ticker-sep">\u2022</span>');
    
    track.innerHTML = html + '<span class="ticker-sep">\u2022</span>' + html;
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
    { u: 'Hi*****an', g: 'Genshin Impact',    p: '270.000d' },
    { u: 'Ti*****ng', g: 'Honkai Star Rail',  p: '75.000d' },
    { u: 'Mi*****i',  g: 'Wuthering Waves',   p: '480.000d' },
    { u: 'Da*****rk', g: 'Zenless Zone Zero', p: '250.000d' }
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
        <button class="ng-social-popup-close" onclick="this.parentElement.remove()">\u2715</button>
        <div class="ng-social-popup-avatar">${d.u[0]}</div>
        <div class="ng-social-popup-text">
            <strong>${d.u}</strong> vua mua<br>
            <span>${d.g}</span> voi gia <span class="ng-social-popup-price">${d.p}</span>
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
    renderHorizontal(GAMES_CATALOG.login, 'gridLogin', 'login');

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
                [loginSec, featSec].forEach(s => s && (s.style.display = ''));
            } else if (f === 'login') {
                loginSec && (loginSec.style.display = '');
                featSec && (featSec.style.display = 'none');
            } else if (f === 'hot') {
                renderPortrait(GAMES_CATALOG.featured.filter(g => g.badge === 'HOT'));
                loginSec && (loginSec.style.display = 'none');
                featSec && (featSec.style.display = '');
            }
        });
    });

    // Search
    const searchInput = document.getElementById('gameSearch');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
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
                <div class="ng-card-portrait-btn">Nap Ngay</div>
                <div style="color:#aaa; font-size:12px; margin-top:8px; display:flex; justify-content:space-between;">
                    <span><i class="fa-solid fa-star" style="color:#eab308;"></i> ${g.rating || '5.0'}</span>
                    <span>Đã bán: ${g.sold || '2.3K'}</span>
                </div>
            </div>
        </a>
    `).join('');
}

function renderHorizontal(data, containerId, type) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    const badgeCls = type === 'login' ? 'badge-login' : 'badge-uid';
    const badgeTxt = type === 'login' ? 'Login' : 'UID';
    grid.innerHTML = data.map(g => `
        <a href="napgame-detail.html?game=${g.id}" class="ng-card-hz">
            <img src="${g.icon}" class="ng-card-hz-icon" onerror="this.src='assets/images/logo.jpg'">
            <div class="ng-card-hz-info">
                <div class="ng-card-hz-title">${g.name}</div>
                <div class="ng-card-hz-sub">${g.sub}</div>
                <div class="ng-card-hz-badges">
                    <span class="ng-card-hz-badge ${badgeCls}">${badgeTxt}</span>
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

    // Resolve packages — handle alias ('genshin-login' -> 'genshin')
    let pkgData = GAME_PACKAGES[currentGameId];
    if (typeof pkgData === 'string') pkgData = GAME_PACKAGES[pkgData]; // follow alias
    if (!pkgData) pkgData = GAME_PACKAGES['default'];
    const packages = pkgData;

    // Page title + breadcrumb
    document.title = `${gameInfo.name} - Nap Game | NAMCUMZ`;
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
        badgeEl.textContent = gameInfo.type === 'login' ? 'Nap Login' : 'Nap UID';
        badgeEl.className = `ng-detail-type-badge ${gameInfo.type === 'login' ? 'ng-type-login' : 'ng-type-uid'}`;
    }

    // No toggle needed since it's login only now

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
            // Close all
            document.querySelectorAll('.ng-faq-question').forEach(b => b.classList.remove('active'));
            // Open clicked if not already active
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
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;padding:32px;">Khong co goi nao trong danh muc nay.</div>';
        return;
    }
    grid.innerHTML = filtered.map(pkg => `
        <div class="ng-pkg-card" onclick="selectDetailPackage(${JSON.stringify(pkg).replace(/"/g, '&quot;')}, this)">
            ${pkg.tag === 'monthly' ? '<div class="ng-pkg-badge">The Thang</div>' : pkg.tag === 'battlepass' ? '<div class="ng-pkg-badge">BP</div>' : ''}
            <img src="${pkg.img}" class="ng-pkg-img" onerror="this.src='assets/images/logo.jpg'">
            <span class="ng-pkg-name">${pkg.name}</span>
            <span class="ng-pkg-price">${pkg.price.toLocaleString('vi-VN')} \u0111</span>
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
                <div class="ng-review-stars">${'\u2605'.repeat(r.stars)}</div>
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
    const priceStr = currentSelectedPackage.price.toLocaleString('vi-VN') + ' \u0111';

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
    alert('Ma "' + code.trim() + '" khong hop le hoac da het han.');
}

function showUidHelp() {
    alert('Huong dan tim UID:\n1. Mo game -> Menu chinh\n2. Chon ho so / Avatar\n3. So UID hien thi ben duoi ten nhan vat\n\nLuu y: UID la day so 9-10 chu so, khong phai username.');
}

// ==========================================
// 7. SUBMIT ORDER SUPABASE
// ==========================================
async function submitDetailOrder() {
    if (!currentSelectedPackage) return alert('Vui long chon 1 goi nap!');
    const gameInfo = GAME_INFO[currentGameId] || GAME_INFO['default'];
    const isLogin  = gameInfo.type === 'login';
    const phone    = (document.getElementById('formPhone') || {}).value?.trim();
    if (!phone) return alert('Vui long nhap SDT Zalo lien he!');
    const user = (document.getElementById('formUsername') || {}).value?.trim();
    const pass = (document.getElementById('formPassword') || {}).value?.trim();
    if (!user || !pass) return alert('Vui lòng nhập Tên đăng nhập và Mật khẩu!');
    const note = 'Login: ' + user + ' | Pass: ' + pass;
    const btnIds = ['btnSubmitOrder', 'mobileBarBtn'];
    const originals = {};
    btnIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) { originals[id] = el.innerHTML; el.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dang xu ly...'; el.disabled = true; }
    });
    try {
        const server = (document.getElementById('formServer') || {}).value || 'Khác';
        const orderCode = 'NG' + Math.floor(Math.random() * 9000 + 1000); // VD: NG5291
        
        const orderData = {
            order_code: orderCode,
            user_id: window.currentUser?.id || null,
            renter_name: localStorage.getItem('username') || 'Khách Nạp Game',
            content: `[${server}] [Nạp Game] ${currentSelectedPackage.name}\nGame: ${gameInfo.name}\nSĐT Zalo: ${phone}\nLogin: ${user} / ${pass}`,
            price: currentSelectedPackage.price,
            status: 'cho_xu_ly',
            booster_name: 'Chưa nhận'
        };
        const { error } = await supabaseClient.from('orders').insert([orderData]);
        if (error) throw error;
        btnIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = '<i class="fa-solid fa-check"></i> Thanh cong!'; el.style.background = '#16a34a'; }
        });
        setTimeout(() => {
            alert('Dat hang thanh cong!\n\nAdmin se lien he qua Zalo ' + phone + ' trong vai phut de xac nhan va huong dan thanh toan.\n\nHoac lien he truc tiep: zalo.me/0763550673');
            window.location.reload();
        }, 1500);
    } catch (err) {
        console.error('Order error:', err);
        alert('Co loi khi tao don hang. Vui long thu lai hoac lien he Zalo: 0763550673');
        btnIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = originals[id]; el.disabled = false; el.style.background = ''; }
        });
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
                /* Fix bottom position for desktop where no bottom bar exists */
                a[href*="zalo.me/0763550673"] { bottom: 20px !important; }
            }
        </style>
    `;
    document.body.appendChild(div);
}
