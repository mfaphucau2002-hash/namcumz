/**
 * NẠP GAME LOGIC - NAMCUMZ
 * 
 * Defines game data, packages, ticker logic, and interactions.
 */

// ==========================================
// 1. GAME DATA CONFIG
// ==========================================
const GAMES_DATA = [
    {
        id: 'genshin',
        name: 'Genshin Impact',
        category: 'pc-mobile', // tags for filtering
        badge: 'HOT',
        badgeClass: 'ribbon-hot',
        minPrice: '20.000đ',
        image: 'assets/images/games/genshin.webp', // Placeholder path
        gradient: 'linear-gradient(to top, rgba(76,29,149,0.9) 0%, rgba(30,58,138,0) 100%)'
    },
    {
        id: 'hsr',
        name: 'Honkai: Star Rail',
        category: 'pc-mobile',
        badge: 'HOT',
        badgeClass: 'ribbon-hot',
        minPrice: '20.000đ',
        image: 'assets/images/games/hsr.webp',
        gradient: 'linear-gradient(to top, rgba(30,27,75,0.9) 0%, rgba(127,29,29,0) 100%)'
    },
    {
        id: 'wuwa',
        name: 'Wuthering Waves',
        category: 'pc-mobile',
        badge: 'NEW',
        badgeClass: 'ribbon-new',
        minPrice: '20.000đ',
        image: 'assets/images/games/wuwa.webp',
        gradient: 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(30,58,95,0) 100%)'
    },
    {
        id: 'mlbb',
        name: 'Mobile Legends',
        category: 'mobile',
        badge: 'HOT',
        badgeClass: 'ribbon-hot',
        minPrice: '20.000đ',
        image: 'assets/images/games/mlbb.webp',
        gradient: 'linear-gradient(to top, rgba(28,25,23,0.9) 0%, rgba(146,64,14,0) 100%)'
    },
    {
        id: 'pubg',
        name: 'PUBG Mobile',
        category: 'mobile',
        badge: '',
        badgeClass: '',
        minPrice: '20.000đ',
        image: 'assets/images/games/pubg.webp',
        gradient: 'linear-gradient(to top, rgba(28,25,23,0.9) 0%, rgba(120,53,15,0) 100%)'
    },
    {
        id: 'lol',
        name: 'League of Legends',
        category: 'pc',
        badge: '',
        badgeClass: '',
        minPrice: '50.000đ',
        image: 'assets/images/games/lol.webp',
        gradient: 'linear-gradient(to top, rgba(30,27,8,0.9) 0%, rgba(59,42,0,0) 100%)'
    },
    {
        id: 'valorant',
        name: 'Valorant',
        category: 'pc',
        badge: '',
        badgeClass: '',
        minPrice: '50.000đ',
        image: 'assets/images/games/valorant.webp',
        gradient: 'linear-gradient(to top, rgba(30,0,0,0.9) 0%, rgba(59,0,0,0) 100%)'
    },
    {
        id: 'fc-online',
        name: 'EA FC Online',
        category: 'pc',
        badge: '',
        badgeClass: '',
        minPrice: '50.000đ',
        image: 'assets/images/games/fc-online.webp',
        gradient: 'linear-gradient(to top, rgba(0,26,58,0.9) 0%, rgba(0,48,135,0) 100%)'
    },
    {
        id: 'lien-quan',
        name: 'Liên Quân Mobile',
        category: 'mobile',
        badge: '',
        badgeClass: '',
        minPrice: '20.000đ',
        image: 'assets/images/games/lien-quan.webp',
        gradient: 'linear-gradient(to top, rgba(26,0,56,0.9) 0%, rgba(45,0,87,0) 100%)'
    },
    {
        id: 'free-fire',
        name: 'Free Fire',
        category: 'mobile',
        badge: '',
        badgeClass: '',
        minPrice: '20.000đ',
        image: 'assets/images/games/free-fire.webp',
        gradient: 'linear-gradient(to top, rgba(28,10,0,0.9) 0%, rgba(59,18,0,0) 100%)'
    }
];

// ==========================================
// 2. TICKER LOGIC
// ==========================================
const FAKE_ORDERS = [
    { user: 'Hi*****an', game: 'Genshin Impact', pkg: '980 Đá Sáng Thế', price: '270.000đ', time: '2 phút trước' },
    { user: 'T*****ng', game: 'MLBB', pkg: '500 Kim Cương', price: '120.000đ', time: '10 phút trước' },
    { user: 'Ng*****êu', game: 'Honkai Star Rail', pkg: '60 Mộng Cảnh', price: '20.000đ', time: '15 phút trước' },
    { user: 'Me*****Me', game: 'Valorant', pkg: '1050 VP', price: '200.000đ', time: '1 giờ trước' },
    { user: 'Da*****rk', game: 'Liên Quân', pkg: 'Sổ Sứ Mệnh', price: '100.000đ', time: '2 giờ trước' }
];

function initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;
    
    // In Phase 1A, we use fake data. Later we will mix with real Supabase data.
    const itemsHTML = FAKE_ORDERS.map(o => `
        <span class="ticker-item">
            <span class="ticker-avatar">${o.user[0]}</span>
            <b>${o.user}</b> đã nạp thành công <b>${o.game}</b> - ${o.pkg}
            <span class="ticker-price">${o.price}</span>
            <span class="ticker-time">${o.time}</span>
        </span>
    `).join('<span class="ticker-sep">•</span>');
    
    // Duplicate for seamless loop
    track.innerHTML = itemsHTML + '<span class="ticker-sep">•</span>' + itemsHTML;
}

// ==========================================
// 3. SLOGAN TYPEWRITER
// ==========================================
const SLOGANS = [
    "Xử lý trong 5 phút — Không chờ đợi ⚡",
    "Nạp game uy tín — An tâm tận hưởng ✨",
    "Giá tốt nhất thị trường — Có bill đầy đủ 💎",
    "Hơn 15.000 đơn hàng thành công 🏆",
    "Bảo mật tuyệt đối — Không lo mất acc 🔒"
];

let sloganIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typeSpeed = 50;

function typeWriter() {
    const el = document.getElementById('heroSlogan');
    if (!el) return;
    
    const currentSlogan = SLOGANS[sloganIndex];
    
    if (isDeleting) {
        el.innerText = currentSlogan.substring(0, charIndex - 1);
        charIndex--;
        typeSpeed = 30;
    } else {
        el.innerText = currentSlogan.substring(0, charIndex + 1);
        charIndex++;
        typeSpeed = 50;
    }
    
    if (!isDeleting && charIndex === currentSlogan.length) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        sloganIndex = (sloganIndex + 1) % SLOGANS.length;
        typeSpeed = 500; // Pause before new word
    }
    
    setTimeout(typeWriter, typeSpeed);
}

// ==========================================
// 4. CSKH WIDGET TOGGLE
// ==========================================
function toggleCSKH() {
    const widget = document.getElementById('cskhWidget');
    if (widget) {
        widget.classList.toggle('open');
    }
}

// Music toggle placeholder
let musicPlaying = false;
function toggleMusic() {
    musicPlaying = !musicPlaying;
    const label = document.getElementById('musicLabel');
    const icon = document.querySelector('button[onclick="toggleMusic()"] i');
    if(label) label.innerText = musicPlaying ? 'Nhạc: ON' : 'Nhạc: Tắt';
    if(icon) {
        icon.className = musicPlaying ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }
    // TODO: implement actual audio playback here later
}

// ==========================================
// 5. PACKAGE DATA (MOCK FOR NOW)
// ==========================================
const GAME_PACKAGES = {
    'genshin': [
        { id: 'genshin-60', name: '60 Đá Sáng Thế', price: 20000, badge: '' },
        { id: 'genshin-300', name: '300+30 Đá Sáng Thế', price: 90000, badge: 'BEST' },
        { id: 'genshin-980', name: '980+110 Đá Sáng Thế', price: 270000, badge: 'HOT' },
        { id: 'genshin-1980', name: '1980+260 Đá', price: 570000, badge: '' },
        { id: 'genshin-3280', name: '3280+600 Đá', price: 950000, badge: '' },
        { id: 'genshin-6480', name: '6480+1600 Đá', price: 1850000, badge: '' },
        { id: 'genshin-welkin', name: 'Không Nguyệt Chúc Phúc', price: 90000, badge: 'HOT' }
    ],
    'hsr': [
        { id: 'hsr-60', name: '60 Mộng Cảnh', price: 20000, badge: '' },
        { id: 'hsr-300', name: '300+30 Mộng Cảnh', price: 90000, badge: 'BEST' },
        { id: 'hsr-980', name: '980+110 Mộng Cảnh', price: 270000, badge: 'HOT' },
        { id: 'hsr-pass', name: 'Thẻ Tháng', price: 90000, badge: 'HOT' }
    ],
    'default': [
        { id: 'def-1', name: 'Gói Nạp Cơ Bản 1', price: 20000, badge: '' },
        { id: 'def-2', name: 'Gói Nạp Cơ Bản 2', price: 50000, badge: '' },
        { id: 'def-3', name: 'Gói Nạp Cao Cấp', price: 100000, badge: 'HOT' }
    ]
};

// ==========================================
// 6. RENDER & FILTER GAMES
// ==========================================
function renderGames(filter = 'all', searchQuery = '') {
    const grid = document.getElementById('gameGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    let filtered = GAMES_DATA.filter(g => {
        const matchFilter = filter === 'all' || 
                            g.category.includes(filter) || 
                            (filter === 'hot' && g.badge === 'HOT');
        const matchSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchFilter && matchSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--lp-text-muted); padding: 40px;">
                            <i class="fa-solid fa-ghost" style="font-size: 32px; margin-bottom: 16px; opacity: 0.5;"></i>
                            <br>Không tìm thấy game phù hợp
                          </div>`;
        return;
    }

    filtered.forEach(g => {
        const viewers = Math.floor(Math.random() * 30) + 5;
        const badgeHTML = g.badge ? `<div class="ng-card-ribbon ${g.badgeClass}">${g.badge}</div>` : '';
        
        const cardHTML = `
            <div class="ng-card" onclick="openNapGameDrawer('${g.id}')">
                ${badgeHTML}
                <div class="ng-card-viewers"><i class="fa-solid fa-eye"></i> ${viewers}</div>
                <div class="ng-card-img-wrap">
                    <img src="${g.image}" alt="${g.name}" class="ng-card-img" onerror="this.src='assets/images/logo.jpg'">
                    <div class="ng-card-overlay" style="background: ${g.gradient}"></div>
                </div>
                <div class="ng-card-content">
                    <div class="ng-card-title">${g.name}</div>
                    <div class="ng-card-price">
                        Bắt đầu từ <b>${g.minPrice}</b>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}

function setupFilters() {
    const filterBtns = document.querySelectorAll('.ng-filter-btn');
    const searchInput = document.querySelector('.ng-search-input');
    
    let currentFilter = 'all';
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const text = e.currentTarget.innerText.toLowerCase();
            if (text.includes('tất cả')) currentFilter = 'all';
            else if (text.includes('mobile')) currentFilter = 'mobile';
            else if (text.includes('pc')) currentFilter = 'pc';
            else if (text.includes('hot')) currentFilter = 'hot';
            
            renderGames(currentFilter, searchInput ? searchInput.value : '');
        });
    });
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderGames(currentFilter, e.target.value);
        });
    }
}

// ==========================================
// 7. DRAWER LOGIC
// ==========================================
let currentSelectedGame = null;
let currentSelectedPackage = null;

function openNapGameDrawer(gameId) {
    const game = GAMES_DATA.find(g => g.id === gameId);
    if (!game) return;
    
    currentSelectedGame = game;
    currentSelectedPackage = null;
    
    // Update Header
    document.getElementById('ngDrawerGameName').innerText = `Nạp ${game.name}`;
    document.getElementById('ngDrawerGameImg').src = game.image;
    document.getElementById('ngDrawerGameImg').onerror = function() { this.src='assets/images/logo.jpg'; };
    
    // Render Packages
    const pkgs = GAME_PACKAGES[gameId] || GAME_PACKAGES['default'];
    const grid = document.getElementById('ngPackagesGrid');
    grid.innerHTML = '';
    
    pkgs.forEach(pkg => {
        const badgeHTML = pkg.badge ? `<div class="ng-pkg-badge">${pkg.badge}</div>` : '';
        const priceStr = pkg.price.toLocaleString('vi-VN') + 'đ';
        
        const pkgDiv = document.createElement('div');
        pkgDiv.className = 'ng-package';
        pkgDiv.innerHTML = `
            ${badgeHTML}
            <span class="ng-pkg-name">${pkg.name}</span>
            <span class="ng-pkg-price">${priceStr}</span>
        `;
        pkgDiv.onclick = () => selectPackage(pkg, pkgDiv);
        grid.appendChild(pkgDiv);
    });
    
    // Reset Form & Summary
    document.getElementById('ngFormUid').value = '';
    document.getElementById('ngFormNote').value = '';
    
    // Keep Phone/Name if logged in
    if (window.currentUser) {
        if(!document.getElementById('ngFormPhone').value) document.getElementById('ngFormPhone').value = window.currentUser.phone || '';
    }
    
    updateSummary();
    
    // Show drawer
    document.getElementById('ngDrawerOverlay').classList.add('open');
    document.getElementById('ngDrawer').classList.add('open');
    document.body.style.overflow = 'hidden'; // prevent bg scroll
}

function closeNapGameDrawer() {
    document.getElementById('ngDrawerOverlay').classList.remove('open');
    document.getElementById('ngDrawer').classList.remove('open');
    document.body.style.overflow = '';
}

function selectPackage(pkg, element) {
    currentSelectedPackage = pkg;
    
    // Update active class
    document.querySelectorAll('.ng-package').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    updateSummary();
}

function updateSummary() {
    const pkgEl = document.getElementById('ngSummaryPkg');
    const priceEl = document.getElementById('ngSummaryPrice');
    
    if (currentSelectedPackage) {
        pkgEl.innerText = currentSelectedPackage.name;
        // Count-up animation
        window.animateCountUp(priceEl, currentSelectedPackage.price, 400);
        priceEl.innerText = currentSelectedPackage.price.toLocaleString('vi-VN') + 'đ';
    } else {
        pkgEl.innerText = 'Chưa chọn gói';
        priceEl.innerText = '0đ';
    }
}

// Count up utility specific to Napgame
if (!window.animateCountUp) {
    window.animateCountUp = function(element, target, duration = 1500) {
        if(!element) return;
        const start = parseInt(element.innerText.replace(/\D/g, '')) || 0;
        const diff = target - start;
        if (diff === 0) return;
        const startTime = performance.now();
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(start + diff * easeOutQuart);
            element.innerText = current.toLocaleString('vi-VN') + 'đ';
            if (progress < 1) requestAnimationFrame(update);
            else element.innerText = target.toLocaleString('vi-VN') + 'đ';
        }
        requestAnimationFrame(update);
    }
}

// ==========================================
// 8. SUBMIT LOGIC -> SUPABASE
// ==========================================
async function submitNapGameOrder() {
    if (!currentSelectedGame || !currentSelectedPackage) {
        alert('Vui lòng chọn 1 gói nạp!');
        return;
    }
    
    const uid = document.getElementById('ngFormUid').value.trim();
    const server = document.getElementById('ngFormServer').value;
    const phone = document.getElementById('ngFormPhone').value.trim();
    const name = document.getElementById('ngFormName').value.trim();
    const note = document.getElementById('ngFormNote').value.trim();
    
    if (!uid) { alert('Vui lòng nhập UID trong game!'); return; }
    if (!phone) { alert('Vui lòng nhập số điện thoại hoặc Zalo liên hệ!'); return; }
    
    const btn = document.getElementById('ngSubmitBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    btn.disabled = true;
    
    try {
        const orderData = {
            user_id: window.currentUser ? window.currentUser.id : null,
            customer_name: name || (window.currentUser ? window.currentUser.email : 'Khách vãng lai'),
            customer_phone: phone,
            game_id: currentSelectedGame.id,
            game_name: currentSelectedGame.name,
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
        
        const { data, error } = await supabaseClient
            .from('napgame_orders')
            .insert([orderData]);
            
        if (error) throw error;
        
        // Success
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Đặt thành công!';
        btn.style.background = 'var(--ng-new)';
        
        setTimeout(() => {
            alert('Đặt hàng nạp game thành công! Admin sẽ liên hệ qua SĐT/Zalo của bạn trong ít phút.');
            closeNapGameDrawer();
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.disabled = false;
        }, 1500);
        
    } catch (err) {
        console.error('Lỗi khi đặt nạp game:', err);
        alert('Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại hoặc liên hệ Zalo trực tiếp.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTicker();
    
    // Small delay to show skeleton before rendering real games
    setTimeout(() => {
        renderGames();
        setupFilters();
    }, 500);
    
    setTimeout(typeWriter, 1000);
    
    // Create random particles
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'ng-particle';
            
            const size = Math.random() * 8 + 4;
            const left = Math.random() * 100;
            const duration = Math.random() * 10 + 10;
            const delay = Math.random() * 5;
            
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.left = `${left}%`;
            p.style.animationDuration = `${duration}s`;
            p.style.animationDelay = `${delay}s`;
            
            particlesContainer.appendChild(p);
        }
    }
});

