/**
 * NẠP GAME LOGIC - NAMCUMZ (V2 - 2 Page Architecture)
 */

// ==========================================
// 1. DATA CONFIG
// ==========================================
const GAMES_CATALOG = {
    featured: [
        { id: 'genshin', name: 'Genshin Impact', image: 'assets/images/games/genshin.webp', badge: 'HOT' },
        { id: 'hsr', name: 'Honkai Star Rail', image: 'assets/images/games/hsr.webp', badge: '' },
        { id: 'zzz', name: 'Zenless Zone Zero', image: 'assets/images/games/zzz.webp', badge: 'NEW' },
        { id: 'wuwa', name: 'Wuthering Waves', image: 'assets/images/games/wuwa.webp', badge: '' }
    ],
    uid: [
        { id: 'genshin', name: 'Genshin Impact', sub: 'Nạp qua UID', discount: '-10%', icon: 'assets/images/games/genshin_icon.webp' },
        { id: 'hsr', name: 'Honkai Star Rail', sub: 'Nạp qua UID', discount: '-20%', icon: 'assets/images/games/hsr_icon.webp' },
        { id: 'wuwa', name: 'Wuthering Waves', sub: 'Nạp qua UID', discount: '-15%', icon: 'assets/images/games/wuwa_icon.webp' },
        { id: 'zzz', name: 'Zenless Zone Zero', sub: 'Nạp qua UID', discount: '-20%', icon: 'assets/images/games/zzz_icon.webp' },
        { id: 'hi3', name: 'Honkai Impact 3', sub: 'Nạp qua UID', discount: '-20%', icon: 'assets/images/games/hi3_icon.webp' },
        { id: 'pgr', name: 'Punishing Gray Raven', sub: 'Nạp qua UID', discount: '-10%', icon: 'assets/images/games/pgr_icon.webp' }
    ],
    login: [
        { id: 'genshin-login', name: 'Genshin Impact L.O...', sub: 'Nạp Login (rẻ hơn)', discount: '-20%', icon: 'assets/images/games/genshin_icon.webp' },
        { id: 'hsr-login', name: 'Honkai Star Rail', sub: 'Nạp Login', discount: '-30%', icon: 'assets/images/games/hsr_icon.webp' },
        { id: 'wuwa-login', name: 'Wuthering Waves', sub: 'Nạp Login', discount: '-15%', icon: 'assets/images/games/wuwa_icon.webp' },
        { id: 'zzz-login', name: 'Zenless Zone Zero', sub: 'Nạp Login', discount: '-20%', icon: 'assets/images/games/zzz_icon.webp' },
        { id: 'valo', name: 'Valorant', sub: 'Nạp Login', discount: '-10%', icon: 'assets/images/games/valorant_icon.webp' },
        { id: 'lol', name: 'League of Legends', sub: 'Nạp Login', discount: '-10%', icon: 'assets/images/games/lol_icon.webp' }
    ]
};

const GAME_INFO = {
    'genshin': { name: 'Genshin Impact (Nạp qua UID)', rating: '5.0 (3)', sold: '9777 đã bán', type: 'uid' },
    'genshin-login': { name: 'Genshin Impact (Login rẻ hơn 15%)', rating: '5.0 (3)', sold: '9777 đã bán', type: 'login' },
    'hsr': { name: 'Honkai Star Rail (Nạp qua UID)', rating: '4.9 (12)', sold: '5400 đã bán', type: 'uid' },
    'hsr-login': { name: 'Honkai Star Rail (Nạp Login)', rating: '4.9 (12)', sold: '5400 đã bán', type: 'login' },
    'default': { name: 'Game Top-up', rating: '5.0 (1)', sold: '100+ đã bán', type: 'uid' }
};

const GAME_PACKAGES = {
    'genshin': [
        { id: 'g-60', name: '60 Đá Sáng Thế', price: 17100, img: 'assets/images/games/crystals_60.webp', tag: '' },
        { id: 'g-300', name: '300 + 30 Đá Sáng Thế', price: 80750, img: 'assets/images/games/crystals_300.webp', tag: '' },
        { id: 'g-980', name: '980 + 110 Đá Sáng Thế', price: 242250, img: 'assets/images/games/crystals_980.webp', tag: '' },
        { id: 'g-1980', name: '1980 + 260 Đá Sáng Thế', price: 484500, img: 'assets/images/games/crystals_1980.webp', tag: '' },
        { id: 'g-3280', name: '3280 + 600 Đá Sáng Thế', price: 807500, img: 'assets/images/games/crystals_3280.webp', tag: '' },
        { id: 'g-6480', name: '6480 + 1600 Đá Sáng Thế', price: 1615000, img: 'assets/images/games/crystals_6480.webp', tag: '' },
        { id: 'g-welkin', name: 'Không Nguyệt Chúc Phúc', price: 76500, img: 'assets/images/games/welkin.webp', tag: 'Thẻ tháng' }
    ],
    'default': [
        { id: 'd-1', name: 'Gói Nạp Cơ Bản 1', price: 20000, img: 'assets/images/logo.jpg', tag: '' },
        { id: 'd-2', name: 'Gói Nạp Cơ Bản 2', price: 50000, img: 'assets/images/logo.jpg', tag: '' },
        { id: 'd-3', name: 'Gói Nạp Cao Cấp', price: 100000, img: 'assets/images/logo.jpg', tag: '' }
    ]
};

const FAKE_ORDERS = [
    { user: 'Hi*****an', game: 'Genshin Impact', pkg: '980 Đá Sáng Thế', price: '242.000đ', time: '2 phút trước' },
    { user: 'T*****ng', game: 'MLBB', pkg: '500 Kim Cương', price: '120.000đ', time: '10 phút trước' },
    { user: 'Ng*****êu', game: 'Honkai Star Rail', pkg: '60 Mộng Cảnh', price: '17.000đ', time: '15 phút trước' },
    { user: 'Me*****Me', game: 'Valorant', pkg: '1050 VP', price: '200.000đ', time: '1 giờ trước' }
];

// ==========================================
// 2. SHARED LOGIC (TICKER)
// ==========================================
function initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;
    const itemsHTML = FAKE_ORDERS.map(o => `
        <span class="ticker-item">
            <span class="ticker-avatar">${o.user[0]}</span>
            <b>${o.user}</b> đã mua thành công <b>${o.game}</b> - ${o.pkg}
            <span class="ticker-price">${o.price}</span>
            <span class="ticker-time">${o.time}</span>
        </span>
    `).join('<span class="ticker-sep">•</span>');
    track.innerHTML = itemsHTML + '<span class="ticker-sep">•</span>' + itemsHTML;
}

// ==========================================
// 3. CATALOG PAGE LOGIC
// ==========================================
function initCatalogPage() {
    // Slider Logic
    const track = document.getElementById('sliderTrack');
    const dots = document.querySelectorAll('.ng-dot');
    if (track && dots.length > 0) {
        let currentSlide = 0;
        const totalSlides = dots.length;
        
        function goToSlide(index) {
            currentSlide = index;
            track.style.transform = `translateX(-${currentSlide * 100}%)`;
            dots.forEach(d => d.classList.remove('active'));
            dots[currentSlide].classList.add('active');
        }
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => goToSlide(index));
        });
        
        setInterval(() => {
            goToSlide((currentSlide + 1) % totalSlides);
        }, 5000);
    }
    
    // Render Sections
    const renderSection = (data, containerId, isPortrait) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        data.forEach(g => {
            const el = document.createElement('a');
            el.href = `napgame-detail.html?game=${g.id}`;
            el.className = isPortrait ? 'ng-card-portrait' : 'ng-card-hz';
            
            if (isPortrait) {
                el.innerHTML = `
                    <img src="${g.image}" alt="${g.name}" onerror="this.src='assets/images/logo.jpg'">
                    <div class="ng-card-portrait-info">
                        <div class="ng-card-portrait-title">${g.name}</div>
                        <div class="ng-card-portrait-btn">Nạp Ngay</div>
                    </div>
                `;
            } else {
                el.innerHTML = `
                    <img src="${g.icon}" class="ng-card-hz-icon" onerror="this.src='assets/images/logo.jpg'">
                    <div class="ng-card-hz-info">
                        <div class="ng-card-hz-title">${g.name}</div>
                        <div class="ng-card-hz-sub">${g.sub}</div>
                    </div>
                    <div class="ng-card-hz-badge">Chuyển tiền</div>
                    <div class="ng-card-hz-discount">${g.discount}</div>
                `;
            }
            container.appendChild(el);
        });
    };
    
    renderSection(GAMES_CATALOG.featured, 'gridFeatured', true);
    renderSection(GAMES_CATALOG.uid, 'gridUid', false);
    renderSection(GAMES_CATALOG.login, 'gridLogin', false);
}

// ==========================================
// 4. DETAIL PAGE LOGIC
// ==========================================
let currentSelectedPackage = null;
let currentGameId = 'default';

function initDetailPage() {
    const params = new URLSearchParams(window.location.search);
    currentGameId = params.get('game') || 'default';
    
    // Resolve Fallback
    const gameInfo = GAME_INFO[currentGameId] || GAME_INFO['default'];
    const packages = GAME_PACKAGES[currentGameId] || GAME_PACKAGES['default'];
    
    // Update Header
    document.getElementById('detailGameName').innerText = gameInfo.name;
    document.getElementById('detailRating').innerText = gameInfo.rating;
    document.getElementById('detailSold').innerText = gameInfo.sold;
    
    // Form Toggle based on type (UID vs Login)
    if (gameInfo.type === 'login') {
        document.getElementById('formGroupUid').style.display = 'none';
        document.getElementById('formGroupServer').style.display = 'none';
        document.getElementById('formGroupUsername').style.display = 'block';
        document.getElementById('formGroupPassword').style.display = 'block';
    } else {
        document.getElementById('formGroupUid').style.display = 'block';
        document.getElementById('formGroupServer').style.display = 'block';
        document.getElementById('formGroupUsername').style.display = 'none';
        document.getElementById('formGroupPassword').style.display = 'none';
    }
    
    // Pre-fill phone if logged in
    if (window.currentUser) {
        document.getElementById('formPhone').value = window.currentUser.phone || '';
    }
    
    // Render Packages
    const grid = document.getElementById('pkgGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    packages.forEach(pkg => {
        const card = document.createElement('div');
        card.className = 'ng-pkg-card';
        card.innerHTML = `
            <img src="${pkg.img}" class="ng-pkg-img" onerror="this.src='assets/images/logo.jpg'">
            <span class="ng-pkg-name">${pkg.name}</span>
            <span class="ng-pkg-price">${pkg.price.toLocaleString('vi-VN')} đ</span>
        `;
        card.onclick = () => selectDetailPackage(pkg, card);
        grid.appendChild(card);
    });
}

function selectDetailPackage(pkg, cardElement) {
    currentSelectedPackage = pkg;
    document.querySelectorAll('.ng-pkg-card').forEach(el => el.classList.remove('selected'));
    cardElement.classList.add('selected');
    
    // Update Sticky Summary
    document.getElementById('emptyCart').style.display = 'none';
    document.getElementById('filledCart').style.display = 'block';
    
    document.getElementById('cartPkgName').innerText = pkg.name;
    document.getElementById('cartPkgPrice').innerText = pkg.price.toLocaleString('vi-VN') + ' đ';
    document.getElementById('cartTotalPrice').innerText = pkg.price.toLocaleString('vi-VN') + ' đ';
    
    document.getElementById('btnSubmitOrder').disabled = false;
}

async function submitDetailOrder() {
    if (!currentSelectedPackage) return;
    
    const phone = document.getElementById('formPhone').value.trim();
    const gameInfo = GAME_INFO[currentGameId] || GAME_INFO['default'];
    
    let note = '';
    if (gameInfo.type === 'login') {
        const user = document.getElementById('formUsername').value.trim();
        const pass = document.getElementById('formPassword').value.trim();
        if(!user || !pass) return alert("Vui lòng nhập Tên đăng nhập và Mật khẩu!");
        note = `Login: ${user} | Pass: ${pass}`;
    } else {
        const uid = document.getElementById('formUid').value.trim();
        const server = document.getElementById('formServer').value;
        if(!uid) return alert("Vui lòng nhập UID!");
        note = `UID: ${uid} | Server: ${server}`;
    }
    
    if(!phone) return alert("Vui lòng nhập SĐT Zalo liên hệ!");
    
    const btn = document.getElementById('btnSubmitOrder');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    btn.disabled = true;
    
    try {
        const orderData = {
            user_id: window.currentUser ? window.currentUser.id : null,
            customer_name: window.currentUser ? window.currentUser.email : 'Khách',
            customer_phone: phone,
            game_id: currentGameId,
            game_name: gameInfo.name,
            package_id: currentSelectedPackage.id,
            package_name: currentSelectedPackage.name,
            price: currentSelectedPackage.price,
            uid_ingame: gameInfo.type === 'uid' ? document.getElementById('formUid').value : 'login',
            server: gameInfo.type === 'uid' ? document.getElementById('formServer').value : 'login',
            note: note,
            status: 'pending',
            payment_method: 'manual',
            is_public: true
        };
        
        const { error } = await supabaseClient.from('napgame_orders').insert([orderData]);
        if (error) throw error;
        
        btn.innerHTML = 'Thành công!';
        btn.style.background = '#16a34a';
        setTimeout(() => {
            alert('Đơn hàng đã tạo. Vui lòng liên hệ Admin qua Zalo để thanh toán.');
            window.location.reload();
        }, 1500);
        
    } catch (err) {
        console.error(err);
        alert('Lỗi tạo đơn hàng.');
        btn.innerHTML = 'Thanh toán';
        btn.disabled = false;
    }
}

// ==========================================
// INIT ROUTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTicker();
    if (document.getElementById('sliderTrack')) {
        initCatalogPage(); // We are on Catalog
    } else if (document.getElementById('pkgGrid')) {
        initDetailPage();  // We are on Detail
    }
});
