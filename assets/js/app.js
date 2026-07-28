// 1. Initialize Supabase
const SUPABASE_URL = 'https://vqnuutdmcekqkbdvawlw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbnV1dGRtY2VrcWtiZHZhd2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTgwNjIsImV4cCI6MjEwMDM3NDA2Mn0.T8_AdJOWEmf68oVrOjv8G51IScykzqhBnfHIi5LK-G4';

let supabaseClient = null;
let allOrders = [];
let currentChatSub = null;
let currentChatOrderId = null;
let currentUser = null; 
let currentTab = 'all';
let currentSearch = '';
let currentService = 'all';
let currentSort = 'newest';

// --- Helper Functions ---
window.animateCountUp = function(element, target, duration = 1500) {
    if(!element) return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
        element.innerText = target;
        return;
    }
    const start = parseInt(element.innerText.replace(/\D/g, '')) || 0;
    const diff = target - start;
    if (diff === 0) {
        element.innerText = target;
        return;
    }
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        element.innerText = Math.floor(start + diff * easeOut);
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.innerText = target;
        }
    }
    requestAnimationFrame(update);
};

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
    return `${Math.floor(diff/86400)} ngày trước`;
}

function getStatusDetails(status) {
    const s = {
        'cho_xu_ly': { text: 'Chờ xử lý', color: 'status-cho-xu-ly', icon: 'fa-clock', colorVar: '#3b82f6' },
        'dang_cay': { text: 'Đang cày', color: 'status-dang-cay', icon: 'fa-spinner fa-spin', colorVar: '#f59e0b' },
        'cho_nghiem_thu': { text: 'Chờ nghiệm thu', color: 'status-cho-nghiem-thu', icon: 'fa-eye', colorVar: '#a855f7' },
        'hoan_thanh': { text: 'Hoàn thành', color: 'status-hoan-thanh', icon: 'fa-check-circle', colorVar: '#22c55e' },
        'tam_dung': { text: 'Tạm dừng', color: 'status-tam-dung', icon: 'fa-pause-circle', colorVar: '#ef4444' }
    };
    return s[status] || s['cho_xu_ly'];
}

function maskString(str) {
    if (!str) return '***';
    if (str.length <= 3) return str + '***';
    return str.substring(0, 3) + '***' + str.substring(str.length - 1);
}

const TELEGRAM_BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_CHAT_ID_HERE';

window.sendTelegramNotification = async function(message) {
    if(TELEGRAM_BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') return;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
        });
    } catch(e) { console.error("Telegram error:", e); }
};

window.logOrderAction = async function(orderId, actionText) {
    const userId = localStorage.getItem('userId') || null;
    if(!supabaseClient) return;
    await supabaseClient.from('order_logs').insert([{ order_id: orderId, user_id: userId, action: actionText }]);
};

// --- Main App Logic ---

window.fetchOrders = async function() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allOrders = data || [];
        
        window.applyFilters();
        if(typeof window.updateDashboardStats === 'function') window.updateDashboardStats(allOrders);
    } catch (error) {
        console.error("Lỗi tải đơn hàng:", error.message);
        const grid = document.getElementById('ordersGrid');
        if(grid) grid.innerHTML = '<div style="color: var(--status-tam-dung); grid-column: 1/-1; text-align: center; padding: 20px;">Lỗi kết nối tới cơ sở dữ liệu. Vui lòng tải lại trang.</div>';
    }
};

window.applyFilters = function() {
    const searchEl = document.getElementById('searchInput');
    const serviceEl = document.getElementById('filterService');
    const sortEl = document.getElementById('filterSort');
    
    currentSearch = searchEl ? searchEl.value.toLowerCase() : '';
    currentService = serviceEl ? serviceEl.value : 'all';
    currentSort = sortEl ? sortEl.value : 'newest';
    
    let filtered = allOrders.filter(order => {
        if (currentTab !== 'all' && order.status !== currentTab) return false;
        if (currentService !== 'all' && order.content && !order.content.toLowerCase().includes(currentService.toLowerCase())) return false;
        
        if (currentSearch) {
            const code = order.order_code ? order.order_code.toLowerCase() : '';
            const renter = order.renter_name ? order.renter_name.toLowerCase() : '';
            const content = order.content ? order.content.toLowerCase() : '';
            const booster = order.booster_name ? order.booster_name.toLowerCase() : '';
            if (!code.includes(currentSearch) && !renter.includes(currentSearch) && !content.includes(currentSearch) && !booster.includes(currentSearch)) {
                return false;
            }
        }
        return true;
    });
    
    filtered.sort((a, b) => {
        if (currentSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (currentSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (currentSort === 'price_desc') return (b.price || 0) - (a.price || 0);
        if (currentSort === 'price_asc') return (a.price || 0) - (b.price || 0);
        return 0;
    });
    
    window.renderOrders(filtered, 'ordersGrid');
};

window.filterByTab = function(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const tabBtn = document.getElementById('tab-' + tab);
    if(tabBtn) tabBtn.classList.add('active');
    window.applyFilters();
};

window.renderOrders = function(ordersToRender, containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole') || 'guest';
    const currentUsername = localStorage.getItem('username');
    const currentUserId = localStorage.getItem('userId');

    container.innerHTML = '';

    if (!ordersToRender || ordersToRender.length === 0) {
        container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 80px 20px; background: rgba(255,255,255,0.02); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.1);">
            <img src="/assets/images/empty-paimon.png" alt="Empty" style="width: 120px; opacity: 0.7; margin-bottom: 20px; filter: grayscale(50%);" onerror="this.style.display='none'">
            <h3 style="color: var(--text-light); font-size: 1.5rem; margin-bottom: 10px; font-weight: 700;">Chưa có đơn cày phù hợp</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px;">Không tìm thấy đơn hàng nào khớp với yêu cầu hiện tại của bạn. Hãy thử thay đổi bộ lọc hoặc tạo một yêu cầu mới.</p>
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="window.openCreateOrderModal()"><i class="fa-solid fa-plus"></i> Tạo đơn Genshin</button>
                <button class="btn" style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1);" onclick="document.getElementById('searchInput').value=''; document.getElementById('filterService').value='all'; window.filterByTab('all');"><i class="fa-solid fa-filter-circle-xmark"></i> Xóa bộ lọc</button>
            </div>
        </div>`;
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
            if (order.price) {
                priceHtml = `<span class="count-up-price" data-val="${parseInt(order.price)}">0</span> đ`;
            } else {
                priceHtml = 'Chưa báo giá';
            }
        } else {
            priceHtml = `<span style="font-size: 14px;"><i class="fa-solid fa-lock"></i> Ẩn</span>`;
        }

        let actionButtons = '';
        if (isLoggedIn) {
            if (isAdmin) {
                actionButtons += `
                    <select onchange="changeOrderStatus('${order.id}', this.value, '${order.user_id}')" style="background: rgba(0,0,0,0.5); color: #fff; border: 1px solid var(--border-light); border-radius: 10px; padding: 8px 12px; flex:1; outline: none; cursor: pointer;">
                        <option value="cho_xu_ly" ${order.status === 'cho_xu_ly' ? 'selected' : ''}>Chờ xử lý</option>
                        <option value="dang_cay" ${order.status === 'dang_cay' ? 'selected' : ''}>Đang cày</option>
                        <option value="cho_nghiem_thu" ${order.status === 'cho_nghiem_thu' ? 'selected' : ''}>Chờ nghiệm thu</option>
                        <option value="hoan_thanh" ${order.status === 'hoan_thanh' ? 'selected' : ''}>Hoàn thành</option>
                        <option value="tam_dung" ${order.status === 'tam_dung' ? 'selected' : ''}>Tạm dừng</option>
                    </select>
                `;
            } else if (isBoosterRole) {
                if (order.status === 'cho_xu_ly' && !order.booster_id) {
                    actionButtons += `<button onclick="acceptOrder('${order.id}')" class="btn btn-primary" style="flex:1"><i class="fa-solid fa-handshake"></i> Nhận đơn</button>`;
                } else if (isAssignedBooster && order.status === 'dang_cay') {
                    actionButtons += `<button onclick="changeOrderStatus('${order.id}', 'cho_nghiem_thu', '${order.user_id}')" class="btn" style="background: var(--status-cho-nghiem-thu); color: #000; flex:1"><i class="fa-solid fa-check"></i> Gửi kết quả</button>`;
                }
            } else if (isOwner) {
                if (order.status === 'cho_nghiem_thu') {
                    actionButtons += `<button onclick="changeOrderStatus('${order.id}', 'hoan_thanh', '${order.user_id}')" class="btn" style="background: var(--status-hoan-thanh); color: #fff; flex:1"><i class="fa-solid fa-clipboard-check"></i> Nghiệm thu</button>`;
                }
            }

            if (isOwner && order.status !== 'cho_xu_ly') {
                actionButtons += `<button onclick="window.openTicketModal('${order.id}')" class="btn btn-outline" style="border: 1px solid var(--status-tam-dung); color: var(--status-tam-dung); flex: 0.5;"><i class="fa-solid fa-triangle-exclamation"></i> Báo cáo</button>`;
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

        let displayTitle = 'Không có mô tả';
        let server = 'Chưa xác định';
        let serviceGroup = 'Khác';
        let deadlineStr = 'Chưa rõ';
        let rawGoal = order.content || '';
        
        if (rawGoal.startsWith('[')) {
            const serverMatch = rawGoal.match(/^\[(.*?)\]/);
            const groupMatch = rawGoal.match(/^\[.*?\] \[([^\]]+)\]/);
            const dlMatch = rawGoal.match(/Deadline:\s*([^\n]+)/);
            
            if (serverMatch) server = serverMatch[1];
            if (groupMatch) serviceGroup = groupMatch[1];
            if (dlMatch) deadlineStr = dlMatch[1];
            
            const firstLine = rawGoal.split('\n')[0];
            const titleMatch = firstLine.match(/^\[.*?\] \[.*?\] (.*)/);
            if (titleMatch) displayTitle = titleMatch[1];
            else displayTitle = firstLine;
        } else {
            displayTitle = rawGoal.substring(0, 45) + (rawGoal.length > 45 ? '...' : '');
        }
        
        let calculatedProgress = 0;
        if (order.status === 'cho_xu_ly') calculatedProgress = 0;
        else if (order.status === 'dang_cay') calculatedProgress = 40;
        else if (order.status === 'cho_nghiem_thu') calculatedProgress = 90;
        else if (order.status === 'hoan_thanh') calculatedProgress = 100;
        else if (order.status === 'tam_dung') calculatedProgress = 30;

        const html = `
            <div class="card order-card-modern animate-on-load" style="animation-delay: ${0.1 + (index%10)*0.05}s;">
                <div class="oc-header">
                    <div>
                        <div class="oc-id">${order.order_code || '#-----'}</div>
                        <h3 class="oc-title">${displayTitle}</h3>
                    </div>
                    <div class="oc-status" style="background: ${statusInfo.colorVar}20; color: ${statusInfo.colorVar}; border: 1px solid ${statusInfo.colorVar}40;">
                        <i class="fa-solid ${statusInfo.icon}"></i> ${statusInfo.text}
                    </div>
                </div>
                
                <div class="oc-body">
                    <div class="oc-row">
                        <span class="oc-label">Dịch vụ</span>
                        <span class="oc-value"><i class="fa-solid fa-gamepad" style="color: var(--primary-light)"></i> ${serviceGroup}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Máy chủ</span>
                        <span class="oc-value">${server}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Người thuê</span>
                        <span class="oc-value">${isAdmin ? (order.renter_name || 'Khách') : maskString(order.renter_name)}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Booster</span>
                        <span class="oc-value" style="color: var(--secondary)">${order.booster_name || 'Chưa nhận'}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Thời hạn</span>
                        <span class="oc-value">${deadlineStr}</span>
                    </div>
                    <div class="oc-row" style="align-items: center; margin-top: 8px;">
                        <span class="oc-label">Giá</span>
                        <span class="oc-price">${priceHtml}</span>
                    </div>
                    ${calculatedProgress > 0 ? `
                    <div class="oc-progress-wrap">
                        <div class="oc-progress-bar"><div class="oc-progress-fill" style="width: ${calculatedProgress}%;"></div></div>
                        <div class="oc-progress-text"><span>Tiến độ</span><span>${calculatedProgress}%</span></div>
                    </div>` : ''}
                </div>
                
                ${ratingHtml}
                ${actionButtons ? `<div class="oc-footer" style="display: flex; gap: 10px; margin-top: 15px;">${actionButtons}</div>` : ''}
            </div>
        `;
        container.innerHTML += html;
    });

    // Add Intersection Observer for prices
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const targetVal = parseInt(el.getAttribute('data-val'));
                
                const start = 0;
                const duration = 1200;
                const startTime = performance.now();
                const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                
                if (isReduced) {
                    el.innerText = targetVal.toLocaleString('vi-VN');
                    obs.unobserve(el);
                    return;
                }

                function update(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    el.innerText = Math.floor(start + targetVal * easeOut).toLocaleString('vi-VN');
                    
                    if (progress < 1) {
                        requestAnimationFrame(update);
                    } else {
                        el.innerText = targetVal.toLocaleString('vi-VN');
                    }
                }
                requestAnimationFrame(update);
                obs.unobserve(el); // run only once
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.count-up-price').forEach(price => observer.observe(price));
};

window.updateDashboardStats = function(orders) {
    if(!document.getElementById('totalOrdersBadge')) return;
    let counts = { all: orders.length, cho_xu_ly: 0, dang_cay: 0, cho_nghiem_thu: 0, hoan_thanh: 0, tam_dung: 0 };
    orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
    
    document.getElementById('totalOrdersBadge').innerText = `${orders.length} đơn`;
    
    ['all', 'cho_xu_ly', 'dang_cay', 'cho_nghiem_thu', 'hoan_thanh'].forEach(status => {
        const el = document.getElementById('count-' + status);
        if (el) window.animateCountUp(el, counts[status] || 0, 800);
    });

    const sidebar = document.getElementById('dynamicSidebar');
    if (!sidebar) return;

    const userRole = localStorage.getItem('userRole') || 'guest';
    const currentUserId = localStorage.getItem('userId');
    const currentUsername = localStorage.getItem('username');

    let html = '';

    if (userRole === 'admin' || userRole === 'super_admin') {
        const revenue = orders.filter(o => o.status === 'hoan_thanh').reduce((sum, o) => sum + (o.price || 0), 0);
        html = `
        <div class="stats-card">
            <h3 class="stats-title"><i class="fa-solid fa-crown" style="color: var(--genshin-gold)"></i> QUẢN TRỊ VIÊN</h3>
            <div class="stat-item">
                <span class="stat-label">Tổng đơn hệ thống</span>
                <span class="stat-value" id="stat-total" style="color: #fff">${orders.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Tổng doanh thu</span>
                <span class="stat-value count-up-price" data-val="${revenue}" style="color: var(--status-hoan-thanh)">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Khiếu nại / Report</span>
                <span class="stat-value" id="stat-reports" style="color: var(--status-tam-dung)">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Đơn quá hạn</span>
                <span class="stat-value" style="color: #f43f5e">0</span>
            </div>
        </div>`;
    } else if (userRole === 'booster') {
        const myOrders = orders.filter(o => o.booster_id === currentUserId);
        const income = myOrders.filter(o => o.status === 'hoan_thanh').reduce((sum, o) => sum + (o.price || 0), 0);
        const active = myOrders.filter(o => o.status === 'dang_cay').length;
        html = `
        <div class="stats-card">
            <h3 class="stats-title"><i class="fa-solid fa-bolt" style="color: var(--primary)"></i> THỐNG KÊ BOOSTER</h3>
            <div class="stat-item">
                <span class="stat-label">Đơn đang cày</span>
                <span class="stat-value" id="stat-booster-active" style="color: var(--status-dang-cay)">${active}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Thu nhập ước tính</span>
                <span class="stat-value count-up-price" data-val="${income}" style="color: var(--status-hoan-thanh)">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Điểm đánh giá</span>
                <span class="stat-value" style="color: var(--genshin-gold)"><i class="fa-solid fa-star"></i> 5.0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Tỷ lệ đúng hạn</span>
                <span class="stat-value" style="color: #10b981">100%</span>
            </div>
        </div>`;
    } else {
        const myOrders = orders.filter(o => (o.user_id === currentUserId) || (o.renter_name === currentUsername));
        const spent = myOrders.filter(o => o.status === 'hoan_thanh').reduce((sum, o) => sum + (o.price || 0), 0);
        const active = myOrders.filter(o => o.status === 'dang_cay').length;
        const waiting = myOrders.filter(o => o.status === 'cho_nghiem_thu').length;
        html = `
        <div class="stats-card">
            <h3 class="stats-title"><i class="fa-solid fa-user" style="color: var(--secondary)"></i> THỐNG KÊ CỦA BẠN</h3>
            <div class="stat-item">
                <span class="stat-label">Đơn đang hoạt động</span>
                <span class="stat-value" id="stat-customer-active" style="color: var(--status-dang-cay)">${active}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Chờ nghiệm thu</span>
                <span class="stat-value" id="stat-customer-waiting" style="color: var(--status-cho-nghiem-thu)">${waiting}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Tổng chi tiêu</span>
                <span class="stat-value count-up-price" data-val="${spent}" style="color: var(--status-hoan-thanh)">0</span>
            </div>
        </div>`;
    }

    sidebar.innerHTML = html;

    // Observe count up prices inside dynamic sidebar
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const targetVal = parseInt(el.getAttribute('data-val')) || 0;
                window.animateCountUp(el, targetVal, 1000, true);
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.1 });
    sidebar.querySelectorAll('.count-up-price').forEach(price => observer.observe(price));
};

window.acceptOrder = async (orderId) => {
    if(!confirm('Bạn chắc chắn muốn nhận đơn này?')) return;
    const { error } = await supabaseClient.from('orders').update({ booster_id: localStorage.getItem('userId'), booster_name: localStorage.getItem('username'), status: 'dang_cay' }).eq('id', orderId);
    if(error) alert('Lỗi: ' + error.message);
    else { 
        await window.logOrderAction(orderId, 'Đơn hàng đã được nhận bởi Booster ' + localStorage.getItem('username'));
        alert('Nhận đơn thành công!'); 
        window.fetchOrders(); 
    }
};

window.changeOrderStatus = async (orderId, newStatus, customerId) => {
    const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
        alert("Lỗi cập nhật: " + error.message);
    } else {
        if (customerId && customerId !== 'null') {
            await supabaseClient.from('notifications').insert([{ user_id: customerId, title: "Cập nhật đơn hàng", content: `Đơn hàng của bạn đã chuyển sang trạng thái: ${getStatusDetails(newStatus).text}`, order_id: orderId }]);
        }
        await window.logOrderAction(orderId, 'Trạng thái đơn được cập nhật thành: ' + getStatusDetails(newStatus).text);
        if(newStatus === 'hoan_thanh') window.sendTelegramNotification(`✅ Đơn #${orderId} đã hoàn thành!`);
        if (typeof window.fetchOrders === 'function') window.fetchOrders();
    }
};

window.fetchLeaderboard = async function() {
    const list = document.getElementById('leaderboardList');
    if (!list || !supabaseClient) return;
    
    const { data, error } = await supabaseClient.from('user_roles').select('*').eq('role', 'booster').order('orders_completed', { ascending: false }).limit(5);
    if (error || !data || data.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Chưa có dữ liệu</div>';
        return;
    }
    
    list.innerHTML = '';
    data.forEach((b, index) => {
        let badgeIcon = '', badgeColor = '';
        if (index === 0) { badgeIcon = 'fa-trophy'; badgeColor = '#f59e0b'; }
        else if (index === 1) { badgeIcon = 'fa-medal'; badgeColor = '#94a3b8'; }
        else if (index === 2) { badgeIcon = 'fa-award'; badgeColor = '#b45309'; }
        else { badgeIcon = 'fa-star'; badgeColor = 'var(--text-muted)'; }
        
        const avatar = b.avatar_url || `https://via.placeholder.com/40/a855f7/fff?text=${b.username.charAt(0).toUpperCase()}`;
        list.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="font-weight: bold; color: ${badgeColor}; width: 20px;">#${index + 1}</div>
                <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="color: #fff; font-size: 0.9rem; font-weight: 600;">${b.username}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">${b.orders_completed || 0} đơn</div>
                </div>
                <div style="color: ${badgeColor};"><i class="fa-solid ${badgeIcon}"></i></div>
            </div>`;
    });
};

window.calculatePrice = function() {
    const service = document.getElementById('calcService').value;
    const extra = document.getElementById('calcExtraOptions');
    const priceInput = document.getElementById('orderPrice');
    if(!extra || !priceInput) return;
    
    extra.style.display = 'none';
    extra.innerHTML = '';
    
    if (service === 'lahoan') {
        priceInput.value = 100000;
        extra.style.display = 'block';
        extra.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Giá tham khảo: 100,000 VNĐ (Tầng 9-12 full sao).</div>';
    } else if (service === 'khampha') {
        extra.style.display = 'block';
        extra.innerHTML = '<select id="calcRegion" class="form-control" onchange="window.updateKhamPhaPrice()" style="margin-top: 8px;"><option value="mond">Mondstadt (150k)</option><option value="liyue">Liyue (250k)</option><option value="sumeru">Sumeru (350k)</option><option value="natlan">Natlan (400k)</option></select>';
        window.updateKhamPhaPrice();
    } else if (service === 'theluc') {
        priceInput.value = 20000;
        extra.style.display = 'block';
        extra.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">Giá tham khảo: 20,000 VNĐ/Ngày (Xả nhựa + Ủy thác).</div>';
    } else {
        priceInput.value = '';
    }
};

window.updateKhamPhaPrice = function() {
    const region = document.getElementById('calcRegion');
    if(!region) return;
    let price = 0;
    if(region.value === 'mond') price = 150000;
    if(region.value === 'liyue') price = 250000;
    if(region.value === 'sumeru') price = 350000;
    if(region.value === 'natlan') price = 400000;
    const priceInput = document.getElementById('orderPrice');
    if(priceInput) priceInput.value = price;
};

// -- Support Tickets --
window.openTicketModal = function(orderId) {
    window.ticketOrderId = orderId;
    const comment = document.getElementById('ticketComment');
    if(comment) comment.value = '';
    const modal = document.getElementById('ticketModal');
    if(modal) modal.classList.add('active');
};

window.submitTicket = async function() {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return alert('Vui lòng đăng nhập để khiếu nại!');
    const issue = document.getElementById('ticketIssueType').value;
    const desc = document.getElementById('ticketComment').value;
    
    if(!desc.trim()) return alert('Vui lòng mô tả chi tiết sự cố!');
    
    const btn = document.getElementById('submitTicketBtn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
    btn.disabled = true;
    
    const { error } = await supabaseClient.from('support_tickets').insert([
        { order_id: window.ticketOrderId, user_id: currentUserId, issue_type: issue, description: desc }
    ]);
    
    if (error) {
        alert('Lỗi: ' + error.message);
    } else {
        alert('Gửi khiếu nại thành công! Admin sẽ xử lý sớm nhất.');
        document.getElementById('ticketModal').classList.remove('active');
        window.sendTelegramNotification(`🚨 KHIẾU NẠI MỚI - Đơn #${window.ticketOrderId}\nUser: ${currentUserId}\nLý do: ${issue}\nChi tiết: ${desc}`);
    }
    
    btn.innerHTML = 'GỬI KHIẾU NẠI';
    btn.disabled = false;
};

// -- Chat System --
window.openChat = async function(orderId, orderCode) {
    currentChatOrderId = orderId;
    const codeEl = document.getElementById('chatOrderCode');
    if(codeEl) codeEl.innerText = orderCode;
    const modal = document.getElementById('chatModal');
    if(modal) modal.classList.add('active');
    
    window.switchChatTab('chat');
    
    const msgContainer = document.getElementById('chatMessages');
    if(msgContainer) msgContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';
    
    const { data, error } = await supabaseClient.from('order_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    
    if (error) {
        if(msgContainer) msgContainer.innerHTML = '<div style="text-align:center; color:var(--status-tam-dung);">Lỗi tải tin nhắn.</div>';
    } else {
        if(msgContainer) msgContainer.innerHTML = '';
        if(data) data.forEach(msg => appendMessage(msg));
    }
    
    if(currentChatSub) await supabaseClient.removeChannel(currentChatSub);
    currentChatSub = supabaseClient.channel('chat_'+orderId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: 'order_id=eq.'+orderId }, payload => {
            appendMessage(payload.new);
        }).subscribe();
};

window.closeChat = function() {
    if(currentChatSub) { supabaseClient.removeChannel(currentChatSub); currentChatSub = null; }
    currentChatOrderId = null;
    const modal = document.getElementById('chatModal');
    if(modal) modal.classList.remove('active');
};

function appendMessage(msg) {
    const msgContainer = document.getElementById('chatMessages');
    if(!msgContainer) return;
    
    const isMine = msg.sender_id === localStorage.getItem('userId');
    let contentHtml = msg.message;
    if (msg.message.startsWith('IMAGE:')) {
        contentHtml = `<img src="${msg.message.replace('IMAGE:', '')}" style="max-width:200px; border-radius:8px;">`;
    }
    
    const html = `
        <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'};">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">${msg.sender_name}</div>
            <div style="background: ${isMine ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}; color: #fff; padding: 10px 15px; border-radius: 12px; max-width: 80%; word-break: break-word;">
                ${contentHtml}
            </div>
        </div>
    `;
    msgContainer.insertAdjacentHTML('beforeend', html);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

window.sendMessage = async function(e) {
    if (e) e.preventDefault();
    if (!currentChatOrderId || !supabaseClient) return;
    
    const input = document.getElementById('chatInput');
    const msgText = input ? input.value.trim() : '';
    const imgInput = document.getElementById('chatImageInput');
    
    if (!msgText && (!imgInput || !imgInput.files[0])) return;
    if(input) input.value = '';
    
    const currentUserId = localStorage.getItem('userId');
    const currentUsername = localStorage.getItem('username') || 'Ẩn danh';
    
    let newMsg = {
        order_id: currentChatOrderId,
        sender_id: currentUserId,
        sender_name: currentUsername,
        message: msgText
    };
    
    if (imgInput && imgInput.files[0]) {
        const file = imgInput.files[0];
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error } = await supabaseClient.storage.from('chat_images').upload(fileName, file);
        if (!error) {
            const { data } = supabaseClient.storage.from('chat_images').getPublicUrl(fileName);
            newMsg.message = `IMAGE:${data.publicUrl}`;
        }
        imgInput.value = '';
    }
    
    const { error: dbError } = await supabaseClient.from('order_messages').insert([newMsg]);
    if (dbError) {
        alert("Lỗi gửi tin nhắn: " + dbError.message);
    } else {
        const { data: orderData } = await supabaseClient.from('orders').select('user_id, booster_id').eq('id', currentChatOrderId).single();
        if (orderData) {
            const receiverId = currentUserId === orderData.user_id ? orderData.booster_id : orderData.user_id;
            if (receiverId) {
                await supabaseClient.from('notifications').insert([{ user_id: receiverId, title: "Tin nhắn mới", content: `Bạn có tin nhắn mới từ ` + currentUsername, order_id: currentChatOrderId }]);
            }
        }
    }
};

window.switchChatTab = function(tab) {
    const chatBtn = document.getElementById('tabBtnChat');
    const logsBtn = document.getElementById('tabBtnLogs');
    const chatContent = document.getElementById('chatTabContent');
    const logsContent = document.getElementById('logsTabContent');
    
    if(chatBtn) { chatBtn.classList.remove('active'); chatBtn.style.borderBottomColor = 'transparent'; chatBtn.style.color = 'var(--text-muted)'; }
    if(logsBtn) { logsBtn.classList.remove('active'); logsBtn.style.borderBottomColor = 'transparent'; logsBtn.style.color = 'var(--text-muted)'; }
    if(chatContent) chatContent.style.display = 'none';
    if(logsContent) logsContent.style.display = 'none';
    
    if (tab === 'chat') {
        if(chatBtn) { chatBtn.classList.add('active'); chatBtn.style.borderBottomColor = 'var(--accent)'; chatBtn.style.color = '#fff'; }
        if(chatContent) chatContent.style.display = 'block';
    } else {
        if(logsBtn) { logsBtn.classList.add('active'); logsBtn.style.borderBottomColor = 'var(--accent)'; logsBtn.style.color = '#fff'; }
        if(logsContent) logsContent.style.display = 'block';
        window.fetchOrderLogs(); 
    }
};

window.fetchOrderLogs = async function() {
    if(!currentChatOrderId || !supabaseClient) return;
    const container = document.getElementById('orderLogsContainer');
    if(!container) return;
    
    container.innerHTML = '<div style="text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';
    
    const { data, error } = await supabaseClient.from('order_logs').select('*, profiles:user_id(username, role)').eq('order_id', currentChatOrderId).order('created_at', { ascending: false });
        
    if (error || !data || data.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Chưa có nhật ký hoạt động.</div>';
        return;
    }
    
    container.innerHTML = '';
    data.forEach(log => {
        const time = new Date(log.created_at).toLocaleString('vi-VN');
        const username = log.profiles ? log.profiles.username : 'Hệ thống';
        const role = log.profiles ? log.profiles.role : '';
        const roleBadge = role === 'booster' ? '<span class="badge badge-warning" style="font-size:0.6rem; padding: 2px 5px; background: var(--genshin-gold); color: #000; border-radius: 4px; margin-left: 5px;">Booster</span>' : '';
        
        container.innerHTML += `
            <div style="background: rgba(255,255,255,0.02); border-left: 3px solid var(--accent); padding: 10px 15px; border-radius: 4px; font-size: 0.85rem; margin-bottom: 10px;">
                <div style="color: var(--primary-light); font-weight: bold; margin-bottom: 5px;">
                    ${username} ${roleBadge} <span style="float: right; color: var(--text-muted); font-weight: normal; font-size: 0.75rem;">${time}</span>
                </div>
                <div style="color: #fff;">${log.action}</div>
            </div>`;
    });
};

// --- INITIALIZATION SCRIPT ---

function setupNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole') || 'guest';
    let currentUsername = localStorage.getItem('username');
    if (!currentUsername || currentUsername === 'null' || currentUsername === 'undefined') {
        currentUsername = 'Người dùng';
        if (userRole === 'admin' || userRole === 'super_admin') currentUsername = 'Admin';
    }
    
    const navAccountBtn = document.getElementById('navAccountBtn');
    const navUserProfile = document.getElementById('navUserProfile');
    const navUsername = document.getElementById('navUsername');
    const navRole = document.getElementById('navRole');
    const navAvatarInitials = document.getElementById('navAvatarInitials');
    
    if (isLoggedIn && navUserProfile && navAccountBtn) {
        navAccountBtn.style.display = 'none';
        navUserProfile.style.display = 'flex';
        if (navUsername) navUsername.innerText = currentUsername;
        if (navRole) navRole.innerText = userRole === 'admin' || userRole === 'super_admin' ? 'Quản trị viên' : (userRole === 'booster' ? 'Cày thuê' : 'Người dùng');
        if (navAvatarInitials && currentUsername) navAvatarInitials.innerText = currentUsername.substring(0,2).toUpperCase();
    } else {
        if(navAccountBtn) navAccountBtn.style.display = 'block';
        if(navUserProfile) navUserProfile.style.display = 'none';
    }
}

function injectDynamicModals() {
    // Ticket Modal
    if(!document.getElementById('ticketModal')) {
        const ticketHTML = `
        <div class="modal-overlay" id="ticketModal">
            <div class="modal-content premium-modal" style="max-width: 500px;">
                <button class="modal-close" onclick="document.getElementById('ticketModal').classList.remove('active')"><i class="fa-solid fa-xmark"></i></button>
                <h2 class="modal-title" style="color: var(--status-tam-dung);"><i class="fa-solid fa-triangle-exclamation"></i> KHIẾU NẠI / HỖ TRỢ</h2>
                <div class="form-group">
                    <label class="form-label">Loại sự cố</label>
                    <select id="ticketIssueType" class="form-control" style="background: rgba(0,0,0,0.5);">
                        <option value="booster_khong_phoi_hop">Booster không phản hồi/phối hợp</option>
                        <option value="lam_hong_acc">Làm hỏng/mất đồ trong tài khoản</option>
                        <option value="cham_tien_do">Chậm tiến độ quá hạn</option>
                        <option value="khac">Khác (Ghi chi tiết bên dưới)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Mô tả chi tiết</label>
                    <textarea id="ticketComment" class="form-control" rows="4" placeholder="Vui lòng mô tả rõ sự việc để Admin xử lý..."></textarea>
                </div>
                <button id="submitTicketBtn" class="btn" style="width: 100%; background: var(--status-tam-dung); color: #fff;" onclick="window.submitTicket()">GỬI KHIẾU NẠI</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', ticketHTML);
    }
    
    // Chat Modal Tabs & Logs (if missing)
    const chatModal = document.getElementById('chatModal');
    if (chatModal && !document.getElementById('chatTabContent')) {
        const chatBody = chatModal.querySelector('.chat-body') || chatModal.querySelector('#chatMessages');
        if(chatBody) {
            const oldMessages = chatBody.outerHTML;
            chatBody.outerHTML = `
            <div class="chat-tabs" style="display: flex; background: rgba(0,0,0,0.5); border-bottom: 1px solid var(--border-light);">
                <button class="tab-btn active" onclick="window.switchChatTab('chat')" id="tabBtnChat" style="flex:1; padding: 12px; background:transparent; border:none; color:#fff; cursor:pointer; font-weight:bold; border-bottom: 2px solid var(--accent);">Chat</button>
                <button class="tab-btn" onclick="window.switchChatTab('logs')" id="tabBtnLogs" style="flex:1; padding: 12px; background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-weight:bold; border-bottom: 2px solid transparent;">Nhật ký thao tác</button>
            </div>
            <div id="chatTabContent">${oldMessages}</div>
            <div id="logsTabContent" style="display: none; height: 350px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 15px;">
                <div id="orderLogsContainer"></div>
            </div>`;
        }
    }
    
    // Price Calculator in Create Form
    const priceGroup = document.getElementById('orderPrice')?.closest('.form-group');
    if(priceGroup && !document.getElementById('calcService')) {
        const calcHTML = `
        <div class="form-group" style="background: rgba(101, 213, 195, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(101, 213, 195, 0.2); margin-bottom: 15px;">
            <label class="form-label" style="color: var(--secondary);"><i class="fa-solid fa-calculator"></i> MÁY TÍNH BÁO GIÁ TỰ ĐỘNG</label>
            <select id="calcService" class="form-control" onchange="window.calculatePrice()" style="background: rgba(0,0,0,0.5);">
                <option value="none">-- Tự nhập giá --</option>
                <option value="lahoan">Cày La Hoàn Tầng 9-12 (Full sao)</option>
                <option value="khampha">Khám phá bản đồ</option>
                <option value="theluc">Xả nhựa / Ủy thác ngày</option>
            </select>
            <div id="calcExtraOptions" style="display: none;"></div>
        </div>`;
        priceGroup.insertAdjacentHTML('beforebegin', calcHTML);
    }
    
    // Leaderboard
    const sidebar = document.querySelector('.sidebar');
    if(sidebar && !document.getElementById('leaderboardList')) {
        const lbHTML = `
        <div class="sidebar-section" style="margin-top: 30px; border-top: 1px solid var(--border-light); padding-top: 20px;">
            <div class="section-title" style="color: var(--genshin-gold); font-weight: bold; margin-bottom: 15px;"><i class="fa-solid fa-trophy"></i> TOP BOOSTER</div>
            <div id="leaderboardList" style="display: flex; flex-direction: column; gap: 10px;">
                <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>
            </div>
        </div>`;
        sidebar.insertAdjacentHTML('beforeend', lbHTML);
    }
}

function bindEvents() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => { navLinks.classList.toggle('active'); });
    }
    
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el || el.classList.contains('modal-close')) {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            }
        });
    });

    function setupOrderPriceInput() {
        const priceInput = document.getElementById('orderPrice');
        const role = localStorage.getItem('userRole');
        if (priceInput) {
            if (role === 'admin' || role === 'super_admin') {
                priceInput.removeAttribute('readonly');
                priceInput.style.cursor = 'text';
                priceInput.type = 'number';
                priceInput.value = '';
                priceInput.placeholder = 'Nhập giá...';
            } else {
                priceInput.setAttribute('readonly', 'true');
                priceInput.style.cursor = 'not-allowed';
                priceInput.type = 'text';
                priceInput.value = 'Chờ Admin báo giá';
            }
        }
    }

    const createOrderBtn = document.getElementById('createOrderBtn');
    const createOrderModal = document.getElementById('createOrderModal');
    if (createOrderBtn && createOrderModal) {
        createOrderBtn.addEventListener('click', () => {
            const form = document.getElementById('createOrderForm');
            if(form) form.reset();
            if(document.getElementById('calcExtraOptions')) document.getElementById('calcExtraOptions').style.display = 'none';
            setupOrderPriceInput();
            createOrderModal.classList.add('active');
        });
    }

    // Global function for empty-state button
    window.openCreateOrderModal = function() {
        const modal = document.getElementById('createOrderModal');
        if (modal) {
            const form = document.getElementById('createOrderForm');
            if(form) form.reset();
            setupOrderPriceInput();
            modal.classList.add('active');
        }
    };

    // Rating modal
    window.openRatingModal = function(orderId) {
        const modal = document.getElementById('ratingModal');
        if (modal) {
            modal.dataset.orderId = orderId;
            modal.classList.add('active');
            // Reset stars
            document.querySelectorAll('#ratingStars i').forEach((star, idx) => {
                star.style.color = 'var(--border-light)';
                star.onclick = () => {
                    modal.dataset.rating = idx + 1;
                    document.querySelectorAll('#ratingStars i').forEach((s, i) => {
                        s.style.color = i <= idx ? 'var(--genshin-gold)' : 'var(--border-light)';
                    });
                };
            });
        }
    };

    // Submit rating
    const submitRatingBtn = document.getElementById('submitRatingBtn');
    if (submitRatingBtn) {
        submitRatingBtn.addEventListener('click', async () => {
            const modal = document.getElementById('ratingModal');
            if (!modal || !supabaseClient) return;
            const orderId = modal.dataset.orderId;
            const rating = parseInt(modal.dataset.rating) || 0;
            const comment = document.getElementById('ratingComment')?.value?.trim() || '';
            if (rating === 0) { alert('Vui lòng chọn số sao đánh giá!'); return; }
            submitRatingBtn.disabled = true;
            submitRatingBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
            const { error } = await supabaseClient.from('orders').update({ rating: rating, review_comment: comment }).eq('id', orderId);
            if (error) { alert('Lỗi: ' + error.message); }
            else { alert('Đánh giá thành công!'); modal.classList.remove('active'); window.fetchOrders(); }
            submitRatingBtn.disabled = false;
            submitRatingBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đánh giá';
        });
    }

    // Notification bell toggle
    const notifBtn = document.getElementById('notificationBtn');
    const notifDropdown = document.getElementById('notificationDropdown');
    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => notifDropdown.classList.remove('show'));
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!supabaseClient) return alert('Chưa tải xong kết nối, vui lòng thử lại.');
            const btn = loginForm.querySelector('button');
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;
            const email = user + '@namcumz.com';
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG ĐĂNG NHẬP...';
            btn.disabled = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: pass });
            if (error) {
                alert('Tên tài khoản hoặc mật khẩu không đúng!');
            } else {
                const userId = data.user.id;
                if (user.toLowerCase() === 'admin') await supabaseClient.from('user_roles').upsert({ id: userId, username: user, role: 'super_admin' });
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
            }
            btn.innerHTML = 'ĐĂNG NHẬP';
            btn.disabled = false;
        });
    }
    
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            if(!supabaseClient) return alert('Chưa tải xong kết nối, vui lòng thử lại.');
            googleLoginBtn.style.opacity = '0.7';
            googleLoginBtn.style.pointerEvents = 'none';
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard.html'
                }
            });
            if(error) {
                alert('Lỗi đăng nhập Google: ' + error.message);
                googleLoginBtn.style.opacity = '1';
                googleLoginBtn.style.pointerEvents = 'auto';
            }
        });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!supabaseClient) return alert('Chưa tải xong kết nối.');
            const btn = registerForm.querySelector('button');
            const username = document.getElementById('regUsername').value.trim();
            const pass = document.getElementById('regPassword').value;
            const pass2 = document.getElementById('regPasswordConfirm').value;
            const displayName = document.getElementById('regDisplayName').value.trim() || username;
            
            if (pass !== pass2) return alert('Mật khẩu nhập lại không khớp!');
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG TẠO...';
            btn.disabled = true;

            const { data, error } = await supabaseClient.auth.signUp({ email: username + '@namcumz.com', password: pass, options: { data: { display_name: displayName, role: 'customer' } } });
            if (error) alert('Lỗi đăng ký: ' + error.message);
            else if (data.user) {
                await supabaseClient.from('user_roles').insert([{ id: data.user.id, username: username, role: 'customer' }]);
                alert('Đăng ký thành công! Đang đăng nhập...');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
            }
            btn.innerHTML = 'ĐĂNG KÝ NGAY';
            btn.disabled = false;
        });
    }
    
    const logoutBtn = document.getElementById('navLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if(confirm('Bạn muốn đăng xuất?') && supabaseClient) {
                await supabaseClient.auth.signOut();
                window.location.href = 'index.html';
            }
        });
    }
    
    const createOrderForm = document.getElementById('createOrderForm');
    if (createOrderForm) {
        createOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!supabaseClient) return;
            const btn = document.getElementById('submitOrderBtn');
            const isGuest = localStorage.getItem('isLoggedIn') !== 'true';
            
            const renterInput = document.getElementById('orderRenter').value.trim();
            const renter = renterInput || localStorage.getItem('username') || 'Khách';
            
            let price = 0;
            const priceInput = document.getElementById('orderPrice');
            if (priceInput) {
                const parsed = parseFloat(priceInput.value);
                if (!isNaN(parsed)) price = parsed;
            }
            
            const server = document.getElementById('orderServer').value;
            const group = document.getElementById('orderServiceGroup').value;
            const goal = document.getElementById('orderGoal').value.trim();
            const deadline = document.getElementById('orderDeadline').value;
            const notes = document.getElementById('orderContent').value.trim();
            
            const content = `[${server}] [${group}] ${goal}\nDeadline: ${deadline}\nGhi chú: ${notes}`;
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG TẠO...';
            btn.disabled = true;
            
            let secretCode = null;
            if(isGuest) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                secretCode = Array.from({length:6}).map(()=>chars.charAt(Math.floor(Math.random()*chars.length))).join('');
            }
            
            const orderCode = 'DH' + Math.floor(Math.random() * 10000);
            const orderData = {
                order_code: orderCode, renter_name: renter, price: parseFloat(price) || 0,
                content: content, status: 'cho_xu_ly', user_id: isGuest ? null : localStorage.getItem('userId'), secret_code: secretCode,
                booster_name: 'Chưa nhận'
            };
            
            const { data, error } = await supabaseClient.from('orders').insert([orderData]).select();
            if (error) {
                alert('Lỗi: ' + error.message);
            } else {
                if(data && data[0]) window.logOrderAction(data[0].id, 'Đơn hàng mới được tạo.');
                if(isGuest) alert(`Tạo đơn thành công!\n\nMã bảo mật: ${secretCode}\nHãy lưu lại mã này!`);
                else alert('Tạo đơn hàng thành công!');
                
                window.sendTelegramNotification(`🚨 ĐƠN MỚI TẠO - ${orderCode}\nKhách: ${renter}\nGiá: ${price}đ\nNội dung: ${content}`);
                
                document.getElementById('createOrderModal').classList.remove('active');
                createOrderForm.reset();
                if(typeof window.fetchOrders === 'function') window.fetchOrders();
            }
            btn.innerHTML = 'Tạo đơn';
            btn.disabled = false;
        });
    }
    
    // Chat Send message logic
    const chatForm = document.getElementById('sendMessageForm');
    if(chatForm) chatForm.addEventListener('submit', window.sendMessage);
}

function initDynamicSlogan() {
    const sloganEl = document.getElementById('dynamicSlogan');
    if (!sloganEl) return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return; // Do not animate slogan if reduced motion
    
    const slogans = [
        "Cày thuê Genshin minh bạch",
        "Theo dõi tiến độ theo thời gian thực",
        "Booster được xác minh",
        "Nghiệm thu trước khi hoàn thành"
    ];
    let index = 0;
    
    setInterval(() => {
        sloganEl.style.opacity = '0';
        sloganEl.style.transform = 'translateY(-6px)';
        
        setTimeout(() => {
            index = (index + 1) % slogans.length;
            sloganEl.innerText = slogans[index];
            
            sloganEl.style.transition = 'none';
            sloganEl.style.transform = 'translateY(6px)';
            
            // force reflow
            void sloganEl.offsetHeight;
            
            sloganEl.style.transition = 'opacity 450ms cubic-bezier(0.4, 0, 0.2, 1), transform 450ms cubic-bezier(0.4, 0, 0.2, 1)';
            sloganEl.style.opacity = '1';
            sloganEl.style.transform = 'translateY(0)';
        }, 450);
    }, 3500);
}

function initSupabaseLogic() {
    if(!supabaseClient) return;
    
    injectDynamicModals();
    setupNavbar();
    bindEvents();
    initDynamicSlogan();
    
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userId', session.user.id);
            currentUser = session.user;
            
            try {
                const { data } = await supabaseClient.from('user_roles').select('username, role').eq('id', session.user.id).single();
                if (data) {
                    localStorage.setItem('username', data.username || '');
                    localStorage.setItem('userRole', data.role || 'customer');
                }
            } catch (e) {
                console.error("Lỗi lấy thông tin user_roles:", e);
            }
            setupNavbar();
            if (typeof window.fetchOrders === 'function') window.fetchOrders();
        } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userId');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            currentUser = null;
            setupNavbar();
            if (typeof window.fetchOrders === 'function') window.fetchOrders();
        }
    });

    window.fetchOrders();
    window.fetchLeaderboard();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        initSupabaseLogic();
    } else {
        console.warn("Supabase CDN blocked/failed! Trying unpkg fallback...");
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => {
            if (window.supabase) {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                initSupabaseLogic();
            } else { alert("Không thể kết nối Supabase (Mạng bị chặn CDN)."); }
        };
        script.onerror = () => { alert("Lỗi mạng nghiêm trọng: CDN bị chặn."); };
        document.head.appendChild(script);
    }
});
