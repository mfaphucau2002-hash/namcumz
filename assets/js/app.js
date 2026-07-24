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

// Removed old renderOrders & updateStats

window.fetchOrders = async function() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allOrders = data;
        
        if(typeof window.applyFilters === 'function') {
            window.applyFilters();
        } else {
            renderOrders(allOrders, 'ordersGrid');
        }
        
        if(typeof updateDashboardStats === 'function') {
            updateDashboardStats(allOrders);
        }
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error.message);
        document.getElementById('ordersGrid').innerHTML = '<div style="color: var(--status-tam-dung);">Lỗi kết nối tới cơ sở dữ liệu.</div>';
    }
}

// Global Setup
document.addEventListener('DOMContentLoaded', () => {
    const notifBtn = document.getElementById('notificationBtn');
    if (notifBtn) notifBtn.addEventListener('click', toggleNotificationDropdown);
    const markReadBtn = document.getElementById('markAllReadBtn');
    if (markReadBtn) markReadBtn.addEventListener('click', markAllNotificationsRead);
    
    // Initial fetch
    if(localStorage.getItem('userId')) {
        fetchNotifications();
        // Subscribe to notifications realtime
        supabaseClient.channel('public:notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + localStorage.getItem('userId') }, payload => {
                fetchNotifications();
            })
            .subscribe();
    }

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
        let avatarUrl = localStorage.getItem('avatarUrl');
        if (avatarUrl) {
            navAvatarInitials.innerHTML = `<img src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" referrerpolicy="no-referrer" />`;
            navAvatarInitials.style.background = 'transparent';
        } else {
            navAvatarInitials.textContent = (currentUsername || 'U').charAt(0).toUpperCase();
        }
        let displayRole = 'KHÁCH HÀNG';
        if(userRole === 'admin') displayRole = 'ADMIN';
        if(userRole === 'super_admin') displayRole = 'TRÙM CUỐI';
        if(userRole === 'booster') displayRole = 'BOOSTER';
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
                } else if (session.user.app_metadata && session.user.app_metadata.provider === 'google') {
                    role = 'booster';
                    // Auto-register them in user_roles as booster
                    await supabaseClient.from('user_roles').upsert({ id: userId, username: session.user.email, role: 'booster' });
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
                if (session.user.user_metadata && session.user.user_metadata.avatar_url) {
                    localStorage.setItem('avatarUrl', session.user.user_metadata.avatar_url);
                } else if (session.user.user_metadata && session.user.user_metadata.picture) {
                    localStorage.setItem('avatarUrl', session.user.user_metadata.picture);
                }
                
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
                    renter_name: renter,
                    booster_name: '',
                    content: content,
                    price: price,
                    status: 'cho_xu_ly',
                    user_id: currentUserId || null
                }
            ]).select();

            if (error) {
                alert('Có lỗi xảy ra: ' + error.message);
            } else {
                alert('Tạo đơn cày thuê thành công!');
                localStorage.setItem('lastOrderTime', Date.now());
                if(data && data[0]) await logOrderAction(data[0].id, 'Đơn hàng mới được tạo.');
            
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
    else { 
        await logOrderAction(orderId, 'Đơn hàng đã được nhận bởi ' + localStorage.getItem('username'));
        alert('Nhận đơn thành công!'); fetchOrders(); 
    }
};

window.changeOrderStatus = async (orderId, newStatus, customerId) => {
    const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
        alert("Lỗi cập nhật trạng thái: " + error.message);
    } else {
        alert("Cập nhật thành công!");
        // Notify customer
        if (customerId && customerId !== 'null') {
            await supabaseClient.from('notifications').insert([{
                user_id: customerId,
                title: "Trạng thái đơn hàng",
                content: `Đơn cày của bạn đã được chuyển sang trạng thái mới.`,
                order_id: orderId
            }]);
        }
        await logOrderAction(orderId, 'Trạng thái đơn được cập nhật thành: ' + getStatusDetails(newStatus).text);
        if(newStatus === 'hoan_thanh') sendTelegramNotification('✅ Đơn #' + orderId + ' đã hoàn thành!');
        
        if (typeof fetchOrders === 'function') fetchOrders();
        if (typeof loadMyOrders === 'function') loadMyOrders();
    }
};

window.toggleNotificationDropdown = () => {
    const dropdown = document.getElementById('notificationDropdown');
    const badge = document.getElementById('notificationBadge');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
        if (dropdown.style.display === 'flex' && badge) badge.style.display = 'none'; // mark visually read
    }
};

window.fetchNotifications = async () => {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return;
    
    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20);
        
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    
    if (error || !list) return;
    
    if (data.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Không có thông báo</div>`;
        if (badge) badge.style.display = 'none';
        return;
    }
    
    list.innerHTML = '';
    let hasUnread = false;
    let currentUnreadCount = 0;
    
    data.forEach(notif => {
        if (!notif.is_read) {
            hasUnread = true;
            currentUnreadCount++;
        }
        const clickAction = (notif.order_id && notif.order_id !== 'null' && notif.order_id !== 'undefined') ? `onclick="window.openChat('${notif.order_id}', 'Đơn #${notif.order_id.slice(0,6).toUpperCase()}')"` : '';
        list.innerHTML += `
            <div ${clickAction} style="${clickAction ? 'cursor: pointer; transition: background 0.2s;' : ''} padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05); ${notif.is_read ? 'opacity: 0.7;' : 'background: rgba(168, 85, 247, 0.1);'}">
                <div style="font-weight: bold; font-size: 0.85rem; color: #fff; margin-bottom: 4px;">${notif.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${notif.content}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px; text-align: right;"><i class="fa-regular fa-clock"></i> ${new Date(notif.created_at).toLocaleString('vi-VN')}</div>
            </div>
        `;
    });
    
    let previousUnreadCount = parseInt(localStorage.getItem('unreadNotifs') || '0');
    if (currentUnreadCount > previousUnreadCount) {
        if (typeof playNotificationSound === 'function') {
            playNotificationSound();
        }
    }
    localStorage.setItem('unreadNotifs', currentUnreadCount);
    
    if (hasUnread && badge) {
        badge.style.display = 'block';
    }
};

window.markAllNotificationsRead = async () => {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return;
    await supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', currentUserId).eq('is_read', false);
    fetchNotifications();
};

// --- CHAT LOGIC ---
let currentChatSub = null;
let currentChatOrderId = null;

window.playNotificationSound = () => {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.4);
    } catch(e) { console.error('Audio play failed', e); }
};

window.openChat = async (orderId, orderCode) => {
    document.getElementById('chatOrderCode').textContent = orderCode || 'Chi tiết';
    document.getElementById('chatModal').classList.add('active');
    currentChatOrderId = orderId;
    
    const msgContainer = document.getElementById('chatMessages');
    msgContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 50px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';
    
    const { data, error } = await supabaseClient
        .from('order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
        
    msgContainer.innerHTML = '';
    if(error) {
        msgContainer.innerHTML = '<div style="color: red;">Lỗi tải tin nhắn: '+error.message+'</div>';
    } else {
        data.forEach(msg => appendMessage(msg));
    }

    // Subscribe to realtime messages
    if(currentChatSub) await supabaseClient.removeChannel(currentChatSub);
    currentChatSub = supabaseClient.channel('chat_'+orderId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages' }, payload => {
            if (payload.new.order_id === currentChatOrderId) {
                appendMessage(payload.new);
                if (payload.new.sender_id !== localStorage.getItem('userId')) {
                    playNotificationSound();
                }
            }
        })
        .subscribe((status) => {
            console.log('Realtime chat status:', status);
        });
};

window.appendMessage = function(msg) {
    const msgContainer = document.getElementById('chatMessages');
    if(!msgContainer) return;
    
    // Check for duplicates
    const msgId = msg.id || msg.created_at;
    if(msgContainer.querySelector(`[data-id="${msgId}"]`)) return;

    const isMine = msg.sender_id === localStorage.getItem('userId');
    const div = document.createElement('div');
    div.setAttribute('data-id', msgId);
    
    // Format timestamp
    const dateObj = new Date(msg.created_at || new Date());
    const timeStr = dateObj.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
    const dateStr = dateObj.toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'});
    const timestampHTML = `<div style="font-size: 0.6rem; margin-top: 4px; opacity: 0.7; text-align: ${isMine ? 'right' : 'left'};">${timeStr} ${dateStr}</div>`;
    
    div.style.cssText = `max-width: 80%; padding: 10px 15px; border-radius: 12px; margin-bottom: 5px; clear: both; ${isMine ? 'background: var(--accent); color: #000; align-self: flex-end; border-bottom-right-radius: 4px;' : 'background: #334155; color: #fff; align-self: flex-start; border-bottom-left-radius: 4px;'}`;
    
    let imgHtml = '';
    if (msg.image_url) {
        imgHtml = `<div style="margin-top: 8px;"><a href="${msg.image_url}" target="_blank"><img src="${msg.image_url}" style="max-width: 100%; max-height: 200px; border-radius: 6px; cursor: zoom-in;" /></a></div>`;
    }
    
    div.innerHTML = `<div style="font-size: 0.7rem; font-weight: bold; margin-bottom: 4px; ${isMine ? 'color: #333;' : 'color: var(--accent);'}">${msg.sender_name}</div><div style="word-break: break-word;">${msg.message}</div>${imgHtml}${timestampHTML}`;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
};

window.uploadChatImage = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentChatOrderId) return;
    
    event.target.value = '';
    
    if (file.size > 5 * 1024 * 1024) {
        return alert("Ảnh quá lớn, vui lòng chọn ảnh dưới 5MB!");
    }

    const chatInput = document.getElementById('chatInput');
    const sendChatBtn = document.getElementById('sendChatBtn');
    if (chatInput) chatInput.placeholder = "Đang tải ảnh lên...";
    if (sendChatBtn) sendChatBtn.disabled = true;

    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `${currentChatOrderId}/${fileName}`;
        
        const { error } = await supabaseClient.storage
            .from('chat_images')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
            
        if (error) throw error;
        
        const { data: { publicUrl } } = supabaseClient.storage
            .from('chat_images')
            .getPublicUrl(filePath);
            
        const newMsg = {
            order_id: currentChatOrderId,
            sender_id: localStorage.getItem('userId'),
            sender_name: localStorage.getItem('username'),
            message: 'Đã gửi một hình ảnh 🖼️',
            image_url: publicUrl,
            created_at: new Date().toISOString()
        };
        
        const { error: dbError } = await supabaseClient.from('order_messages').insert([newMsg]);
        if (dbError) throw dbError;
        
        const { data: orderData } = await supabaseClient.from('orders').select('user_id, booster_id').eq('id', currentChatOrderId).single();
        if (orderData) {
            const receiverId = localStorage.getItem('userId') === orderData.user_id ? orderData.booster_id : orderData.user_id;
            if (receiverId) {
                await supabaseClient.from('notifications').insert([{
                    user_id: receiverId,
                    title: "Tin nhắn mới",
                    content: `Bạn có tin nhắn mới từ ` + localStorage.getItem('username'),
                    order_id: currentChatOrderId
                }]);
            }
        }
    } catch (err) {
        console.error("Lỗi upload ảnh:", err);
        alert("Lỗi tải ảnh: " + err.message);
    } finally {
        if (chatInput) chatInput.placeholder = "Nhập tin nhắn...";
        if (sendChatBtn) sendChatBtn.disabled = false;
    }
};

window.closeChat = () => {
    const chatModal = document.getElementById('chatModal');
    if (chatModal) chatModal.classList.remove('active');
    if(currentChatSub && typeof supabaseClient !== 'undefined') {
        supabaseClient.removeChannel(currentChatSub);
    }
    currentChatSub = null;
    currentChatOrderId = null;
};

window.sendMessage = async () => {
    const chatInput = document.getElementById('chatInput');
    if(!chatInput) return;
    
    const text = chatInput.value.trim();
    if(!text || !currentChatOrderId) return;
    chatInput.value = '';
    
    const newMsg = {
        order_id: currentChatOrderId,
        sender_id: localStorage.getItem('userId'),
        sender_name: localStorage.getItem('username'),
        message: text,
        created_at: new Date().toISOString()
    };
    
    // Realtime will handle the UI update to avoid duplicates
    // if (typeof appendMessage === 'function') appendMessage(newMsg);
    
    const { error } = await supabaseClient.from('order_messages').insert([newMsg]);
    if (error) {
        alert("Lỗi gửi tin nhắn: " + error.message);
    } else {
        // Determine who to notify
        const { data: orderData } = await supabaseClient.from('orders').select('user_id, booster_id').eq('id', currentChatOrderId).single();
        if (orderData) {
            const receiverId = localStorage.getItem('userId') === orderData.user_id ? orderData.booster_id : orderData.user_id;
            if (receiverId) {
                await supabaseClient.from('notifications').insert([{
                    user_id: receiverId,
                    title: "Tin nhắn mới",
                    content: `Bạn có tin nhắn mới từ ` + localStorage.getItem('username'),
                    order_id: currentChatOrderId
                }]);
            }
        }
    }
};

// --- RATING LOGIC ---
let currentRatingOrderId = null;
let currentRatingValue = 0;

window.openRatingModal = (orderId) => {
    currentRatingOrderId = orderId;
    currentRatingValue = 0;
    const commentInput = document.getElementById('ratingComment');
    if (commentInput) commentInput.value = '';
    const textDisplay = document.getElementById('ratingText');
    if (textDisplay) {
        textDisplay.textContent = 'Chưa chọn';
        textDisplay.style.color = 'var(--text-muted)';
    }
    document.querySelectorAll('.rating-stars i').forEach(star => {
        star.classList.remove('active');
        star.style.color = '#334155';
    });
    const ratingModal = document.getElementById('ratingModal');
    if(ratingModal) ratingModal.classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.rating-stars i');
    const ratingText = document.getElementById('ratingText');
    const texts = ['Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            currentRatingValue = parseInt(star.getAttribute('data-value'));
            stars.forEach((s, i) => {
                if (i < currentRatingValue) {
                    s.classList.add('active');
                    s.style.color = '#eab308';
                } else {
                    s.classList.remove('active');
                    s.style.color = '#334155';
                }
            });
            if (ratingText) {
                ratingText.textContent = texts[currentRatingValue - 1];
                ratingText.style.color = '#eab308';
            }
        });
    });

    const submitRatingBtn = document.getElementById('submitRatingBtn');
    if (submitRatingBtn) {
        submitRatingBtn.addEventListener('click', async () => {
            if (currentRatingValue === 0) return alert("Vui lòng chọn số sao!");
            const comment = document.getElementById('ratingComment').value.trim();
            
            submitRatingBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG GỬI...';
            
            const { error } = await supabaseClient
                .from('orders')
                .update({ rating: currentRatingValue, review_comment: comment })
                .eq('id', currentRatingOrderId);
                
            if (error) {
                alert("Có lỗi xảy ra: " + error.message);
            } else {
                alert("Cảm ơn bạn đã đánh giá!");
                document.getElementById('ratingModal').classList.remove('active');
                if (typeof fetchOrders === 'function') fetchOrders();
                if (typeof window.loadMyOrders === 'function') window.loadMyOrders();
                else {
                    document.dispatchEvent(new Event('reloadProfileOrders'));
                }
            }
            submitRatingBtn.innerHTML = 'GỬI ĐÁNH GIÁ';
        });
    }
});


// --- MOBILE MENU TOGGLE ---
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});

// --- GIAI DOAN 2 PRO FEATURES ---

// 1. Leaderboard Logic
async function fetchLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    
    const { data, error } = await supabaseClient
        .from('user_roles')
        .select('*')
        .eq('role', 'booster')
        .order('orders_completed', { ascending: false })
        .limit(5);
        
    if (error || !data || data.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Chưa có dữ liệu</div>';
        return;
    }
    
    list.innerHTML = '';
    data.forEach((b, index) => {
        let badgeIcon = '';
        let badgeColor = '';
        if (index === 0) { badgeIcon = 'fa-trophy'; badgeColor = '#f59e0b'; } // Vang
        else if (index === 1) { badgeIcon = 'fa-medal'; badgeColor = '#94a3b8'; } // Bac
        else if (index === 2) { badgeIcon = 'fa-award'; badgeColor = '#b45309'; } // Dong
        else { badgeIcon = 'fa-star'; badgeColor = 'var(--text-muted)'; }
        
        const avatar = b.avatar_url || 'https://via.placeholder.com/40/a855f7/fff?text=' + b.username.charAt(0).toUpperCase();
        
        list.innerHTML += `
            <div class="lb-item">
                <div class="lb-rank-badge" style="background: ${index < 3 ? 'rgba(255,255,255,0.1)' : 'transparent'}; color: ${badgeColor}">
                    #${index + 1}
                </div>
                <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" alt="Ava">
                <div class="lb-info">
                    <div class="lb-name">${b.username}</div>
                    <div class="lb-stats">${b.orders_completed || 0} đơn hoàn thành</div>
                </div>
                <div class="lb-badge" style="color: ${badgeColor}"><i class="fa-solid ${badgeIcon}"></i></div>
            </div>
        `;
    });
}

// 2. Price Calculator
window.calculatePrice = function() {
    const service = document.getElementById('calcService').value;
    const extra = document.getElementById('calcExtraOptions');
    const priceInput = document.getElementById('orderPrice');
    
    extra.style.display = 'none';
    extra.innerHTML = '';
    
    if (service === 'lahoan') {
        priceInput.value = 100000;
        extra.style.display = 'block';
        extra.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Giá tham khảo: 100,000 VNĐ cho La Hoàn tầng 9-12 full sao.</div>';
    } else if (service === 'khampha') {
        extra.style.display = 'block';
        extra.innerHTML = '<select id="calcRegion" class="form-control" onchange="window.updateKhamPhaPrice()"><option value="mond">Mondstadt (150k)</option><option value="liyue">Liyue (250k)</option><option value="sumeru">Sumeru (350k)</option><option value="natlan">Natlan (400k)</option></select>';
        window.updateKhamPhaPrice();
    } else if (service === 'theluc') {
        priceInput.value = 20000;
        extra.style.display = 'block';
        extra.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Giá tham khảo: 20,000 VNĐ/Ngày xả nhựa + Ủy thác.</div>';
    } else {
        priceInput.value = '';
    }
};

window.updateKhamPhaPrice = function() {
    const region = document.getElementById('calcRegion');
    if(!region) return;
    const val = region.value;
    let price = 0;
    if(val === 'mond') price = 150000;
    if(val === 'liyue') price = 250000;
    if(val === 'sumeru') price = 350000;
    if(val === 'natlan') price = 400000;
    document.getElementById('orderPrice').value = price;
};

// 3. Chat/Logs Tabs
window.switchChatTab = function(tab) {
    document.getElementById('tabBtnChat').classList.remove('active');
    document.getElementById('tabBtnChat').style.borderBottomColor = 'transparent';
    document.getElementById('tabBtnChat').style.color = 'var(--text-muted)';
    
    document.getElementById('tabBtnLogs').classList.remove('active');
    document.getElementById('tabBtnLogs').style.borderBottomColor = 'transparent';
    document.getElementById('tabBtnLogs').style.color = 'var(--text-muted)';
    
    document.getElementById('chatTabContent').style.display = 'none';
    document.getElementById('logsTabContent').style.display = 'none';
    
    if (tab === 'chat') {
        document.getElementById('tabBtnChat').classList.add('active');
        document.getElementById('tabBtnChat').style.borderBottomColor = 'var(--accent)';
        document.getElementById('tabBtnChat').style.color = '#fff';
        document.getElementById('chatTabContent').style.display = 'block';
    } else {
        document.getElementById('tabBtnLogs').classList.add('active');
        document.getElementById('tabBtnLogs').style.borderBottomColor = 'var(--accent)';
        document.getElementById('tabBtnLogs').style.color = '#fff';
        document.getElementById('logsTabContent').style.display = 'block';
        window.fetchOrderLogs(); // Need activeOrderId
    }
};

// 4. Order Logs System
async function logOrderAction(orderId, actionText) {
    const userId = localStorage.getItem('userId') || null;
    await supabaseClient.from('order_logs').insert([
        { order_id: orderId, user_id: userId, action: actionText }
    ]);
}

window.fetchOrderLogs = async function() {
    if(!currentChatOrderId) return;
    const container = document.getElementById('orderLogsContainer');
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải nhật ký...</div>';
    
    const { data, error } = await supabaseClient
        .from('order_logs')
        .select('*, profiles:user_id(username, role)')
        .eq('order_id', currentChatOrderId)
        .order('created_at', { ascending: false });
        
    if (error || !data || data.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Chưa có nhật ký hoạt động.</div>';
        return;
    }
    
    container.innerHTML = '';
    data.forEach(log => {
        const time = new Date(log.created_at).toLocaleString('vi-VN');
        const username = log.profiles ? log.profiles.username : 'Hệ thống';
        const role = log.profiles ? log.profiles.role : '';
        const roleBadge = role === 'booster' ? '<span class="badge badge-warning" style="font-size:0.6rem; padding: 2px 5px;">Booster</span>' : '';
        
        container.innerHTML += `
            <div style="background: rgba(255,255,255,0.02); border-left: 3px solid var(--accent); padding: 10px 15px; border-radius: 4px; font-size: 0.85rem; margin-bottom: 10px;">
                <div style="color: var(--primary-light); font-weight: bold; margin-bottom: 5px;">
                    ${username} ${roleBadge}
                    <span style="float: right; color: var(--text-muted); font-weight: normal; font-size: 0.75rem;">${time}</span>
                </div>
                <div style="color: #fff;">${log.action}</div>
            </div>
        `;
    });
};

// 5. Ticket System
window.openTicketModal = function(orderId) {
    window.ticketOrderId = orderId;
    document.getElementById('ticketComment').value = '';
    document.getElementById('ticketModal').classList.add('active');
};

document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('leaderboardList')) fetchLeaderboard();
});

window.submitTicket = async function() {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return alert('Vui lòng đăng nhập!');
    const issue = document.getElementById('ticketIssueType').value;
    const desc = document.getElementById('ticketComment').value;
    
    if(!desc.trim()) return alert('Vui lòng mô tả chi tiết sự cố!');
    
    const btn = document.getElementById('submitTicketBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
    btn.disabled = true;
    
    const { error } = await supabaseClient.from('support_tickets').insert([
        { order_id: window.ticketOrderId, user_id: currentUser.id, issue_type: issue, description: desc }
    ]);
    
    if (error) {
        alert('Lỗi: ' + error.message);
    } else {
        alert('Gửi khiếu nại thành công! Admin sẽ xử lý sớm nhất.');
        document.getElementById('ticketModal').classList.remove('active');
        sendTelegramNotification(`🚨 KHIẾU NẠI MỚI - Đơn #${window.ticketOrderId}\nLý do: ${issue}\nChi tiết: ${desc}`);
    }
    
    btn.innerHTML = 'GỬI KHIẾU NẠI';
    btn.disabled = false;
};

// 6. Telegram API Notification (Skeleton)
// You need to fill BOT_TOKEN and CHAT_ID
const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

async function sendTelegramNotification(message) {
    if(TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
        console.log("Telegram Bot Token is not configured. Message:", message);
        return;
    }
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message
            })
        });
    } catch(e) {
        console.error("Telegram error:", e);
    }
}


// --- NEW RENDER & FILTER LOGIC ---
let currentTab = 'all';
let currentSearch = '';
let currentService = 'all';
let currentSort = 'newest';

window.filterByTab = function(tab) {
    currentTab = tab;
    // Update active UI
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(document.getElementById('tab-' + tab)) {
        document.getElementById('tab-' + tab).classList.add('active');
    }
    window.applyFilters();
};

window.applyFilters = function() {
    currentSearch = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    currentService = document.getElementById('filterService') ? document.getElementById('filterService').value : 'all';
    currentSort = document.getElementById('filterSort') ? document.getElementById('filterSort').value : 'newest';
    
    let filtered = allOrders.filter(order => {
        // Tab filter
        if (currentTab !== 'all' && order.status !== currentTab) return false;
        
        // Service filter (fuzzy matching since service is stored in orderContent)
        if (currentService !== 'all' && order.content) {
            if (!order.content.toLowerCase().includes(currentService.toLowerCase())) return false;
        }
        
        // Search filter
        if (currentSearch) {
            const code = order.order_code ? order.order_code.toLowerCase() : '';
            const renter = order.renter_name ? order.renter_name.toLowerCase() : '';
            const content = order.content ? order.content.toLowerCase() : '';
            if (!code.includes(currentSearch) && !renter.includes(currentSearch) && !content.includes(currentSearch)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort
    filtered.sort((a, b) => {
        if (currentSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (currentSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (currentSort === 'price_desc') return (b.price || 0) - (a.price || 0);
        if (currentSort === 'price_asc') return (a.price || 0) - (b.price || 0);
        return 0;
    });
    
    renderOrders(filtered, 'ordersGrid');
};

function updateDashboardStats(orders) {
    if(!document.getElementById('totalOrdersBadge')) return;
    
    let pending = 0;
    let progress = 0;
    let warning = 0; // arbitrary near deadline logic
    let completed = 0;
    
    let counts = { all: orders.length, cho_xu_ly: 0, dang_cay: 0, cho_nghiem_thu: 0, hoan_thanh: 0 };
    
    orders.forEach(o => {
        if (counts[o.status] !== undefined) counts[o.status]++;
        
        if (o.status === 'cho_xu_ly') pending++;
        else if (o.status === 'dang_cay') progress++;
        else if (o.status === 'hoan_thanh') completed++;
        
        // Check near deadline (e.g., within 24h, just a placeholder if deadline doesn't exist)
    });
    
    document.getElementById('totalOrdersBadge').innerText = `${orders.length} đơn`;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-progress').innerText = progress;
    document.getElementById('stat-warning').innerText = warning; // Need deadline in DB for real logic
    document.getElementById('stat-completed').innerText = completed;
    
    // Update tab counts
    ['all', 'cho_xu_ly', 'dang_cay', 'cho_nghiem_thu', 'hoan_thanh'].forEach(status => {
        const el = document.getElementById('count-' + status);
        if (el) el.innerText = counts[status] || 0;
    });
}

function maskString(str) {
    if (!str) return '***';
    if (str.length <= 3) return str + '***';
    return str.substring(0, 3) + '***' + str.substring(str.length - 1);
}

function renderOrders(ordersToRender, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole') || 'guest';
    const currentUsername = localStorage.getItem('username');
    const currentUserId = localStorage.getItem('userId');

    container.innerHTML = '';

    if (ordersToRender.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 60px; background: rgba(255,255,255,0.02); border-radius: 14px;"><i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i><br>Không có đơn hàng nào khớp với tìm kiếm của bạn.</div>';
        return;
    }

    ordersToRender.forEach((order, index) => {
        const statusInfo = getStatusDetails(order.status);
        const isOwner = (order.user_id === currentUserId) || (order.renter_name === currentUsername);
        const isAssignedBooster = order.booster_id === currentUserId;
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        const isBoosterRole = userRole === 'booster';
        const canViewPrivate = isAdmin || isOwner || isAssignedBooster;

        let priceHtml = '';
        if (canViewPrivate) {
            priceHtml = `${order.price ? parseInt(order.price).toLocaleString('vi-VN') + ' đ' : 'Chưa báo giá'}`;
        } else {
            priceHtml = `<span style="font-size: 14px;"><i class="fa-solid fa-lock"></i> Ẩn</span>`;
        }

        let actionButtons = '';
        if (isLoggedIn) {
            if (order.status === 'cho_xu_ly' && (isBoosterRole || isAdmin) && !order.booster_id) {
                actionButtons += `<button onclick="acceptOrder('${order.id}')" class="btn btn-primary" style="flex:1"><i class="fa-solid fa-handshake"></i> Nhận đơn</button>`;
            }
            if (isAssignedBooster || isAdmin) {
                actionButtons += `
                    <select onchange="changeOrderStatus('${order.id}', this.value, '${order.user_id}')" style="background: rgba(0,0,0,0.5); color: #fff; border: 1px solid var(--border-light); border-radius: 10px; padding: 8px 12px; flex:1; outline: none; cursor: pointer;">
                        <option value="cho_xu_ly" ` + (order.status === 'cho_xu_ly' ? 'selected' : '') + `>Chờ xử lý</option>
                        <option value="dang_cay" ` + (order.status === 'dang_cay' ? 'selected' : '') + `>Đang cày</option>
                        <option value="hoan_thanh" ` + (order.status === 'hoan_thanh' ? 'selected' : '') + `>Hoàn thành</option>
                        <option value="tam_dung" ` + (order.status === 'tam_dung' ? 'selected' : '') + `>Tạm dừng</option>
                    </select>
                `;
            }
            if (isOwner) {
                if (order.status !== 'cho_xu_ly') {
                    actionButtons += `<button onclick="window.openTicketModal('${order.id}')" class="btn btn-outline" style="border: 1px solid var(--status-tam-dung); color: var(--status-tam-dung); flex: 0.5;"><i class="fa-solid fa-triangle-exclamation"></i> Báo cáo</button>`;
                }
            }
            if (canViewPrivate) {
                actionButtons += `<button onclick="window.openChat('${order.id}', '${order.order_code}')" class="btn" style="background: var(--primary); color: #fff; flex: 1;"><i class="fa-solid fa-comments"></i> Chat</button>`;
            }
        }

        let ratingHtml = '';
        if (order.rating) {
            let stars = '';
            for(let i=1; i<=5; i++) {
                stars += `<i class="fa-solid fa-star" style="color: ${i <= order.rating ? 'var(--genshin-gold)' : 'var(--border-light)'}; font-size: 12px;"></i>`;
            }
            ratingHtml = `
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; margin-top: 12px;">
                    <div>${stars}</div>
                    <div style="color: var(--text-light); font-size: 12px; margin-top: 4px;"><i>"${order.review_comment || ''}"</i></div>
                </div>
            `;
        } else if (order.status === 'hoan_thanh' && isOwner) {
            actionButtons += `<button onclick="openRatingModal('${order.id}')" class="btn" style="background: var(--genshin-gold); color: #000; flex: 1;"><i class="fa-solid fa-star"></i> Đánh giá</button>`;
        }

        const html = `
            <div class="card order-card-modern animate-on-load" style="animation-delay: ${0.1 + (index%10)*0.05}s;">
                <div class="oc-header">
                    <div>
                        <div class="oc-id">${order.order_code || '#-----'}</div>
                        <h3 class="oc-title">${order.content ? order.content.substring(0, 35) + (order.content.length > 35 ? '...' : '') : 'Không có mô tả'}</h3>
                    </div>
                    <div class="oc-status" style="background: ${statusInfo.colorVar}20; color: ${statusInfo.colorVar}; border: 1px solid ${statusInfo.colorVar}40;">
                        <i class="fa-solid ${statusInfo.icon}"></i> ${statusInfo.text}
                    </div>
                </div>
                
                <div class="oc-body">
                    <div class="oc-row">
                        <span class="oc-label">Trò chơi</span>
                        <span class="oc-value"><i class="fa-solid fa-gamepad" style="color: var(--primary-light)"></i> Genshin Impact</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Người thuê</span>
                        <span class="oc-value">${isAdmin ? order.renter_name : maskString(order.renter_name)}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Booster</span>
                        <span class="oc-value" style="color: var(--secondary)">${order.booster_name || 'Chưa nhận'}</span>
                    </div>
                    <div class="oc-row" style="align-items: center; margin-top: 8px;">
                        <span class="oc-label">Giá</span>
                        <span class="oc-price">${priceHtml}</span>
                    </div>
                    
                    ${order.status === 'dang_cay' ? `
                    <div class="oc-progress-wrap">
                        <div class="oc-progress-bar">
                            <div class="oc-progress-fill" style="width: 50%;"></div>
                        </div>
                        <div class="oc-progress-text">
                            <span>Tiến độ</span>
                            <span>50%</span>
                        </div>
                    </div>` : ''}
                </div>
                
                ${ratingHtml}
                
                ${actionButtons ? `<div class="oc-footer">${actionButtons}</div>` : ''}
            </div>
        `;
        container.innerHTML += html;
    });
}


// Format time relative
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `Vừa xong`;
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return `${Math.floor(diff/86400)} ngày trước`;
}
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const notifBtn = document.getElementById('notificationBtn');
    const dropdown = document.getElementById('notificationDropdown');
    if(notifBtn && dropdown) {
        if(!notifBtn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    }
});


