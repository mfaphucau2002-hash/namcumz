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
// INIT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTicker();
    setTimeout(typeWriter, 1000);
    
    // Create random particles
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'ng-particle';
            
            // Random properties
            const size = Math.random() * 8 + 4; // 4px to 12px
            const left = Math.random() * 100; // 0 to 100%
            const duration = Math.random() * 10 + 10; // 10s to 20s
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
