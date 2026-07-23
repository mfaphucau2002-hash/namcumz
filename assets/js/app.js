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

        const currentUserId = localStorage.getItem('userId');
        const isOwner = (order.user_id === currentUserId) || (order.renter_name === currentUsername);
        const isAssignedBooster = order.booster_id === currentUserId;
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        const isBoosterRole = userRole === 'booster';
        const canViewPrivate = isAdmin || isOwner || isAssignedBooster || isBoosterRole;

        let priceHtml = '';
        if (canViewPrivate) {
            priceHtml = `<span style="color: #fff; font-weight: 700; font-size: 0.9rem;">${order.price || 'Chưa báo giá'}</span>`;
        } else {
            priceHtml = `<span style="color: #a1a1aa; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;" title="Chỉ người đăng đơn, Booster và Admin mới xem được giá"><i class="fa-solid fa-lock"></i> Ẩn giá</span>`;
        }

        let actionButtons = '';
        if (isLoggedIn) {
            if (order.status === 'cho_xu_ly' && isBoosterRole && !order.booster_id) {
                actionButtons += `<button onclick="acceptOrder('${order.id}')" class="btn" style="background: var(--accent); color: #000; font-weight: bold; padding: 6px 12px; font-size: 0.8rem; margin-right: 5px;"><i class="fa-solid fa-handshake"></i> Nhận đơn này</button>`;
            }
            if (canViewPrivate) {
                actionButtons += `<button onclick="openChat('${order.id}', '${order.order_code}')" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fa-solid fa-comments"></i> Chat</button>`;
            }
        }

        const card = document.createElement('div');
        card.className = 'order-card animate-on-load';
        card.style.animationDelay = `${animDelay}s`;
        card.style.setProperty('--status-color', statusInfo.colorVar);
        
        let contentText = order.content || 'Không có mô tả';

        card.innerHTML = `
            <div class="order-header">
                <div class="booster-info">
                    <div class="booster-avatar" style="border-color: ${statusInfo.colorVar}">${avatarInitial}</div>
                    <div class="booster-details">
                        <span class="booster-label">NGƯỜI CÀY: <strong style="color: #fff;">${order.booster_name || 'Đang chờ...'}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">NGƯỜI THUÊ: <strong style="color: var(--accent);">${order.renter_name}</strong></span>
                        <span class="booster-label" style="margin-top: 2px;">MÃ ĐƠN: <strong style="color: var(--primary-light);">${order.order_code}</strong></span>
                        <span class="time-label"><i class="fa-regular fa-clock"></i> ${formatDate(order.created_at)}</span>
                    </div>
                </div>
                <div>
                    <div class="status-badge ${statusInfo.class}" style="border-color:${statusInfo.colorVar}; color:${statusInfo.colorVar}; background: transparent; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 0.7rem; border-width: 1px; border-style: solid; white-space: nowrap; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid ${statusInfo.icon}" style="font-size: 0.65rem;"></i> ${statusInfo.text.toUpperCase()}
                    </div>
                </div>
            </div>
            
            <div class="order-task-content">
                ${contentText}
            </div>

            <div class="order-footer">
                <div>
                    <span style="color: #a1a1aa; font-size: 0.85rem; display:block;">Giá thanh toán</span>
                    ${priceHtml}
                </div>
                <div>${actionButtons}</div>
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

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole') || 'guest';
    const currentUsername = localStorage.getItem('username');

    // Setup Global Navbar Profile
    const navAccountBtn = document.getElementById('navAccountBtn');
    const navUserProfile = document.getElementById('navUserProfile');
    const navUsername = document.getElementById('navUsername');
    const navRole = document.getElementById('navRole');
    const navAvatarInitials = document.getElementById('navAvatarInitials');
    
    if (isLoggedIn && navUserProfile && navAccountBtn) {
        navAccountBtn.style.display = 'none';
        navUserProfile.style.display = 'flex';
        navUsername.textContent = currentUsername || 'User';
        navAvatarInitials.textContent = (currentUsername || 'U').charAt(0).toUpperCase();
        let displayRole = 'KHÁCH HÀNG';
        if(userRole === 'admin') displayRole = 'ADMIN';
        if(userRole === 'super_admin') displayRole = 'TRÙM CUỐI';
        navRole.textContent = displayRole;

        // Make avatar and info clickable to go to admin/profile
        const goToDashboard = () => {
            if (userRole === 'admin' || userRole === 'super_admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/profile';
            }
        };
        navAvatarInitials.style.cursor = 'pointer';
        navUsername.parentElement.style.cursor = 'pointer';
        navAvatarInitials.addEventListener('click', goToDashboard);
        navUsername.parentElement.addEventListener('click', goToDashboard);
    }

    const navLogoutBtn = document.getElementById('navLogoutBtn');
    if (navLogoutBtn) {
        navLogoutBtn.addEventListener('click', () => {
            localStorage.clear();
            if(supabaseClient) {
                supabaseClient.auth.signOut().then(() => {
                    window.location.href = '/';
                });
            } else {
                window.location.href = '/';
            }
        });
    }

    // Setup Auth State Listener for Google OAuth & Sync
    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                const userId = session.user.id;
                
                // Always sync role from DB to ensure Admin changes reflect immediately
                let user = session.user.user_metadata.display_name || session.user.email.split('@')[0];
                
                const { data: roleData } = await supabaseClient
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

                const previousRole = localStorage.getItem('userRole');
                const isNewSync = localStorage.getItem('userId') !== userId;

                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', user);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userId', userId);
                
                // If role changed while logged in, reload the UI to reflect new permissions
                if (!isNewSync && previousRole !== role) {
                    location.reload();
                    return;
                }
                
                // Redirect away from login page if authenticated
                if (window.location.pathname.includes('login')) {
                    if (role === 'admin' || role === 'super_admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/';
                    }
                } else if (isNewSync) {
                    // Refresh UI on current page only if it was a new login
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

            // Anti-Spam Check (5 minutes)
            const lastOrderTime = localStorage.getItem('lastOrderTime');
            if (lastOrderTime) {
                const diff = (Date.now() - parseInt(lastOrderTime)) / 1000 / 60;
                if (diff < 5) {
                    alert(`Bạn đang gửi quá nhanh! Vui lòng chờ ${Math.ceil(5 - diff)} phút nữa để đăng đơn tiếp theo.`);
                    return;
                }
            }

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
                localStorage.setItem('lastOrderTime', Date.now());
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

// --- ACCEPT ORDER (BOOSTER) ---
window.acceptOrder = async (orderId) => {
    if(!confirm('Bạn chắc chắn muốn nhận đơn này?')) return;
    const { error } = await supabaseClient
        .from('orders')
        .update({ booster_id: localStorage.getItem('userId'), booster_name: localStorage.getItem('username'), status: 'dang_cay' })
        .eq('id', orderId);
    if(error) alert('Lỗi: ' + error.message);
    else { alert('Nhận đơn thành công!'); fetchOrders(); }
};

// --- CHAT LOGIC ---
let currentChatSub = null;
let currentChatOrderId = null;

window.openChat = async (orderId, orderCode) => {
    document.getElementById('chatOrderCode').textContent = orderCode;
    document.getElementById('chatModal').classList.add('active');
    currentChatOrderId = orderId;
    const msgContainer = document.getElementById('chatMessages');
    msgContainer.innerHTML = '<div style=""color: var(--text-muted); text-align: center;"">Đang tải tin nhắn...</div>';

    // Load initial messages
    const { data, error } = await supabaseClient
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

    msgContainer.innerHTML = '';
    if(error) {
        msgContainer.innerHTML = '<div style=""color: red;"">Lỗi tải tin nhắn: '+error.message+'</div>';
    } else {
        data.forEach(msg => appendMessage(msg));
    }

    // Subscribe to realtime messages
    if(currentChatSub) await supabaseClient.removeChannel(currentChatSub);
    currentChatSub = supabaseClient.channel('chat_'+orderId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: 'order_id=eq.'+orderId }, payload => {
            appendMessage(payload.new);
        })
        .subscribe();
};

window.appendMessage = function(msg) {
    const msgContainer = document.getElementById('chatMessages');
    if(!msgContainer) return;
    const isMine = msg.sender_id === localStorage.getItem('userId');
    const div = document.createElement('div');
    div.style.cssText = "max-width: 80%; padding: 10px 15px; border-radius: 12px; margin-bottom: 5px; clear: both;  + (isMine ? 'background: var(--accent); color: #000; align-self: flex-end; border-bottom-right-radius: 4px;' : 'background: #334155; color: #fff; align-self: flex-start; border-bottom-left-radius: 4px;') + ";
    div.innerHTML = <div style=""font-size: 0.7rem; font-weight: bold; margin-bottom: 4px;  + (isMine ? 'color: #333;' : 'color: var(--accent);') + "" ></div><div></div>;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
};

document.addEventListener('DOMContentLoaded', () => {
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    if(sendChatBtn && chatInput) {
        const sendMessage = async () => {
            const text = chatInput.value.trim();
            if(!text || !currentChatOrderId) return;
            chatInput.value = '';
            await supabaseClient.from('order_messages').insert([{
                order_id: currentChatOrderId,
                sender_id: localStorage.getItem('userId'),
                sender_name: localStorage.getItem('username'),
                message: text
            }]);
        };
        sendChatBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
    }
    const closeChatBtn = document.getElementById('closeChatBtn');
    if(closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            document.getElementById('chatModal').classList.remove('active');
            if(currentChatSub) supabaseClient.removeChannel(currentChatSub);
            currentChatSub = null;
            currentChatOrderId = null;
        });
    }
});
