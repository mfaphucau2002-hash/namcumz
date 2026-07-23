// Mock Data for Orders (Since Supabase is not connected yet)
const mockOrders = [
    {
        id: '#00005',
        booster: 'NamCumz',
        renter: 'Khách hàng A',
        time: '14:41 23/07/2026',
        status: 'dang_cay',
        content: 'Cày rank từ Vàng lên Kim Cương, cày full nhiệm vụ sự kiện.',
        price: '500,000'
    },
    {
        id: '#00004',
        booster: 'Team NamCumz',
        renter: 'Khách hàng B',
        time: '10:15 22/07/2026',
        status: 'hoan_thanh',
        content: 'Hoàn thành 100% bản đồ mới + nhặt rương.',
        price: '200,000'
    },
    {
        id: '#00003',
        booster: 'NamCumz',
        renter: 'Khách hàng C',
        time: '08:30 21/07/2026',
        status: 'tam_dung',
        content: 'Xả nhựa 3 acc HSR 2 ngày.',
        price: '150,000'
    }
];

// Helper functions for UI
function getStatusDetails(status) {
    switch(status) {
        case 'dang_cay': 
            return { text: 'Đang cày', icon: 'fa-spinner fa-spin', class: 'status-dang_cay', colorVar: 'var(--status-dang-cay)' };
        case 'hoan_thanh': 
            return { text: 'Hoàn thành', icon: 'fa-circle-check', class: 'status-hoan_thanh', colorVar: 'var(--status-hoan-thanh)' };
        case 'tam_dung': 
            return { text: 'Tạm dừng', icon: 'fa-circle-pause', class: 'status-tam_dung', colorVar: 'var(--status-tam-dung)' };
        default: 
            return { text: 'Unknown', icon: 'fa-question', class: '', colorVar: 'var(--text-muted)' };
    }
}

function renderOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

    // Check if user is logged in (Mock)
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole') || 'guest';

    container.innerHTML = '';

    orders.forEach((order, index) => {
        const statusInfo = getStatusDetails(order.status);
        const avatarInitial = order.booster.charAt(0).toUpperCase();

        // Calculate animation delay for staggering effect
        const animDelay = 0.4 + (index * 0.1);

        // Price visibility logic
        let priceHtml = '';
        if (userRole === 'admin' || (isLoggedIn && order.renter === 'Tên Của Tôi')) {
            priceHtml = `<span class="price-value visible">${order.price} VND</span>`;
        } else {
            priceHtml = `<span class="price-value hidden" title="Chỉ người đăng đơn và Admin mới xem được giá">
                            <i class="fa-solid fa-lock" style="font-size: 0.8rem; margin-right: 4px;"></i> Ẩn giá
                        </span>`;
        }

        const card = document.createElement('div');
        card.className = 'order-card animate-on-load';
        card.style.animationDelay = `${animDelay}s`;
        card.style.setProperty('--status-color', statusInfo.colorVar);
        card.innerHTML = `
            <div class="order-header">
                <div class="booster-info">
                    <div class="booster-avatar">${avatarInitial}</div>
                    <div class="booster-details">
                        <span class="booster-label">Người cày: <strong style="color: var(--text-main);">${order.booster}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">Người thuê: <strong style="color: var(--accent);">${order.renter}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">Mã đơn: <strong style="color: var(--primary-light);">${order.id}</strong></span>
                        <span class="time-label"><i class="fa-regular fa-clock"></i> ${order.time}</span>
                    </div>
                </div>
                <div>
                    <div class="status-badge ${statusInfo.class}">
                        <i class="fa-solid ${statusInfo.icon}"></i> ${statusInfo.text}
                    </div>
                </div>
            </div>
            <div class="order-body">
                ${order.content}
            </div>
            <div class="order-price-box">
                <span class="price-label">Giá thanh toán</span>
                ${priceHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

function updateStats(orders) {
    const elTotal = document.getElementById('stat-total');
    if(elTotal) {
        elTotal.textContent = orders.length;
        document.getElementById('stat-pause').textContent = orders.filter(o => o.status === 'tam_dung').length;
        document.getElementById('stat-playing').textContent = orders.filter(o => o.status === 'dang_cay').length;
        document.getElementById('stat-done').textContent = orders.filter(o => o.status === 'hoan_thanh').length;
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    
    // Initial Render
    renderOrders(mockOrders, 'ordersGrid');
    updateStats(mockOrders);

    // Update UI based on login status
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if(isLoggedIn) {
        const loginBtn = document.getElementById('loginBtn');
        if(loginBtn) {
            loginBtn.innerHTML = '<i class="fa-solid fa-user"></i> Tài khoản';
            loginBtn.href = localStorage.getItem('userRole') === 'admin' ? 'admin.html' : 'profile.html';
        }

        const createOrderBtn = document.getElementById('createOrderBtn');
        if(createOrderBtn) {
            createOrderBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Tạo đơn mới';
            createOrderBtn.href = '#'; // Mock action
        }
    }

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = mockOrders.filter(o => 
                o.booster.toLowerCase().includes(val) || 
                o.renter.toLowerCase().includes(val)
            );
            renderOrders(filtered, 'ordersGrid');
        });
    }
});
