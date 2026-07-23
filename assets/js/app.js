// 1. Initialize Supabase
const SUPABASE_URL = 'https://vqnuutdmcekqkbdvawlw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbnV1dGRtY2VrcWtiZHZhd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTgwNjIsImV4cCI6MjEwMDM3NDA2Mn0.T8_AdJOWEmf68oVrOjv8G51IScykzqhBnfHIi5LK-G4';

let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error("Supabase CDN not loaded!");
}

let allOrders = [];

// Helper functions
function getStatusDetails(status) {
    switch(status) {
        case 'dang_cay': return { text: 'Đang cày', icon: 'fa-spinner fa-spin', class: 'status-dang_cay', colorVar: 'var(--status-dang-cay)' };
        case 'hoan_thanh': return { text: 'Hoàn thành', icon: 'fa-circle-check', class: 'status-hoan_thanh', colorVar: 'var(--status-hoan-thanh)' };
        case 'tam_dung': return { text: 'Tạm dừng', icon: 'fa-circle-pause', class: 'status-tam_dung', colorVar: 'var(--status-tam-dung)' };
        case 'cho_xu_ly': return { text: 'Chờ xử lý', icon: 'fa-hourglass-half', class: 'status-tam_dung', colorVar: '#a855f7' };
        default: return { text: 'Unknown', icon: 'fa-question', class: '', colorVar: 'var(--text-muted)' };
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    const time = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
    const date = d.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});
    return `${time} ${date}`;
}

function generateOrderCode() {
    return '#' + Math.floor(10000 + Math.random() * 90000);
}

function renderOrders(orders, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

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
        const avatarInitial = order.booster_name ? order.booster_name.charAt(0).toUpperCase() : '?';
        const animDelay = 0.2 + (index * 0.1);

        let priceHtml = '';
        if (userRole === 'admin' || userRole === 'super_admin' || (isLoggedIn && order.renter_name === currentUsername)) {
            priceHtml = `<span class="price-value visible">${order.price || 'Chưa báo giá'}</span>`;
        } else {
            priceHtml = `<span class="price-value hidden" title="Chỉ người đăng đơn và Admin mới xem được giá"><i class="fa-solid fa-lock" style="font-size: 0.8rem; margin-right: 4px;"></i> Ẩn giá</span>`;
        }

        const card = document.createElement('div');
        card.className = 'order-card animate-on-load';
        card.style.animationDelay = `${animDelay}s`;
        card.style.setProperty('--status-color', statusInfo.colorVar);
        
        let contentHtml = order.content || 'Không có mô tả';
        if (order.notes) contentHtml += `<br><small style="color:var(--text-muted); margin-top:10px; display:block;">Ghi chú: ${order.notes}</small>`;

        card.innerHTML = `
            <div class="order-header">
                <div class="booster-info">
                    <div class="booster-avatar">${avatarInitial}</div>
                    <div class="booster-details">
                        <span class="booster-label">Người cày: <strong style="color: var(--text-main);">${order.booster_name || 'Đang chờ...'}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">Người thuê: <strong style="color: var(--accent);">${order.renter_name}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">Mã đơn: <strong style="color: var(--primary-light);">${order.order_code}</strong></span>
                        <span class="time-label"><i class="fa-regular fa-clock"></i> ${formatDate(order.created_at)}</span>
                    </div>
                </div>
                <div>
                    <div class="status-badge ${statusInfo.class}" style="border-color:${statusInfo.colorVar}; color:${statusInfo.colorVar}; background: transparent;">
                        <i class="fa-solid ${statusInfo.icon}"></i> ${statusInfo.text}
                    </div>
                </div>
            </div>
            <div class="order-body">${contentHtml}</div>
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
        document.getElementById('stat-pause').textContent = orders.filter(o => o.status === 'tam_dung' || o.status === 'cho_xu_ly').length;
        document.getElementById('stat-playing').textContent = orders.filter(o => o.status === 'dang_cay').length;
        document.getElementById('stat-done').textContent = orders.filter(o => o.status === 'hoan_thanh').length;
    }
}

async function fetchOrders() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allOrders = data;
        renderOrders(allOrders, 'ordersGrid');
        updateStats(allOrders);
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error.message);
        document.getElementById('ordersGrid').innerHTML = '<div style="color: var(--status-tam-dung);">Lỗi kết nối tới cơ sở dữ liệu.</div>';
    }
}

// Global Setup
document.addEventListener('DOMContentLoaded', () => {

    // Setup Auth State Listener for Google OAuth & Sync
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // If localstorage already matches session, don't re-fetch (prevent loop)
                if(localStorage.getItem('userId') === session.user.id) return;

                const userId = session.user.id;
                let user = session.user.user_metadata.display_name || session.user.email.split('@')[0];
                
                const { data: roleData, error: roleError } = await supabaseClient
                    .from('user_roles')
                    .select('role')
                    .eq('id', userId)
                    .single();
                
                let role = 'customer';
                if (roleData && roleData.role) {
                    role = roleData.role;
                }

                if (user.toLowerCase() === 'admin') {
                    role = 'super_admin';
                }

                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', user);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userId', userId);
                
                // If we are on login page, redirect
                if (window.location.pathname.includes('login')) {
                    if (role === 'admin' || role === 'super_admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/';
                    }
                } else {
                    // Refresh UI on current page if needed
                    location.reload();
                }
            } else if (event === 'SIGNED_OUT') {
                localStorage.clear();
            }
        });
    }

    // 1. Fetch Orders
    if (document.getElementById('ordersGrid')) {
        fetchOrders();
    }

    // 2. UI Auth State
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole') || 'guest';
    const currentUsername = localStorage.getItem('username');
    const currentUserId = localStorage.getItem('userId');

    if(isLoggedIn) {
        const loginBtn = document.getElementById('loginBtn');
        if(loginBtn) {
            loginBtn.innerHTML = '<i class="fa-solid fa-user"></i> Cài đặt tài khoản';
            loginBtn.href = '/profile';
        }

        const createOrderBtn = document.getElementById('createOrderBtn');
        if(createOrderBtn) {
            createOrderBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Tạo đơn mới';
            createOrderBtn.href = '#'; 
            createOrderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('createOrderModal').classList.add('active');
            });
        }
    } else {
        // If not logged in, profile redirect
        const path = window.location.pathname;
        if(path.includes('profile')) {
            window.location.href = '/login';
        }
    }

    // Modal Close logic
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            document.getElementById('createOrderModal').classList.remove('active');
        });
    }

    // Search logic
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

    // Order Submit Logic
    const createOrderForm = document.getElementById('createOrderForm');
    if (createOrderForm) {
        createOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const booster = document.getElementById('orderBooster').value;
            const renter = document.getElementById('orderRenter').value;
            const price = document.getElementById('orderPrice').value;
            const content = document.getElementById('orderContent').value;

            // Generate order
            const order_code = generateOrderCode();
            
            const submitBtn = document.getElementById('submitModalBtn');
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
            submitBtn.disabled = true;

            const { data, error } = await supabaseClient.from('orders').insert([
                {
                    order_code: order_code,
                    booster_name: booster,
                    renter_name: renter,
                    content: content,
                    price: price,
                    status: 'cho_xu_ly',
                    user_id: currentUserId || null
                }
            ]);

            if (error) {
                alert('Có lỗi xảy ra: ' + error.message);
            } else {
                alert('Tạo đơn cày thuê thành công!');
                document.getElementById('createOrderModal').classList.remove('active');
                createOrderForm.reset();
                fetchOrders(); // refresh
            }

            submitBtn.innerHTML = 'Tạo đơn';
            submitBtn.disabled = false;
        });

        const cancelBtn = document.getElementById('cancelModalBtn');
        if(cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.getElementById('createOrderModal').classList.remove('active');
            });
        }
    }

    // --- PROFILE LOGIC ---
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        document.getElementById('profileDisplayName').value = currentUsername;

        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('profileDisplayName').value;
            localStorage.setItem('username', newName);
            alert('Cập nhật tên tài khoản thành công!');
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.clear();
            supabaseClient.auth.signOut().then(() => {
                window.location.href = '/';
            });
        });
    }

    // --- AUTH LOGIC (LOGIN/REGISTER) ---
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
                email: email, password: pass, options: { data: { display_name: displayName, role: 'customer' } }
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
            const email = user + '@namcumz.com';

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email, password: pass
            });

            if (error) {
                alert('Tên tài khoản hoặc mật khẩu không đúng!');
            } else {
                const userId = data.user.id;
                
                // Fetch actual role from the user_roles table we just created
                const { data: roleData, error: roleError } = await supabaseClient
                    .from('user_roles')
                    .select('role')
                    .eq('id', userId)
                    .single();
                
                let role = 'customer';
                if (roleData && roleData.role) {
                    role = roleData.role;
                }

                // Temporary override for 'admin' username to always be super_admin to avoid locking out the user
                if (user.toLowerCase() === 'admin') {
                    role = 'super_admin';
                    // Optional: Try to upsert the super_admin role into the table for the 'admin' user just in case
                    await supabaseClient.from('user_roles').upsert({ id: userId, username: user, role: 'super_admin' });
                }

                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', user);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userId', userId);

                if (role === 'admin' || role === 'super_admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/';
                }
            }
        });
    }
});
