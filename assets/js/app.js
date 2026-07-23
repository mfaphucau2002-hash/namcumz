// 1. Initialize Supabase
const SUPABASE_URL = 'https://vqnuutdmcekqkbdvawlw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbnV1dGRtY2VrcWtiZHZhd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTgwNjIsImV4cCI6MjEwMDM3NDA2Mn0.T8_AdJOWEmf68oVrOjv8G51IScykzqhBnfHIi5LK-G4';

// Check if supabase library is loaded
let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase CDN not loaded!");
}

let allOrders = []; // To store fetched orders for searching

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

// Format date
function formatDate(dateString) {
    const d = new Date(dateString);
    const time = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
    const date = d.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});
    return `${time} ${date}`;
}

function renderOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole') || 'guest';
    const currentUsername = localStorage.getItem('username');

    container.innerHTML = '';

    if (orders.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Không tìm thấy đơn cày nào.</div>';
        return;
    }

    orders.forEach((order, index) => {
        const statusInfo = getStatusDetails(order.status);
        const avatarInitial = order.booster_name ? order.booster_name.charAt(0).toUpperCase() : 'A';

        // Calculate animation delay for staggering effect
        const animDelay = 0.2 + (index * 0.1);

        // Price visibility logic
        let priceHtml = '';
        if (userRole === 'admin' || (isLoggedIn && order.renter_name === currentUsername)) {
            priceHtml = `<span class="price-value visible">${order.price || '0'} đ</span>`;
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
                        <span class="booster-label">Người cày: <strong style="color: var(--text-main);">${order.booster_name}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">Người thuê: <strong style="color: var(--accent);">${order.renter_name}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">Mã đơn: <strong style="color: var(--primary-light);">${order.order_code}</strong></span>
                        <span class="time-label"><i class="fa-regular fa-clock"></i> ${formatDate(order.created_at)}</span>
                    </div>
                </div>
                <div>
                    <div class="status-badge ${statusInfo.class}">
                        <i class="fa-solid ${statusInfo.icon}"></i> ${statusInfo.text}
                    </div>
                </div>
            </div>
            <div class="order-body">
                ${order.content || 'Không có mô tả'}
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

// Fetch orders from Supabase
async function fetchOrders() {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allOrders = data;
        renderOrders(allOrders, 'ordersGrid');
        updateStats(allOrders);
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error.message);
        document.getElementById('ordersGrid').innerHTML = '<div style="color: var(--status-tam-dung);">Lỗi kết nối tới cơ sở dữ liệu. Vui lòng kiểm tra lại cấu hình.</div>';
    }
}

// Search functionality & Setup
document.addEventListener('DOMContentLoaded', () => {
    // 1. Fetch Data
    if (document.getElementById('ordersGrid')) {
        fetchOrders();
    }

    // 2. Update UI based on login status
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if(isLoggedIn) {
        const loginBtn = document.getElementById('loginBtn');
        if(loginBtn) {
            loginBtn.innerHTML = '<i class="fa-solid fa-user"></i> Tài khoản';
            loginBtn.href = localStorage.getItem('userRole') === 'admin' ? '/admin' : '#';
        }

        const createOrderBtn = document.getElementById('createOrderBtn');
        if(createOrderBtn) {
            createOrderBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Tạo đơn mới';
            createOrderBtn.href = '#'; // Functionality to add real orders can be implemented here
        }
    }

    // 3. Search input logic
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allOrders.filter(o => 
                (o.booster_name && o.booster_name.toLowerCase().includes(val)) || 
                (o.renter_name && o.renter_name.toLowerCase().includes(val)) ||
                (o.order_code && o.order_code.toLowerCase().includes(val))
            );
            renderOrders(filtered, 'ordersGrid');
        });
    }
});

// Auth Logic
document.addEventListener('DOMContentLoaded', () => {
    if (!supabaseClient) return;
    
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const displayName = document.getElementById('regDisplay').value.trim();
            const pass = document.getElementById('regPass').value;
            const confirm = document.getElementById('regConfirm').value;

            if (pass !== confirm) {
                alert('Mật khẩu xác nhận không khớp!');
                return;
            }

            const email = username + '@namcumz.com';

            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: pass,
                options: {
                    data: {
                        display_name: displayName,
                        role: 'customer'
                    }
                }
            });

            if (error) {
                alert('Lỗi đăng ký: ' + error.message);
            } else {
                alert('Đăng ký thành công! Hãy đăng nhập bằng Tên tài khoản vừa tạo.');
                registerForm.reset();
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;

            // Admin manual bypass just in case, but let's use real auth
            const email = user + '@namcumz.com';

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: pass
            });

            if (error) {
                alert('Tên tài khoản hoặc mật khẩu không đúng!');
            } else {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', user);
                // Check if admin (you can set an admin user manually in Supabase later)
                if (user.toLowerCase() === 'admin') {
                    localStorage.setItem('userRole', 'admin');
                    window.location.href = '/admin';
                } else {
                    localStorage.setItem('userRole', 'customer');
                    window.location.href = '/';
                }
            }
        });
    }
});
