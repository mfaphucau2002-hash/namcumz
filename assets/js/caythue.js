/**
 * CÀY THUÊ LOGIC - NAMCUMZ
 */

const ZALO_LINK = 'https://zalo.me/0763550673';

const BOOST_GAMES = [
    { id: 'genshin', name: 'Genshin Impact', image: 'assets/images/games/genshin.webp', icon: 'assets/images/games/genshin_icon.webp', badge: 'HOT', rating: '5.0', sold: '5.400+ đơn' }
];

// Data từ menu Genshin của NamCumz
const BOOST_DATA = {
    'genshin': {
        categories: [
            { id: 'rush_map', name: 'Rush Map' },
            { id: 'diem_dich_chuyen', name: 'Điểm Dịch Chuyển' },
            { id: 'than_dong', name: 'Thần Đồng' },
            { id: 'char', name: 'Build Char' },
            { id: 'content', name: 'Content Game' },
            { id: 'cham_acc', name: 'Chăm Acc' },
            { id: 'quest', name: 'Quest (Nhiệm Vụ)' }
        ],
        items: [
            // RUSH MAP
            { id: 'rm_mondstadt', cat: 'rush_map', name: 'Mondstadt', price: 120000 },
            { id: 'rm_tuyetson', cat: 'rush_map', name: 'Long Tích Tuyết Sơn', price: 50000 },
            { id: 'rm_liyue', cat: 'rush_map', name: 'Liyue', price: 150000 },
            { id: 'rm_tramngoc', cat: 'rush_map', name: 'Trầm Ngọc Cốc', price: 90000 },
            { id: 'rm_vucdasau', cat: 'rush_map', name: 'Vực Đá Sâu', price: 120000 },
            { id: 'rm_inazuma', cat: 'rush_map', name: 'Inazuma', price: 300000 },
            { id: 'rm_sumerurung', cat: 'rush_map', name: 'Sumeru Rừng Mưa', price: 400000 },
            { id: 'rm_sumerusamac', cat: 'rush_map', name: 'Sumeru Sa Mạc', price: 450000 },
            { id: 'rm_fontaine', cat: 'rush_map', name: 'Fontaine', price: 450000 },
            { id: 'rm_bienky', cat: 'rush_map', name: 'Biển Kỷ Nguyên Cũ', price: 150000 },
            { id: 'rm_enkanomiya', cat: 'rush_map', name: 'Enkanomiya', price: 150000 },
            { id: 'rm_nodkrai', cat: 'rush_map', name: 'Nod-Krai', price: 450000 },
            { id: 'rm_nuithanh', cat: 'rush_map', name: 'Núi Thánh Viễn Cổ', price: 150000 },
            { id: 'rm_thandien', cat: 'rush_map', name: 'Thần Điện Không Gian', price: 150000 },
            { id: 'rm_suongnguyet', cat: 'rush_map', name: 'Sương Nguyệt', price: 250000 },

            // ĐIỂM DỊCH CHUYỂN
            { id: 'dc_mondstadt', cat: 'diem_dich_chuyen', name: 'Mondstadt', price: 25000 },
            { id: 'dc_liyue', cat: 'diem_dich_chuyen', name: 'Liyue', price: 25000 },
            { id: 'dc_inazuma', cat: 'diem_dich_chuyen', name: 'Inazuma', price: 30000 },
            { id: 'dc_sumeru', cat: 'diem_dich_chuyen', name: 'Sumeru', price: 65000 },
            { id: 'dc_fontaine', cat: 'diem_dich_chuyen', name: 'Fontaine', price: 65000 },
            { id: 'dc_nodkrai', cat: 'diem_dich_chuyen', name: 'Nod-Krai', price: 30000 },
            { id: 'dc_nuithanh', cat: 'diem_dich_chuyen', name: 'Núi Thánh Viễn Cổ', price: 25000 },
            { id: 'dc_bienky', cat: 'diem_dich_chuyen', name: 'Biển Kỷ Nguyên Cũ', price: 25000 },
            { id: 'dc_enkanomiya', cat: 'diem_dich_chuyen', name: 'Enkanomiya', price: 30000 },
            { id: 'dc_full', cat: 'diem_dich_chuyen', name: 'Điểm dịch chuyển full Teyvat', price: 200000 },

            // THẦN ĐỒNG
            { id: 'td_phong', cat: 'than_dong', name: 'Phong', price: 30000 },
            { id: 'td_nham', cat: 'than_dong', name: 'Nham', price: 50000 },
            { id: 'td_loi', cat: 'than_dong', name: 'Lôi', price: 70000 },
            { id: 'td_thao', cat: 'than_dong', name: 'Thảo', price: 140000 },
            { id: 'td_thuy', cat: 'than_dong', name: 'Thủy', price: 90000 },
            { id: 'td_hoa', cat: 'than_dong', name: 'Hỏa', price: 100000 },
            { id: 'td_bang', cat: 'than_dong', name: 'Băng', price: 100000 },
            { id: 'td_cachep', cat: 'than_dong', name: 'Cá chép', price: 30000 },
            { id: 'td_manao', cat: 'than_dong', name: 'Mã não', price: 30000 },
            { id: 'td_luuminh', cat: 'than_dong', name: 'Lưu Minh Thạch', price: 30000 },

            // CHAR
            { id: 'ch_lv90', cat: 'char', name: 'Up Lv90', price: 25000 },
            { id: 'ch_vukhi', cat: 'char', name: 'Vũ Khí', price: 15000 },
            { id: 'ch_thienphu', cat: 'char', name: 'Thiên Phú', price: 40000 },
            { id: 'ch_buildtam', cat: 'char', name: 'Build Char xài tạm', price: 50000 },
            { id: 'ch_buildtot', cat: 'char', name: 'Build Char ổn / Chỉ số tốt', price: 150000 },

            // CONTENT
            { id: 'ct_lahoan', cat: 'content', name: 'La hoàn tầng 12', price: 30000 },
            { id: 'ct_nhahat', cat: 'content', name: 'Nhà hát full 12 tầng', price: 80000 },
            { id: 'ct_aocanh', cat: 'content', name: 'Ảo Cảnh Diff 6', price: 45000 },
            { id: 'ct_combo', cat: 'content', name: 'Combo toàn bộ ở trên', price: 130000 },

            // CHĂM ACC
            { id: 'ca_daily', cat: 'cham_acc', name: 'Daily xả nhựa (Theo tháng)', price: 140000 },

            // QUEST
            { id: 'qu_mathan1', cat: 'quest', name: 'Ma Thần (Trước Natlan)', price: 20000 },
            { id: 'qu_mathan2', cat: 'quest', name: 'Ma Thần (Từ Natlan trở đi)', price: 25000 },
            { id: 'qu_truyenthuyet', cat: 'quest', name: 'Truyền Thuyết (1 màn)', price: 15000 }, // Average
            { id: 'qu_donghanh', cat: 'quest', name: 'Nhiệm vụ đồng hành (1 màn)', price: 5000 },
            { id: 'qu_thegioi', cat: 'quest', name: 'Nhiệm vụ thế giới (1 quest)', price: 10000 }, // Average
            { id: 'qu_aranyaka', cat: 'quest', name: 'Aranyaka (full)', price: 140000 },
            { id: 'qu_aranara', cat: 'quest', name: '76 Aranara', price: 35000 }
        ]
    }
};

// ==========================================
// CATALOG PAGE
// ==========================================
function initBoostCatalog() {
    // Slider
    let slideIndex = 0;
    const track = document.getElementById('sliderTrack');
    if (track) {
        setInterval(() => {
            slideIndex = (slideIndex + 1) % track.children.length;
            track.style.transform = `translateX(-${slideIndex * 100}%)`;
            document.querySelectorAll('.ng-dot').forEach((d, i) => d.classList.toggle('active', i === slideIndex));
        }, 5000);
    }

    // Grid
    const grid = document.getElementById('gridFeatured');
    if (grid) {
        grid.innerHTML = BOOST_GAMES.map(g => `
            <a href="caythue-detail.html?game=${g.id}" class="ng-card-portrait">
                <img src="${g.image}" alt="${g.name}" onerror="this.src='assets/images/logo.jpg'">
                <div class="ng-card-portrait-info">
                    <div class="ng-card-portrait-badge badge-hot">BOOST</div>
                    <div class="ng-card-portrait-title">Cày Thuê ${g.name}</div>
                    <div class="ng-card-portrait-btn" style="background: linear-gradient(135deg, #10b981, #059669);">Xem Bảng Giá</div>
                </div>
            </a>
        `).join('');
    }

    // FAKE TICKER
    const ticker = document.getElementById('tickerTrack');
    if (ticker) {
        const fakeBoost = [
            { user: 'Ma***on', pack: 'Rush Map Sumeru', time: '5 phút trước' },
            { user: 'Ho***nh', pack: 'Nhặt Thần Đồng Phong', time: '12 phút trước' },
            { user: 'Da***rk', pack: 'Daily xả nhựa 1 tháng', time: '30 phút trước' },
            { user: 'Lu***ka', pack: 'La Hoàn tầng 12', time: '1 giờ trước' }
        ];
        const html = fakeBoost.map(o => `
            <span class="ticker-item">
                <span class="ticker-avatar" style="background:#10b981">${o.user[0]}</span>
                <b>${o.user}</b> vừa đặt <b>${o.pack}</b>
                <span class="ticker-time">${o.time}</span>
            </span>
        `).join('<span class="ticker-sep" style="color:#10b981">•</span>');
        ticker.innerHTML = html + '<span class="ticker-sep" style="color:#10b981">•</span>' + html;
    }
}

// ==========================================
// DETAIL PAGE (MULTI-SELECT CART)
// ==========================================
let cartItems = [];
let currentBoostGame = 'genshin';
let activeCat = '';

function initBoostDetail() {
    const params = new URLSearchParams(window.location.search);
    currentBoostGame = params.get('game') || 'genshin';
    const gameMeta = BOOST_GAMES.find(g => g.id === currentBoostGame) || BOOST_GAMES[0];
    
    // UI Updates
    document.getElementById('breadcrumbGame').textContent = gameMeta.name;
    document.getElementById('detailGameName').textContent = 'Cày Thuê ' + gameMeta.name;
    document.getElementById('detailSold').textContent = gameMeta.sold;
    const iconEl = document.getElementById('detailGameIcon');
    if(iconEl) iconEl.src = gameMeta.icon;

    // Tabs
    const data = BOOST_DATA[currentBoostGame];
    if (!data) return;

    activeCat = data.categories[0].id;
    const tabsContainer = document.getElementById('ctTabs');
    tabsContainer.innerHTML = data.categories.map(c => `
        <button class="ng-tab-btn ${c.id === activeCat ? 'active' : ''}" onclick="switchBoostTab('${c.id}')">${c.name}</button>
    `).join('');

    renderBoostItems();
    
    // Fill phone if logged in
    if (window.currentUser) {
        const phEl = document.getElementById('formPhone');
        if (phEl && !phEl.value) phEl.value = window.currentUser.phone || '';
    }
}

function switchBoostTab(catId) {
    activeCat = catId;
    document.querySelectorAll('#ctTabs .ng-tab-btn').forEach(b => {
        b.classList.toggle('active', b.textContent === BOOST_DATA[currentBoostGame].categories.find(c => c.id === catId).name);
    });
    renderBoostItems();
}

function renderBoostItems() {
    const list = document.getElementById('pkgList');
    const data = BOOST_DATA[currentBoostGame];
    const items = data.items.filter(i => i.cat === activeCat);
    
    list.innerHTML = items.map(item => {
        const isSelected = cartItems.some(c => c.id === item.id);
        return `
            <div class="ct-pkg-item ${isSelected ? 'selected' : ''}" onclick="toggleCartItem('${item.id}')">
                <div class="ct-pkg-item-left">
                    <div class="ct-checkbox"><i class="fa-solid fa-check"></i></div>
                    <span class="ct-pkg-name">${item.name}</span>
                </div>
                <span class="ct-pkg-price">${item.price.toLocaleString('vi-VN')} đ</span>
            </div>
        `;
    }).join('');
}

function toggleCartItem(itemId) {
    const data = BOOST_DATA[currentBoostGame].items.find(i => i.id === itemId);
    if (!data) return;

    const existingIdx = cartItems.findIndex(c => c.id === itemId);
    if (existingIdx >= 0) {
        cartItems.splice(existingIdx, 1); // Remove
    } else {
        cartItems.push(data); // Add
    }
    
    renderBoostItems(); // Re-render to update checkboxes
    updateBoostCart();
}

function updateBoostCart() {
    const emptyCt = document.getElementById('emptyCart');
    const filledCt = document.getElementById('filledCart');
    const listHtml = document.getElementById('cartItemsList');
    const totalHtml = document.getElementById('cartTotalPrice');
    const mobTotal = document.getElementById('mobileBarPrice');

    if (cartItems.length === 0) {
        emptyCt.style.display = '';
        filledCt.style.display = 'none';
        mobTotal.textContent = '0 đ';
        return;
    }

    emptyCt.style.display = 'none';
    filledCt.style.display = '';

    // Render cart items
    listHtml.innerHTML = cartItems.map(item => `
        <div class="ct-cart-item">
            <span class="ct-cart-item-name">• ${item.name}</span>
            <span class="ct-cart-item-price">${item.price.toLocaleString('vi-VN')} đ</span>
        </div>
    `).join('');

    // Calc total
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    const totalStr = total.toLocaleString('vi-VN') + ' đ';
    totalHtml.textContent = totalStr;
    mobTotal.textContent = totalStr;
}

async function submitBoostingOrder() {
    if (cartItems.length === 0) return alert('Vui lòng chọn ít nhất 1 dịch vụ cày thuê!');
    
    const phone = document.getElementById('formPhone').value.trim();
    const server = document.getElementById('formServer').value;
    const user = document.getElementById('formUsername').value.trim();
    const pass = document.getElementById('formPassword').value.trim();
    const noteTime = document.getElementById('formNote').value.trim();

    if (!phone) return alert('Vui lòng nhập SĐT Zalo!');
    if (!server) return alert('Vui lòng chọn máy chủ!');
    if (!user || !pass) return alert('Vui lòng nhập Tài khoản và Mật khẩu!');

    const btnIds = ['btnSubmitOrder', 'mobileBarBtn'];
    const originals = {};
    btnIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) { originals[id] = el.innerHTML; el.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...'; el.disabled = true; }
    });

    try {
        const total = cartItems.reduce((sum, i) => sum + i.price, 0);
        const packageListStr = cartItems.map(i => i.name).join(' + ');
        const finalNote = `[CÀY THUÊ] Server: ${server} | Acc: ${user} | Pass: ${pass} | Giờ rảnh: ${noteTime || 'Không có'}`;

        const orderData = {
            user_id: window.currentUser?.id || null,
            customer_name: window.currentUser?.email || 'Khách Cày Thuê',
            customer_phone: phone,
            game_id: currentBoostGame,
            game_name: 'Cày Thuê ' + (BOOST_GAMES.find(g => g.id === currentBoostGame)?.name || 'Game'),
            package_id: 'boosting_multi',
            package_name: packageListStr,
            price: total,
            uid_ingame: 'boosting',
            server: server,
            note: finalNote,
            status: 'pending',
            payment_method: 'manual',
            is_public: false // Cày thuê thì ẩn khỏi public ticker nếu cần, hoặc để true cũng được
        };

        const { error } = await supabaseClient.from('napgame_orders').insert([orderData]);
        if (error) throw error;

        btnIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = '<i class="fa-solid fa-check"></i> Đã gửi!'; el.style.background = '#16a34a'; }
        });
        
        setTimeout(() => {
            alert('✅ Đã gửi yêu cầu Cày Thuê!\n\nTổng thanh toán: ' + total.toLocaleString('vi-VN') + ' đ\nAdmin sẽ nhắn tin qua Zalo ' + phone + ' để xác nhận khung giờ và hướng dẫn chuyển khoản.');
            window.location.reload();
        }, 1500);

    } catch (err) {
        console.error('Boosting order error:', err);
        alert('Có lỗi, vui lòng thử lại hoặc liên hệ Zalo trực tiếp.');
        btnIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.innerHTML = originals[id]; el.disabled = false; }
        });
    }
}

// Router
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('gridFeatured')) initBoostCatalog();
    if (document.getElementById('ctTabs')) initBoostDetail();
    initZaloWidget();
});

// FLOATING ZALO WIDGET
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
