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

// Verified session exposed read-only for other page scripts.
Object.defineProperty(window, 'currentUser', { get: () => currentUser });
let verifiedRole = 'guest';
const usesOrderRPC = () => ['staging', 'production'].includes(window.NAMCUMZ_CONFIG?.environment);
const expectedDbVersion = () => window.NAMCUMZ_CONFIG?.expectedDbVersion || (window.NAMCUMZ_CONFIG?.environment === 'staging' ? 'staging_004_credentials_encryption' : 'production_002_credentials_encryption');
let dbContractReady = !usesOrderRPC();
window.NAMCUMZ_DB_READY = dbContractReady;

function showDatabaseContractError() {
    const grid = document.getElementById('ordersGrid');
    if (grid) {
        grid.innerHTML = '<div role="alert" style="color: var(--status-tam-dung); grid-column: 1/-1; text-align: center; padding: 20px;">Hệ thống đang bảo trì để đồng bộ cơ sở dữ liệu. Vui lòng thử lại sau.</div>';
    }
}

async function verifyDatabaseContract() {
    if (!usesOrderRPC()) return true;
    if (!supabaseClient) return false;
    try {
        const { data, error } = await supabaseClient.rpc('app_contract_version');
        dbContractReady = !error && data === expectedDbVersion();
    } catch (_) {
        dbContractReady = false;
    }
    window.NAMCUMZ_DB_READY = dbContractReady;
    if (!dbContractReady) showDatabaseContractError();
    return dbContractReady;
}
let orderFetchSequence = 0;
const busyOrders = new Set();
let sendingChat = false;
const renderedMessages = new Set();
const stagedUploads = new WeakMap();

// Stage attachments in the private order bucket; never fall back to public/base64.
async function stageOrderAttachment(file, orderId, actor) {
    if (!file) return null;
    const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if (!extensions[file.type] || file.size > 5242880) throw new Error('Chỉ nhận JPG, PNG, WebP tối đa 5 MB.');
    let uploads = stagedUploads.get(file);
    if (!uploads) { uploads = new Map(); stagedUploads.set(file, uploads); }
    const key = orderId + '/' + actor;
    if (uploads.has(key)) return uploads.get(key);
    const path = key + '/' + crypto.randomUUID() + '.' + extensions[file.type];
    const {error} = await supabaseClient.storage.from('order-files').upload(path, file, {contentType:file.type,upsert:false});
    if (error) throw error;
    uploads.set(key,path);
    return path;
}

// Keep draft text/file until the RPC confirms success and ignore stale chat responses.
async function sendStagingChat(file, text, input, fileInput) {
    if (sendingChat || !currentUser?.id || !currentChatOrderId) return;
    const actor = currentUser.id, orderId = currentChatOrderId;
    sendingChat = true;
    try {
        const attachment = await stageOrderAttachment(file,orderId,actor);
        const row = await window.OrderAPI.message(supabaseClient,actor,orderId,text,attachment);
        if (currentUser?.id === actor && currentChatOrderId === orderId) {
            if (input && input.value.trim() === text) input.value = '';
            if (fileInput && fileInput.files[0] === file) fileInput.value = '';
            await appendPrivateMessage(row,orderId,actor);
        }
    } catch (error) { alert('Chưa gửi được tin nhắn: ' + error.message); }
    finally { sendingChat = false; }
}

// Resolve private image URLs only for the active authorized conversation.
async function appendPrivateMessage(msg, orderId, actor) {
    if (currentChatOrderId !== orderId || currentUser?.id !== actor || renderedMessages.has(msg.id)) return;
    renderedMessages.add(msg.id);
    let signedUrl = null;
    if (msg.attachment_path) {
        try {
            const {data,error} = await supabaseClient.storage.from('order-files').createSignedUrl(msg.attachment_path,300);
            if (!error) signedUrl = data?.signedUrl;
        } catch (_) { /* Render a retry hint instead of dropping the message. */ }
    }
    if (currentChatOrderId !== orderId || currentUser?.id !== actor) return;
    appendMessage({...msg, privateImageUrl:signedUrl, privateAttachmentUnavailable:msg.attachment_path && !signedUrl});
}

// Present consistent, accessible dialogs for order workflow actions.
window.showOrderDialog = function(options = {}) {
    const config = {
        variant: 'alert', title: 'Thông báo', message: '', tone: 'info',
        confirmText: 'Đã hiểu', cancelText: 'Hủy', fields: [], ...options
    };
    return new Promise(resolve => {
        const previousFocus = document.activeElement;
        let dialog = document.getElementById('orderActionDialog');
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.id = 'orderActionDialog';
            dialog.className = 'order-action-dialog';
            dialog.setAttribute('aria-labelledby', 'orderDialogTitle');
            dialog.setAttribute('aria-describedby', 'orderDialogMessage');
            dialog.innerHTML = '<div class="order-dialog__panel">' +
                    '<button type="button" class="order-dialog__close" aria-label="Đóng hộp thoại"><i class="fa-solid fa-xmark"></i></button>' +
                    '<div class="order-dialog__icon"><i class="fa-solid fa-circle-info"></i></div>' +
                    '<span class="order-dialog__eyebrow">NAMCUMZ · QUẢN LÝ ĐƠN</span>' +
                    '<h2 id="orderDialogTitle"></h2>' +
                    '<p id="orderDialogMessage" class="order-dialog__message"></p>' +
                    '<div class="order-dialog__fields"></div>' +
                    '<div class="order-dialog__actions">' +
                        '<button type="button" class="order-dialog__button order-dialog__button--cancel" data-dialog-cancel></button>' +
                        '<button type="button" class="order-dialog__button order-dialog__button--confirm" data-dialog-confirm></button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(dialog);
        }
        const title = dialog.querySelector('#orderDialogTitle');
        const message = dialog.querySelector('#orderDialogMessage');
        const icon = dialog.querySelector('.order-dialog__icon i');
        const fieldsHost = dialog.querySelector('.order-dialog__fields');
        const cancelButton = dialog.querySelector('[data-dialog-cancel]');
        const confirmButton = dialog.querySelector('[data-dialog-confirm]');
        title.textContent = config.title;
        message.textContent = config.message;
        message.hidden = !config.message;
        const icons = {info:'fa-circle-info',success:'fa-circle-check',warning:'fa-triangle-exclamation',danger:'fa-circle-exclamation'};
        icon.className = 'fa-solid ' + (icons[config.tone] || icons.info);
        dialog.classList.toggle('is-danger', config.tone === 'danger');
        dialog.classList.toggle('is-success', config.tone === 'success');
        cancelButton.hidden = config.variant === 'alert';
        cancelButton.textContent = config.cancelText;
        confirmButton.textContent = config.confirmText;
        confirmButton.classList.toggle('order-dialog__button--danger', config.tone === 'danger');
        fieldsHost.replaceChildren();
        const controls = [];
        (config.variant === 'prompt' ? config.fields : []).forEach((field, index) => {
            const wrapper = document.createElement('label');
            wrapper.className = 'order-dialog__field';
            const caption = document.createElement('span');
            caption.textContent = field.label || 'Nội dung';
            const control = field.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
            control.className = 'order-dialog__input';
            control.name = field.name || 'value' + index;
            control.dataset.dialogField = control.name;
            control.required = Boolean(field.required);
            control.placeholder = field.placeholder || '';
            control.value = field.value == null ? '' : String(field.value);
            if (control.tagName === 'INPUT') {
                control.type = field.type || 'text';
                ['min','max','step','inputmode'].forEach(key => {
                    if (field[key] != null) control.setAttribute(key, String(field[key]));
                });
            } else if (field.maxLength) {
                control.maxLength = field.maxLength;
            }
            wrapper.append(caption, control);
            if (field.hint) {
                const hint = document.createElement('small');
                hint.textContent = field.hint;
                wrapper.appendChild(hint);
            }
            fieldsHost.appendChild(wrapper);
            controls.push(control);
        });
        let settled = false;
        const finish = value => {
            if (settled) return;
            settled = true;
            if (dialog.open) dialog.close();
            resolve(value);
            if (previousFocus && previousFocus.isConnected) previousFocus.focus({preventScroll:true});
        };
        const submit = () => {
            if (config.variant === 'prompt') {
                const invalid = controls.find(control => !control.checkValidity() || (control.required && !control.value.trim()));
                if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
                const values = Object.fromEntries(controls.map(control => [control.name, control.value]));
                finish(controls.length === 1 ? controls[0].value : values);
                return;
            }
            finish(true);
        };
        confirmButton.onclick = submit;
        cancelButton.onclick = () => finish(null);
        dialog.querySelector('.order-dialog__close').onclick = () => finish(null);
        dialog.oncancel = event => { event.preventDefault(); finish(null); };
        dialog.onclick = event => { if (event.target === dialog) finish(null); };
        controls.forEach(control => control.onkeydown = event => {
            if (event.key === 'Enter' && control.tagName !== 'TEXTAREA') { event.preventDefault(); submit(); }
        });
        if (!dialog.open) dialog.showModal();
        requestAnimationFrame(() => (controls[0] || confirmButton).focus());
    });
};

// Show concise success feedback without blocking the order workflow.
window.showOrderToast = function(message) {
    let toast = document.getElementById('orderActionToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'orderActionToast';
        toast.className = 'order-action-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span></span>';
    toast.querySelector('span').textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(window.orderActionToastTimer);
    window.orderActionToastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3600);
};

// Submit only versioned RPC actions; audit and notifications belong to the server.
window.runOrderAction = async function(id, action, suppliedData) {
    if (busyOrders.has(id)) return false;
    const order = allOrders.find(o => o.id === id);
    if (!order || !currentUser?.id) {
        await window.showOrderDialog({title:'Chưa sẵn sàng thao tác', message:'Vui lòng đăng nhập và tải lại danh sách đơn.', tone:'warning'});
        return false;
    }
    let data = suppliedData || {};
    if (!suppliedData) {
        const orderCode = order.order_code || 'đơn hàng';
        const workflowPrompts = {
            quote: {
                title:'Báo giá đơn hàng', message:'Nhập tổng giá, số tiền cần thanh toán trước khi giao và ghi chú cho khách.', confirmText:'Gửi báo giá',
                fields:[
                    {name:'price',label:'Tổng giá (VND)',type:'number',min:1,step:1,required:true,placeholder:'Ví dụ: 300000'},
                    {name:'required_amount',label:'Cần thu trước khi giao (VND)',type:'number',min:1,step:1,required:true,placeholder:'Ví dụ: 250000'},
                    {name:'reason',label:'Ghi chú báo giá',type:'textarea',required:true,placeholder:'Giải thích gói dịch vụ hoặc thời hạn'}
                ]
            },
            payment: {
                title:'Xác nhận thanh toán', message:'Ghi nhận đúng số tiền đã nhận và mã tham chiếu giao dịch.', confirmText:'Ghi nhận',
                fields:[
                    {name:'amount',label:'Số tiền đã nhận (VND)',type:'number',min:1,step:1,required:true},
                    {name:'reason',label:'Mã giao dịch / ghi chú',type:'textarea',required:true,placeholder:'Nhập mã tham chiếu trên hóa đơn'}
                ]
            },
            progress: {
                title:'Cập nhật tiến độ', message:'Tiến độ hiển thị cho khách cần phản ánh công việc thực tế.', confirmText:'Lưu tiến độ',
                fields:[
                    {name:'progress',label:'Tiến độ (0–99%)',type:'number',min:0,max:99,step:1,required:true,placeholder:'Ví dụ: 45'},
                    {name:'reason',label:'Ghi chú tiến độ',type:'textarea',required:true,placeholder:'Mô tả phần việc đã hoàn thành'}
                ]
            }
        };
        if (workflowPrompts[action]) {
            const values = await window.showOrderDialog({...workflowPrompts[action], variant:'prompt', tone:action === 'payment' ? 'success' : 'info'});
            if (!values) return false;
            if (action === 'quote') {
                data = {price:Number(values.price),required_amount:Number(values.required_amount),reason:values.reason.trim()};
                if (!Number.isSafeInteger(data.price) || !Number.isSafeInteger(data.required_amount) || data.price <= 0 || data.required_amount <= 0 || data.required_amount > data.price) {
                    await window.showOrderDialog({title:'Thông tin chưa hợp lệ',message:'Số tiền cần thu phải lớn hơn 0 và không được vượt quá tổng giá.',tone:'warning'});
                    return false;
                }
            } else if (action === 'payment') {
                data = {amount:Number(values.amount),reason:values.reason.trim()};
                if (!Number.isSafeInteger(data.amount) || data.amount <= 0) {
                    await window.showOrderDialog({title:'Số tiền chưa hợp lệ',message:'Nhập số tiền nguyên dương đã thực nhận.',tone:'warning'});
                    return false;
                }
            } else {
                data = {progress:Number(values.progress),reason:values.reason.trim()};
                if (!Number.isInteger(data.progress) || data.progress < 0 || data.progress > 99) {
                    await window.showOrderDialog({title:'Tiến độ chưa hợp lệ',message:'Nhập số nguyên từ 0 đến 99%.',tone:'warning'});
                    return false;
                }
            }
        } else if (['submit','rework','pause','resume','cancel'].includes(action)) {
            const labels = {submit:'Ghi chú kết quả nghiệm thu',rework:'Lý do yêu cầu làm lại',pause:'Lý do tạm dừng',resume:'Ghi chú tiếp tục đơn',cancel:'Lý do hủy đơn'};
            const reason = await window.showOrderDialog({
                variant:'prompt', title:labels[action], message:'Đơn ' + orderCode + ' sẽ được cập nhật và lưu lại lịch sử.',
                confirmText:'Xác nhận', tone:action === 'cancel' ? 'danger' : 'info',
                fields:[{name:'reason',label:labels[action],type:'textarea',required:true,placeholder:'Nhập nội dung ngắn gọn, rõ ràng'}]
            });
            if (!reason) return false;
            data.reason = reason.trim();
        }
        const confirmations = {
            approve_quote:{title:'Chấp thuận báo giá',message:'Xác nhận giá ' + Number(order.price).toLocaleString('vi-VN') + ' đ cho ' + orderCode + '?',confirmText:'Chấp thuận'},
            complete:{title:'Nghiệm thu đơn hàng',message:'Xác nhận bạn đã kiểm tra và đồng ý với kết quả của ' + orderCode + '?',confirmText:'Nghiệm thu',tone:'success'},
            claim:{title:'Nhận thực hiện đơn',message:'Bạn xác nhận nhận và chịu trách nhiệm thực hiện ' + orderCode + '?',confirmText:'Nhận đơn',tone:'success'}
        };
        if (confirmations[action]) {
            const accepted = await window.showOrderDialog({...confirmations[action],variant:'confirm'});
            if (!accepted) return false;
        }
    }
    busyOrders.add(id);
    const actor = currentUser.id;
    try {
        const updated = await window.OrderAPI.action(supabaseClient, currentUser.id, order, action, data);
        if (currentUser?.id !== actor) return false;
        if (currentUser?.id) allOrders = allOrders.map(o => o.id === id ? updated : o);
        await window.fetchOrders();
        const messages = {claim:'Đã nhận đơn. Đơn được chuyển sang Đang cày.',cancel:'Đơn đã được hủy và chuyển khỏi danh sách đơn đang hoạt động.',complete:'Đã nghiệm thu đơn hàng.',submit:'Đã gửi kết quả để khách nghiệm thu.',progress:'Đã cập nhật tiến độ đơn hàng.',quote:'Đã gửi báo giá.',payment:'Đã ghi nhận thanh toán.',pause:'Đã tạm dừng đơn.',resume:'Đã tiếp tục đơn.',rework:'Đã gửi yêu cầu làm lại.'};
        window.showOrderToast(messages[action] || 'Đã cập nhật đơn hàng.');
        return true;
    } catch (error) {
        await window.showOrderDialog({title:'Không thể cập nhật đơn',message:error.message || 'Hệ thống chưa thể lưu thay đổi. Vui lòng thử lại.',tone:'danger'});
        if (error.message?.includes('Đơn đã thay đổi')) await window.fetchOrders();
        return false;
    } finally { busyOrders.delete(id); }
};


// Encode untrusted text before inserting into HTML templates.
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

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
    if (usesOrderRPC() && !dbContractReady) { showDatabaseContractError(); return; }
    // Private orders are never requested before a session is available.
    if (!currentUser?.id) {
        allOrders = [];
        window.applyFilters();
        return;
    }
    const sequence = ++orderFetchSequence;
    const actor = currentUser.id;
    try {
        const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        let queue = [];
        if (usesOrderRPC() && verifiedRole === 'booster') {
            const result = await supabaseClient.rpc('claim_queue');
            if (result.error) throw result.error;
            queue = (result.data || []).map(o => ({...o, status:'cho_xu_ly', queue_only:true, content:'Đơn đủ điều kiện nhận'}));
        }
        if (sequence !== orderFetchSequence || currentUser?.id !== actor) return;
        allOrders = [...(data || []), ...queue.filter(q => !(data || []).some(o => o.id === q.id))];
        window.getOrderById = function(id) { return allOrders.find(o => o.id === id); };
        
        window.applyFilters();
        if(typeof window.updateDashboardStats === 'function') window.updateDashboardStats(allOrders.filter(o => !o.queue_only));
    } catch (error) {
        console.error("Lỗi tải đơn hàng:", error.message);
        const grid = document.getElementById('ordersGrid');
        if(grid) grid.innerHTML = '<div class="ui-inline-error" role="alert"><span>Chưa tải được đơn. Vui lòng thử lại.</span><button class="btn btn-outline" onclick="window.fetchOrders()">Thử lại</button></div>';
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
        if (currentTab === 'cancelled') {
            if (!order.cancelled) return false;
        } else {
            if (order.cancelled) return false;
            if (currentTab !== 'all' && order.status !== currentTab) return false;
        }
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

    const isLoggedIn = Boolean(currentUser?.id);
    const userRole = verifiedRole;
    const currentUserId = currentUser?.id || null;

    container.innerHTML = '';

    if (!ordersToRender || ordersToRender.length === 0) {
        container.innerHTML = `
        <section class="ui-empty">
            <i class="fa-regular fa-folder-open" aria-hidden="true"></i>
            <h3>${currentTab === 'cancelled' ? 'Chưa có đơn đã hủy' : 'Chưa có đơn phù hợp'}</h3>
            <p>${currentTab === 'cancelled' ? 'Đơn đã hủy sẽ được lưu tại đây để tra cứu lịch sử.' : 'Thay đổi bộ lọc để tìm đơn, hoặc tạo yêu cầu mới để shop báo giá.'}</p>
            <div class="ui-empty-actions">
                <button class="btn btn-primary" onclick="window.openCreateOrderModal()"><i class="fa-solid fa-plus" aria-hidden="true"></i> Tạo đơn Genshin</button>
                <button class="btn btn-outline" onclick="document.getElementById('searchInput').value=''; document.getElementById('filterService').value='all'; window.filterByTab('all');">Xóa bộ lọc</button>
            </div>
        </section>`;
        return;
    }

    ordersToRender.forEach((order, index) => {
        const statusInfo = order.cancelled ? {text:'Đã hủy', colorVar:'#64748b', icon:'fa-ban'} : getStatusDetails(order.status);
        const isOwner = Boolean(currentUserId && order.user_id === currentUserId);
        const isAssignedBooster = Boolean(currentUserId && order.booster_id === currentUserId);
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        const isBoosterRole = userRole === 'booster';
        const canViewPrivate = isAdmin || isOwner || isAssignedBooster;

        let priceHtml = '';
        if (canViewPrivate) {
            if (order.price) {
                priceHtml = `<span class="oc-amount" data-val="${parseInt(order.price)}">${Number(order.price).toLocaleString('vi-VN')}</span> đ`;
            } else {
                priceHtml = 'Chưa báo giá';
            }
        } else {
            priceHtml = `<span style="font-size: 14px;"><i class="fa-solid fa-lock"></i> Ẩn</span>`;
        }

        // Build action buttons — admin uses multi-row layout to avoid overflow
        let adminRow1 = ''; // Đăng ảnh + Sửa + Xóa
        let adminRow2 = ''; // Status select full-width
        let adminRow3 = ''; // Chat full-width
        let normalButtons = '';
        if (isLoggedIn) {
            if (isAdmin) {
                // Row 1: Đăng ảnh (if dang_cay) + Sửa + Xóa
                if (order.status === 'dang_cay') {
                    adminRow1 += `<button onclick="window.openProgressModal('${order.id}', '${order.user_id}')" class="btn" style="background: rgba(104,213,193,0.15); color: var(--secondary); border: 1px solid rgba(104,213,193,0.3); flex:1; padding: 8px 8px; font-size:12px;"><i class="fa-solid fa-camera"></i> Đăng ảnh</button>`;
                }
                adminRow1 += `<button onclick="window.openEditOrderModal('${order.id}')" class="btn" style="background: rgba(255,255,255,0.08); color: #fff; flex:1; border: 1px solid rgba(255,255,255,0.15); padding: 8px 8px; font-size:12px;"><i class="fa-solid fa-pen"></i> Sửa</button>`;
                adminRow1 += `<button onclick="window.deleteOrder('${order.id}', '${order.order_code}')" class="btn" style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); flex:1; padding: 8px 8px; font-size:12px;"><i class="fa-solid fa-trash"></i> Xóa</button>`;
                // Row 2: Status select — full width, standalone
                adminRow2 = `<select onchange="window.changeOrderStatus('${order.id}', this.value, '${order.user_id}')" style="background: rgba(0,0,0,0.6); color: #fff; border: 1px solid var(--border-light); border-radius: 10px; padding: 8px 12px; width:100%; outline: none; cursor: pointer; font-family: var(--font-main); font-size: 13px;">
                    <option value="cho_xu_ly" ${order.status === 'cho_xu_ly' ? 'selected' : ''}>• Chờ xử lý</option>
                    <option value="dang_cay" ${order.status === 'dang_cay' ? 'selected' : ''}>• Đang cày</option>
                    <option value="cho_nghiem_thu" ${order.status === 'cho_nghiem_thu' ? 'selected' : ''}>• Chờ nghiệm thu</option>
                    <option value="hoan_thanh" ${order.status === 'hoan_thanh' ? 'selected' : ''}>• Hoàn thành</option>
                    <option value="tam_dung" ${order.status === 'tam_dung' ? 'selected' : ''}>• Tạm dừng</option>
                </select>`;
                // Row 3: Chat + AI — full width
                adminRow3 = `<button onclick="window.openChat('${order.id}', '${order.order_code}')" class="btn" style="background: var(--primary); color: #fff; width:100%; padding: 8px 10px; font-size:13px; margin-bottom: 8px;"><i class="fa-solid fa-comments"></i> Chat với khách</button>`;
                adminRow3 += `<button onclick="window.openAiCopilot('${order.id}')" class="btn" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #fff; width:100%; padding: 8px 10px; font-size:13px;"><i class="fa-solid fa-robot"></i> AI Phân tích</button>`;
            } else if (isBoosterRole) {
                if (order.status === 'cho_xu_ly' && !order.booster_id) {
                    normalButtons += `<button onclick="acceptOrder('${order.id}')" class="btn btn-primary" style="flex:1"><i class="fa-solid fa-handshake"></i> Nhận đơn</button>`;
                } else if (isAssignedBooster && order.status === 'dang_cay') {
                    normalButtons += `<button onclick="window.openProgressModal('${order.id}', '${order.user_id}')" class="btn" style="background: rgba(104,213,193,0.15); color: var(--secondary); border: 1px solid rgba(104,213,193,0.3); flex:1"><i class="fa-solid fa-camera"></i> Đăng ảnh</button>`;
                    normalButtons += `<button onclick="window.changeOrderStatus('${order.id}', 'cho_nghiem_thu', '${order.user_id}')" class="btn" style="background: var(--status-cho-nghiem-thu); color: #000; flex:1"><i class="fa-solid fa-check"></i> Gửi kết quả</button>`;
                }
                normalButtons += `<button onclick="window.openAiCopilot('${order.id}')" class="btn" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #fff; flex:1"><i class="fa-solid fa-robot"></i> AI Trợ Lý</button>`;
            } else if (isOwner) {
                if (order.status === 'cho_nghiem_thu') {
                    normalButtons += `<button onclick="window.changeOrderStatus('${order.id}', 'hoan_thanh', '${order.user_id}')" class="btn" style="background: var(--status-hoan-thanh); color: #fff; flex:1"><i class="fa-solid fa-clipboard-check"></i> Nghiệm thu</button>`;
                }
            }

            if (!isAdmin) {
                if (isOwner && order.status !== 'cho_xu_ly') {
                    normalButtons += `<button onclick="window.openTicketModal('${order.id}')" class="btn btn-outline" style="border: 1px solid var(--status-tam-dung); color: var(--status-tam-dung); flex: 0.5; padding: 8px 10px;"><i class="fa-solid fa-triangle-exclamation"></i> Báo cáo</button>`;
                }
                if (canViewPrivate) {
                    normalButtons += `<button onclick="window.openChat('${order.id}', '${order.order_code}')" class="btn" style="background: var(--primary); color: #fff; flex: 1;"><i class="fa-solid fa-comments"></i> Chat</button>`;
                }
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
                    <div style="color: var(--text-light); font-size: 12px; margin-top: 4px;"><i>"${escapeHtml(order.review_comment || '')}"</i></div>
                </div>
            `;
        } else if (order.status === 'hoan_thanh' && isOwner) {
            normalButtons += `<button onclick="window.openRatingModal('${order.id}')" class="btn" style="background: var(--genshin-gold); color: #000; flex: 1;"><i class="fa-solid fa-star"></i> Đánh giá</button>`;
        }

        if (usesOrderRPC()) {
            const button = (action, label) => '<button class="btn ' + (action === 'cancel' ? 'btn-danger' : ['pause','rework','progress'].includes(action) ? 'btn-outline' : 'btn-primary') + '" onclick="window.runOrderAction(&quot;' + escapeHtml(order.id) + '&quot;,&quot;' + action + '&quot;)">' + label + '</button>';
            let actions = '';
            if (!order.cancelled) {
                if (order.queue_only && isBoosterRole) actions += button('claim','Nhận đơn');
                if (isAdmin && order.status === 'cho_xu_ly') {
                    if (order.kind === 'boost' && !order.paid_amount) actions += button('quote','Báo giá');
                    if (order.quote_accepted && order.paid_amount < order.price) actions += button('payment','Xác nhận tiền');
                    if (!order.paid_amount) actions += button('cancel','Hủy đơn');
                }
                if (isOwner && order.status === 'cho_xu_ly' && order.price > 0 && !order.quote_accepted) actions += button('approve_quote','Chấp thuận giá');
                if ((isAdmin || isAssignedBooster) && order.status === 'dang_cay') {
                    actions += button('progress','Cập nhật tiến độ') + button('submit','Gửi nghiệm thu') + button('pause','Tạm dừng');
                }
                if (isAdmin && order.status === 'tam_dung') actions += button('resume','Tiếp tục');
                if (isOwner && order.status === 'cho_nghiem_thu') actions += button('complete','Nghiệm thu') + button('rework','Yêu cầu làm lại');
                if (isOwner && order.status === 'hoan_thanh' && !order.rating) actions += '<button class="btn" onclick="window.openRatingModal(&quot;' + escapeHtml(order.id) + '&quot;)">Đánh giá</button>';
            }
            const summary = canViewPrivate ? '<div class="oc-settlement"><span>Đã thu: ' + Number(order.paid_amount || 0).toLocaleString('vi-VN') + ' đ</span><span>Cần thu trước khi giao: ' + Number(order.required_amount || 0).toLocaleString('vi-VN') + ' đ</span></div>' + (order.result_note ? '<p class="oc-result">' + escapeHtml(order.result_note) + '</p>' : '') : '';
            if (canViewPrivate) {
                if (order.kind === 'topup') {
                    actions += '<button class="btn btn-outline" onclick="window.viewOrderCredentials(&quot;' + escapeHtml(order.id) + '&quot;)"><i class=\"fa-solid fa-key\"></i> Xem TK game</button>';
                }
                actions += '<button class="btn" onclick="window.openChat(&quot;' + escapeHtml(order.id) + '&quot;,&quot;' + escapeHtml(order.order_code) + '&quot;)">Chat / ảnh</button>';
                actions += '<button class="btn" onclick="window.openTicketModal(&quot;' + escapeHtml(order.id) + '&quot;)">Hỗ trợ</button>';
            }
            normalButtons = '<div class="oc-action-group">' + summary + '<div class="oc-actions">' + actions + '</div></div>';
            adminRow1 = normalButtons; adminRow2 = ''; adminRow3 = '';
        }

        let displayTitle = 'Không có mô tả';
        let server = order.game_server || 'Chưa xác định';
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

        if (usesOrderRPC()) calculatedProgress = Math.min(100, Math.max(0, Number(order.progress) || 0));
        const html = `
            <article class="card order-card-modern">
                <div class="oc-header">
                    <div>
                        <div class="oc-id">${escapeHtml(order.order_code || '#-----')}${order.kind === 'topup' ? ' <span style=\"background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;\"><i class=\"fa-solid fa-bolt\"></i> Nạp Game</span>' : ''}</div>
                        <h3 class="oc-title">${escapeHtml(displayTitle)}</h3>
                    </div>
                    <div class="oc-status" style="background: ${statusInfo.colorVar}20; color: ${statusInfo.colorVar}; border: 1px solid ${statusInfo.colorVar}40;">
                        <i class="fa-solid ${statusInfo.icon}"></i> ${statusInfo.text}
                    </div>
                </div>
                
                <div class="oc-body">
                    <div class="oc-row">
                        <span class="oc-label">Dịch vụ</span>
                        <span class="oc-value"><i class="fa-solid fa-gamepad" style="color: var(--primary-light)"></i> ${escapeHtml(serviceGroup)}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Máy chủ</span>
                        <span class="oc-value">${escapeHtml(server)}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Người thuê</span>
                        <span class="oc-value">${escapeHtml(isAdmin ? (order.renter_name || 'Khách') : maskString(order.renter_name))}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Booster</span>
                        <span class="oc-value" style="color: var(--secondary)">${escapeHtml(order.booster_name || 'Chưa nhận')}</span>
                    </div>
                    <div class="oc-row">
                        <span class="oc-label">Thời hạn</span>
                        <span class="oc-value">${escapeHtml(deadlineStr)}</span>
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
                ${isAdmin ? `
                <div class="oc-footer" style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                    <div style="display:flex; gap:8px;">${adminRow1}</div>
                    <div style="display:flex;">${adminRow2}</div>
                    <div style="display:flex;">${adminRow3}</div>
                </div>` : ''}
                ${!isAdmin && normalButtons ? `<div class="oc-footer" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 15px;">${normalButtons}</div>` : ''}
            </article>
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
    let counts = { all: orders.length, cancelled: 0, cho_xu_ly: 0, dang_cay: 0, cho_nghiem_thu: 0, hoan_thanh: 0, tam_dung: 0 };
    orders.forEach(o => {
        if (o.cancelled) counts.cancelled++;
        else if (counts[o.status] !== undefined) counts[o.status]++;
    });
    
    document.getElementById('totalOrdersBadge').innerText = `${orders.length} đơn`;
    
    ['all', 'cho_xu_ly', 'dang_cay', 'cho_nghiem_thu', 'hoan_thanh', 'cancelled'].forEach(status => {
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
        const revenue = orders.filter(o => o.status === 'hoan_thanh').reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const revenueFormatted = revenue.toLocaleString('vi-VN') + ' đ';
        const overdueCount = orders.filter(o => {
            if (!o.content) return false;
            const dlMatch = o.content.match(/Deadline:\s*([^\n]+)/);
            if (!dlMatch) return false;
            const dl = new Date(dlMatch[1]);
            return !isNaN(dl) && dl < new Date() && o.status !== 'hoan_thanh';
        }).length;
        html = `
        <div class="stats-card">
            <h3 class="stats-title"><i class="fa-solid fa-crown" style="color: var(--genshin-gold)"></i> QUẢN TRỊ VIÊN</h3>
            <div class="stat-item">
                <span class="stat-label">Tổng đơn hệ thống</span>
                <span class="stat-value" id="stat-total" style="color: #fff">${orders.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Tổng doanh thu</span>
                <span class="stat-value" style="color: var(--status-hoan-thanh); font-size: 14px;">${revenueFormatted}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Khiếu nại / Report</span>
                <span class="stat-value" id="stat-reports" style="color: var(--status-tam-dung)">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Đơn quá hạn</span>
                <span class="stat-value" style="color: #f43f5e">${overdueCount}</span>
            </div>
        </div>`;
    } else if (userRole === 'booster') {
        const myOrders = orders.filter(o => o.booster_id === currentUserId);
        const income = myOrders.filter(o => o.status === 'hoan_thanh').reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const incomeFormatted = income.toLocaleString('vi-VN') + ' đ';
        const active = myOrders.filter(o => !o.cancelled && o.status === 'dang_cay').length;
        const rated = myOrders.filter(o => Number(o.rating) > 0);
        const averageRating = rated.length ? (rated.reduce((sum,o) => sum + Number(o.rating),0) / rated.length).toFixed(1) : 'Chưa có';
        html = `
        <div class="stats-card">
            <h3 class="stats-title"><i class="fa-solid fa-bolt" style="color: var(--primary)"></i> THỐNG KÊ BOOSTER</h3>
            <div class="stat-item">
                <span class="stat-label">Đơn đang cày</span>
                <span class="stat-value" id="stat-booster-active" style="color: var(--status-dang-cay)">${active}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Thu nhập ước tính</span>
                <span class="stat-value" style="color: var(--status-hoan-thanh); font-size: 14px;">${incomeFormatted}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Điểm đánh giá</span>
                <span class="stat-value" style="color: var(--genshin-gold)"><i class="fa-solid fa-star"></i> ${averageRating}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Lượt đánh giá</span>
                <span class="stat-value">${rated.length}</span>
            </div>
        </div>`;
    } else {
        const myOrders = orders.filter(o => (o.user_id === currentUserId) || (o.renter_name === currentUsername));
        const spent = myOrders.filter(o => o.status === 'hoan_thanh').reduce((sum, o) => sum + (Number(o.price) || 0), 0);
        const spentFormatted = spent.toLocaleString('vi-VN') + ' đ';
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
                <span class="stat-value" style="color: var(--status-hoan-thanh); font-size: 14px;">${spentFormatted}</span>
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
                window.animateCountUp(el, targetVal, 1000);
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.1 });
    sidebar.querySelectorAll('.count-up-price').forEach(price => observer.observe(price));
};

window.acceptOrder = async (orderId) => {
    if (usesOrderRPC()) return window.runOrderAction(orderId, 'claim');
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
    if (usesOrderRPC()) {
        const action = {cho_nghiem_thu:'submit',hoan_thanh:'complete',tam_dung:'pause',dang_cay:'resume'}[newStatus];
        if (action) return window.runOrderAction(orderId, action);
        return alert('Hãy dùng thao tác theo vòng đời đơn.');
    }
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

// Xóa đơn hàng (chỉ Admin)
window.deleteOrder = async function(orderId, orderCode) {
    if (usesOrderRPC()) return window.runOrderAction(orderId, 'cancel');
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'admin' && userRole !== 'super_admin') return alert('Bạn không có quyền xóa đơn!');
    
    const confirmed = confirm(`❌ Bạn chắc chắn muốn XÓA đơn ${orderCode}?\n\nHành động này không thể hoàn tác!`);
    if (!confirmed) return;
    if (!supabaseClient) return;

    try {
        // Xóa tin nhắn liên quan
        await supabaseClient.from('order_messages').delete().eq('order_id', orderId);
        // Xóa log liên quan
        await supabaseClient.from('order_logs').delete().eq('order_id', orderId);
        // Xóa thông báo liên quan
        await supabaseClient.from('notifications').delete().eq('order_id', orderId);
        // Xóa đơn
        const { error } = await supabaseClient.from('orders').delete().eq('id', orderId);
        if (error) throw error;
        alert(`✅ Đơn ${orderCode} đã được xóa thành công!`);
        if (typeof window.fetchOrders === 'function') window.fetchOrders();
    } catch (err) {
        alert('Lỗi khi xóa đơn: ' + err.message);
    }
};

window.fetchLeaderboard = async function() {
    const list = document.getElementById('leaderboardList');
    if (!list || !supabaseClient) return;
    
    const { data, error } = await supabaseClient.rpc('booster_profiles');
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
        
        const displayName = b.username || b.display_name || 'Booster';
        let avatar = '/assets/images/logo.jpg';
        try {
            const avatarUrl = new URL(String(b.avatar_url || ''), window.location.origin);
            if (['http:', 'https:'].includes(avatarUrl.protocol)) avatar = escapeHtml(avatarUrl.href);
        } catch (_) {}
        list.innerHTML += `
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="font-weight: bold; color: ${badgeColor}; width: 20px;">#${index + 1}</div>
                <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="color: #fff; font-size: 0.9rem; font-weight: 600;">${escapeHtml(displayName)}</div>
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
    if (usesOrderRPC()) {
        const button = document.getElementById('submitTicketBtn');
        if (!currentUser?.id || button.disabled) return;
        const issue = document.getElementById('ticketIssueType').value;
        const description = document.getElementById('ticketComment').value.trim();
        if (!description) return alert('Vui lòng mô tả sự cố.');
        button.disabled = true;
        try {
            await window.OrderAPI.ticket(supabaseClient,currentUser.id,window.ticketOrderId,issue,description);
            document.getElementById('ticketModal').classList.remove('active');
            alert('Đã gửi yêu cầu hỗ trợ.');
        } catch (error) { alert(error.message); }
        finally { button.disabled = false; }
        return;
    }
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
    renderedMessages.clear();
    const chatActor = currentUser?.id;
    const codeEl = document.getElementById('chatOrderCode');
    if(codeEl) codeEl.innerText = orderCode;
    const modal = document.getElementById('chatModal');
    if(modal) modal.classList.add('active');
    
    window.switchChatTab('chat');
    
    const msgContainer = document.getElementById('chatMessages');
    if(msgContainer) msgContainer.innerHTML = '<div style="text-align:center; color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</div>';
    
    const { data, error } = await supabaseClient.from('order_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    
    if (currentChatOrderId !== orderId || currentUser?.id !== chatActor) return;
    if (error) {
        if(msgContainer) msgContainer.innerHTML = '<div style="text-align:center; color:var(--status-tam-dung);">Lỗi tải tin nhắn.</div>';
    } else {
        if(msgContainer) msgContainer.innerHTML = '';
        if(data) {
            for (const msg of data) {
                if (usesOrderRPC()) await appendPrivateMessage(msg,orderId,chatActor);
                else appendMessage(msg);
            }
        }
    }
    
    if (currentChatOrderId !== orderId || currentUser?.id !== chatActor) return;
    if(currentChatSub) await supabaseClient.removeChannel(currentChatSub);
    currentChatSub = supabaseClient.channel('chat_'+orderId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_messages', filter: 'order_id=eq.'+orderId }, payload => {
            if (currentChatOrderId !== orderId || currentUser?.id !== chatActor) return;
            if (usesOrderRPC()) appendPrivateMessage(payload.new,orderId,chatActor).catch(() => {});
            else appendMessage(payload.new);
        }).subscribe();
};

window.closeChat = function() {
    if(currentChatSub) { supabaseClient.removeChannel(currentChatSub); currentChatSub = null; }
    currentChatOrderId = null;
    const modal = document.getElementById('chatModal');
    if(modal) modal.classList.remove('active');
};

function compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve(event.target.result);
        };
        reader.onerror = () => resolve(null);
    });
}

async function uploadFileOrFallback(file, prefix = 'img') {
    let publicUrl = null;
    try {
        if (supabaseClient && supabaseClient.storage) {
            const ext = file.name.split('.').pop();
            const fileName = `${prefix}_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabaseClient.storage.from('chat_images').upload(fileName, file);
            if (!uploadError) {
                const { data: publicData } = supabaseClient.storage.from('chat_images').getPublicUrl(fileName);
                if (publicData && publicData.publicUrl) {
                    publicUrl = publicData.publicUrl;
                }
            }
        }
    } catch (e) {
        console.warn('Storage bucket upload failed, using Base64 fallback:', e);
    }
    if (!publicUrl) {
        publicUrl = await compressImage(file);
    }
    return publicUrl;
}

window.openImageLightbox = function(src) {
    let modal = document.getElementById('imageLightboxModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'imageLightboxModal';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '999999';
        modal.style.background = 'rgba(0, 0, 0, 0.9)';
        modal.style.backdropFilter = 'blur(8px)';
        modal.innerHTML = `
            <div style="position: relative; max-width: 90vw; max-height: 90vh; display: flex; align-items: center; justify-content: center;">
                <button class="modal-close" onclick="document.getElementById('imageLightboxModal').classList.remove('active')" style="top: -45px; right: 0; color: #fff; font-size: 22px; background: rgba(255,255,255,0.15); width: 40px; height: 40px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-xmark"></i></button>
                <img id="lightboxImg" src="" style="max-width: 90vw; max-height: 85vh; border-radius: 12px; object-fit: contain; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
        document.body.appendChild(modal);
    }
    const imgEl = document.getElementById('lightboxImg');
    if (imgEl) imgEl.src = src;
    modal.classList.add('active');
};

function appendMessage(msg) {
    const msgContainer = document.getElementById('chatMessages');
    if(!msgContainer) return;
    
    const isMine = msg.sender_id === localStorage.getItem('userId');
    let contentHtml = escapeHtml(msg.message || '');
    
    if (!usesOrderRPC() && contentHtml.includes('IMAGE:')) {
        const parts = contentHtml.split('IMAGE:');
        const textPart = parts[0].trim();
        const candidate = (msg.message || '').split('IMAGE:')[1].trim();
        const imgUrl = escapeHtml(/^https:\/\//i.test(candidate) ? candidate : '');
        contentHtml = `
            ${textPart ? `<div style="margin-bottom: 6px; font-weight: 500;">${textPart}</div>` : ''}
            <img src="${imgUrl}" onclick="window.openImageLightbox(this.src)" style="max-width:100%; max-height:260px; border-radius:8px; display:block; cursor:pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" alt="Ảnh tiến độ">
        `;
    }
    
    if (usesOrderRPC() && /^https:\/\//i.test(msg.privateImageUrl || '')) {
        contentHtml += '<img src="' + escapeHtml(msg.privateImageUrl) + '" alt="Ảnh đính kèm" style="max-width:100%;max-height:260px" onclick="window.openImageLightbox(this.src)">';
    } else if (msg.privateAttachmentUnavailable) contentHtml += '<p>Không tải được ảnh. Mở lại cuộc trò chuyện để thử lại.</p>';
    const html = `
        <div style="display: flex; flex-direction: column; align-items: ${isMine ? 'flex-end' : 'flex-start'}; margin-bottom: 10px;">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">${escapeHtml(msg.sender_name)}</div>
            <div style="background: ${isMine ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}; color: #fff; padding: 10px 15px; border-radius: 12px; max-width: 85%; word-break: break-word;">
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
    if (usesOrderRPC()) return sendStagingChat(imgInput?.files[0],msgText,input,imgInput);
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
        const imageUrl = await uploadFileOrFallback(file, 'chat');
        if (imageUrl) {
            newMsg.message = msgText ? `${msgText}\nIMAGE:${imageUrl}` : `IMAGE:${imageUrl}`;
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

// Handler for chat image input onchange
window.uploadChatImage = async function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file || !currentChatOrderId || !supabaseClient) return;
    if (usesOrderRPC()) return sendStagingChat(file,'',null,event.target);
    const currentUserId = localStorage.getItem('userId');
    const currentUsername = localStorage.getItem('username') || 'Ẩn danh';
    const imageUrl = await uploadFileOrFallback(file, 'chat');
    event.target.value = '';
    if (!imageUrl) return alert('Không thể xử lý ảnh, vui lòng thử lại!');
    const newMsg = {
        order_id: currentChatOrderId,
        sender_id: currentUserId,
        sender_name: currentUsername,
        message: `IMAGE:${imageUrl}`
    };
    const { error: dbError } = await supabaseClient.from('order_messages').insert([newMsg]);
    if (dbError) alert('Lỗi gửi ảnh: ' + dbError.message);
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
        menuToggle.addEventListener('click', () => {
            const expanded = navLinks.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', String(expanded));
        });
    }
    
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el || el.classList.contains('modal-close')) {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            }
        });
    });

    // Contain keyboard focus in the existing form overlays and restore it on close.
    const overlays = [...document.querySelectorAll('.modal-overlay')];
    let activeOverlay = null, overlayTrigger = null;
    const focusables = modal => [...modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')]
        .filter(el => !el.disabled && el.getClientRects().length > 0);
    overlays.forEach(modal => new MutationObserver(() => {
        if (modal.classList.contains('active') && activeOverlay !== modal) {
            overlayTrigger = document.activeElement;
            activeOverlay = modal;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            const title = modal.querySelector('h2,h3');
            if (title) { title.id ||= modal.id + 'Title'; modal.setAttribute('aria-labelledby', title.id); }
            focusables(modal)[0]?.focus();
        } else if (!modal.classList.contains('active') && activeOverlay === modal) {
            activeOverlay = null;
            overlayTrigger?.focus();
        }
    }).observe(modal, {attributes:true,attributeFilter:['class']}));
    document.addEventListener('keydown', event => {
        if (!activeOverlay || document.querySelector('dialog[open]')) return;
        if (event.key === 'Escape') { activeOverlay.classList.remove('active'); event.preventDefault(); }
        if (event.key === 'Tab') {
            const targets = focusables(activeOverlay), first = targets[0], last = targets.at(-1);
            if (!first) return;
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
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

    // Edit Order Modal
    window.openEditOrderModal = async function(orderId) {
        if (!supabaseClient) return;
        const modal = document.getElementById('editOrderModal');
        if (!modal) return;
        
        try {
            const { data, error } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
            if (error) throw error;
            if (data) {
                document.getElementById('editOrderId').value = data.id;
                
                // Parse server/group from content (e.g. "[Asia] [Nhiệm vụ] ...") if available
                let contentStr = data.content || '';
                let server = 'Asia', group = 'Khác', goal = '', notes = '';
                
                // Trích xuất server và group từ format cũ
                const match = contentStr.match(/^\[(.*?)\]\s+\[(.*?)\]\s+(.*?)\nDeadline:\s+(.*?)\nGhi chú:\s+([\s\S]*)$/);
                if (match) {
                    server = match[1];
                    group = match[2];
                    goal = match[3];
                    // match[4] is deadline string
                    notes = match[5];
                } else {
                    notes = contentStr; // Fallback
                }
                
                document.getElementById('editOrderServer').value = server;
                
                // Try to set group if it exists in the select options
                const groupSelect = document.getElementById('editOrderServiceGroup');
                let groupExists = false;
                for (let i = 0; i < groupSelect.options.length; i++) {
                    if (groupSelect.options[i].value === group) { groupExists = true; break; }
                }
                document.getElementById('editOrderServiceGroup').value = groupExists ? group : 'Khác';
                
                let deadlineVal = match ? match[4] : '';
                document.getElementById('editOrderGoal').value = goal;
                document.getElementById('editOrderDeadline').value = deadlineVal;
                document.getElementById('editOrderPrice').value = data.price || 0;
                document.getElementById('editOrderContent').value = notes;
                
                modal.classList.add('active');
            }
        } catch (e) {
            alert('Lỗi tải dữ liệu đơn hàng: ' + e.message);
        }
    };

    // Progress Image Upload Modal
    window.openProgressModal = function(orderId, customerId) {
        const modal = document.getElementById('progressModal');
        if (!modal) return;
        document.getElementById('progressOrderId').value = orderId || '';
        document.getElementById('progressOrderCustomerId').value = customerId || '';
        document.getElementById('progressForm').reset();
        const preview = document.getElementById('progressPreview');
        if (preview) preview.style.display = 'none';
        modal.classList.add('active');
    };

    // Rating modal
    window.openRatingModal = function(orderId) {
        const modal = document.getElementById('ratingModal');
        if (modal) {
            modal.dataset.orderId = orderId;
            modal.dataset.rating = '0';
            const comment = document.getElementById('ratingComment');
            if (comment) comment.value = '';
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
            if (usesOrderRPC()) {
                submitRatingBtn.disabled = true;
                try { if (await window.runOrderAction(orderId, 'review', {rating, comment})) modal.classList.remove('active'); }
                finally { submitRatingBtn.disabled = false; }
                return;
            }
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
        notifDropdown.style.display = 'none';
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = notifDropdown.style.display === 'flex';
            notifDropdown.style.display = isVisible ? 'none' : 'flex';
            notifDropdown.style.flexDirection = 'column';
            // Fetch notifications when opened
            if (!isVisible && supabaseClient) {
                const currentUserId = localStorage.getItem('userId');
                if (currentUserId) {
                    const listEl = document.getElementById('notificationList') || notifDropdown;
                    supabaseClient.from('notifications').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(15)
                        .then(({ data }) => {
                            if (!data || data.length === 0) {
                                listEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.85rem;">Không có thông báo mới</div>';
                                return;
                            }
                            listEl.innerHTML = data.map(n => `
                                <div class="notif-item ${!n.read_at ? 'unread' : ''}">
                                    <div style="font-size:0.85rem;color:#fff;font-weight:600;">${escapeHtml(n.title || 'Thông báo')}</div>
                                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:3px;">${escapeHtml(n.content || '')}</div>
                                    <div class="notif-time">${new Date(n.created_at).toLocaleString('vi-VN')}</div>
                                </div>`).join('');
                        });
                }
            }
        });
        document.addEventListener('click', (e) => {
            if (!notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
                notifDropdown.style.display = 'none';
            }
        });
    }

    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn && supabaseClient) {
        markAllReadBtn.addEventListener('click', async () => {
            const currentUserId = localStorage.getItem('userId');
            if (!currentUserId) return;
            await supabaseClient.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', currentUserId).is('read_at', null);
            const listEl = document.getElementById('notificationList');
            if (listEl) listEl.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            if (e.defaultPrevented || !loginForm.checkValidity()) return;
            e.preventDefault();
            if(!supabaseClient) return alert('Chưa tải xong kết nối, vui lòng thử lại.');
            const btn = loginForm.querySelector('button[type="submit"]');
            if (!btn || btn.disabled) return;
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;
            const email = user + '@namcumz.com';
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG ĐĂNG NHẬP...';
            btn.disabled = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: pass });
            if (error) {
                alert('Tên tài khoản hoặc mật khẩu không đúng!');
            } else {
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
            if (e.defaultPrevented || !registerForm.checkValidity()) return;
            e.preventDefault();
            if(!supabaseClient) return alert('Chưa tải xong kết nối.');
            const btn = registerForm.querySelector('button[type="submit"]');
            if (!btn || btn.disabled) return;
            const username = document.getElementById('regUsername').value.trim();
            const pass = document.getElementById('regPassword').value;
            const pass2 = document.getElementById('regPasswordConfirm').value;
            const displayName = document.getElementById('regDisplayName').value.trim() || username;
            
            if (pass !== pass2) return alert('Mật khẩu nhập lại không khớp!');
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG TẠO...';
            btn.disabled = true;

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: username + '@namcumz.com', password: pass,
                    options: { data: { display_name: displayName } }
                });
                if (error) throw error;
                if (!data?.user) throw new Error('Chưa nhận được kết quả đăng ký. Vui lòng thử lại.');
                // Server provisions profiles through Auth trigger on staging & production, never from browser.
                if (!['staging', 'production'].includes(window.NAMCUMZ_CONFIG?.environment)) {
                    const { error: profileError } = await supabaseClient.from('user_roles').insert([
                        { id: data.user.id, username: username, role: 'customer' }
                    ]);
                    if (profileError) throw new Error('Tài khoản đã được tạo nhưng hồ sơ chưa hoàn tất. Vui lòng liên hệ hỗ trợ.');
                }
                if (data.session) {
                    alert('Đăng ký thành công! Đang đăng nhập...');
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
                } else {
                    alert('Chưa có phiên đăng nhập. Hệ thống yêu cầu xác minh email; luồng tài khoản hiện tại cần được cấu hình trước khi đăng nhập.');
                }
            } catch (error) {
                alert('Không thể hoàn tất đăng ký: ' + (error.message || 'Vui lòng thử lại.'));
            } finally {
                btn.innerHTML = 'ĐĂNG KÝ NGAY';
                btn.disabled = false;
            }
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
            if (!currentUser?.id) return alert('Vui lòng đăng nhập trước khi tạo đơn.');
            if (btn.disabled) return;
            if (usesOrderRPC()) {
                if (!createOrderForm.reportValidity()) return;
                const value = id => document.getElementById(id).value.trim();
                const content = '[' + value('orderServer') + '] [' + value('orderServiceGroup') + '] ' + value('orderGoal') + '\nDeadline: ' + value('orderDeadline') + '\nGhi chú: ' + value('orderContent');
                btn.disabled = true;
                btn.textContent = 'Đang tạo...';
                try {
                    await window.OrderAPI.create(supabaseClient, currentUser.id, content, value('orderServer'));
                    createOrderForm.reset();
                    document.getElementById('createOrderModal').classList.remove('active');
                    await window.fetchOrders();
                    alert('Đã tạo đơn, chờ shop báo giá.');
                } catch (error) { alert(error.message); }
                finally { btn.disabled = false; btn.textContent = 'Tạo đơn'; }
                return;
            }
            const isGuest = false;
            
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
                content: content, status: 'cho_xu_ly', user_id: currentUser.id, secret_code: secretCode,
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
    
    // Edit Order Submit logic
    const editOrderForm = document.getElementById('editOrderForm');
    if (editOrderForm) {
        editOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!supabaseClient) return;
            const btn = document.getElementById('submitEditOrderBtn');
            const orderId = document.getElementById('editOrderId').value;
            
            const server = document.getElementById('editOrderServer').value;
            const group = document.getElementById('editOrderServiceGroup').value;
            const goal = document.getElementById('editOrderGoal').value.trim();
            const deadline = document.getElementById('editOrderDeadline').value;
            const notes = document.getElementById('editOrderContent').value.trim();
            let price = parseFloat(document.getElementById('editOrderPrice').value) || 0;
            
            const content = `[${server}] [${group}] ${goal}\nDeadline: ${deadline}\nGhi chú: ${notes}`;
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> LƯU...';
            btn.disabled = true;
            
            const updateData = {
                content: content,
                price: price
            };
            
            const { error } = await supabaseClient.from('orders').update(updateData).eq('id', orderId);
            
            if (error) {
                alert('Lỗi khi sửa đơn: ' + error.message);
            } else {
                alert('Đã cập nhật đơn hàng thành công!');
                document.getElementById('editOrderModal').classList.remove('active');
                if(typeof window.fetchOrders === 'function') window.fetchOrders();
            }
            btn.innerHTML = 'Lưu thay đổi';
            btn.disabled = false;
        });
    }

    // Progress File Preview Listener
    const progressFileInput = document.getElementById('progressFileInput');
    if (progressFileInput) {
        progressFileInput.addEventListener('change', function(e) {
            const preview = document.getElementById('progressPreview');
            const previewImg = document.getElementById('progressPreviewImg');
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    previewImg.src = evt.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(e.target.files[0]);
            } else {
                if (preview) preview.style.display = 'none';
            }
        });
    }

    // Progress Form Submit Handler
    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
        progressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabaseClient) return alert('Chưa kết nối Supabase, vui lòng tải lại trang!');
            const btn = document.getElementById('submitProgressBtn');
            const orderId = document.getElementById('progressOrderId').value;
            const customerId = document.getElementById('progressOrderCustomerId').value;
            const fileInput = document.getElementById('progressFileInput');
            const captionInput = document.getElementById('progressCaptionInput');
            
            if (!fileInput || !fileInput.files[0]) return alert('Vui lòng chọn 1 hình ảnh tiến độ!');
            
            const file = fileInput.files[0];
            const caption = captionInput ? captionInput.value.trim() : '';
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG ĐĂNG...';
            btn.disabled = true;

            try {
                const imageUrl = await uploadFileOrFallback(file, `progress_${orderId}`);
                if (!imageUrl) throw new Error('Không thể xử lý hình ảnh');

                const currentUserId = localStorage.getItem('userId');
                const currentUsername = localStorage.getItem('username') || 'Booster';
                const messageText = caption ? `📸 [ẢNH TIẾN ĐỘ] ${caption}\nIMAGE:${imageUrl}` : `📸 [ẢNH TIẾN ĐỘ]\nIMAGE:${imageUrl}`;

                // Insert progress image into chat/order_messages table so customer & admin can view in real time
                const { error: msgErr } = await supabaseClient.from('order_messages').insert([{
                    order_id: orderId,
                    sender_id: currentUserId,
                    sender_name: currentUsername,
                    message: messageText
                }]);
                if (msgErr) throw msgErr;

                // Log action
                if (typeof window.logOrderAction === 'function') {
                    window.logOrderAction(orderId, `Booster ${currentUsername} đã cập nhật ảnh tiến độ mới.`);
                }

                // Send notification to customer if present
                if (customerId && customerId !== 'null' && customerId !== 'undefined') {
                    await supabaseClient.from('notifications').insert([{
                        user_id: customerId,
                        title: 'Ảnh tiến độ mới 📸',
                        content: `Booster ${currentUsername} vừa tải lên ảnh tiến độ mới cho đơn hàng của bạn.`,
                        order_id: orderId
                    }]);
                }

                alert('Cập nhật ảnh tiến độ thành công!');
                document.getElementById('progressModal').classList.remove('active');
                if (typeof window.fetchOrders === 'function') window.fetchOrders();
            } catch (err) {
                alert('Lỗi đăng ảnh tiến độ: ' + err.message);
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Đăng ảnh tiến độ';
                btn.disabled = false;
            }
        });
    }
    
    // Chat Send message logic
    const chatForm = document.getElementById('sendMessageForm');
    if(chatForm) chatForm.addEventListener('submit', window.sendMessage);
}

function initDynamicSlogan() {
    const slogan = document.getElementById('dynamicSlogan');
    if (slogan) slogan.textContent = 'Theo dõi tiến độ và trao đổi cùng shop.';
}

async function initSupabaseLogic() {
    if(!supabaseClient) return;
    if (!(await verifyDatabaseContract())) return;
    
    injectDynamicModals();
    setupNavbar();
    bindEvents();
    initDynamicSlogan();
    
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userId', session.user.id);
            currentUser = session.user;
            verifiedRole = 'customer';
            localStorage.setItem('userRole', 'customer');
            
            try {
                const { data } = await supabaseClient.from('user_roles').select('username, role').eq('id', session.user.id).single();
                if (data) {
                    localStorage.setItem('username', data.username || '');
                    verifiedRole = data.role || 'customer';
                    localStorage.setItem('userRole', verifiedRole);
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
            verifiedRole = 'guest';
            setupNavbar();
            if (typeof window.fetchOrders === 'function') window.fetchOrders();
        }
    });

    window.fetchOrders();
    window.fetchLeaderboard();
}

document.addEventListener('DOMContentLoaded', () => {
    const orderSearch = document.getElementById('searchInput');
    if (orderSearch) orderSearch.value = '';
    const config = window.NAMCUMZ_CONFIG || {};
    const localHost = ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);
    const configuredStaging = config.environment === 'staging' && /^https:\/\/[^/]+\.supabase\.co$/.test(config.supabaseUrl || '') && config.supabaseAnonKey && config.supabaseUrl !== SUPABASE_URL;
    const configuredProd = config.environment === 'production' && /^https:\/\/[^/]+\.supabase\.co$/.test(config.supabaseUrl || '') && config.supabaseAnonKey;
    const configured = configuredStaging || configuredProd;
    if ((localHost || config.environment === 'staging') && !configured) {
        const notice = document.createElement('p');
        notice.setAttribute('role', 'alert');
        notice.textContent = 'Chưa cấu hình Supabase staging. Kết nối dữ liệu đang tắt để bảo vệ production. Cấu hình assets/js/runtime-config.js rồi tải lại.';
        document.body.prepend(notice);
        return;
    }
    const databaseUrl = configured ? config.supabaseUrl : SUPABASE_URL;
    const databaseKey = configured ? config.supabaseAnonKey : SUPABASE_ANON_KEY;
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(databaseUrl, databaseKey);
        initSupabaseLogic();
    } else {
        console.warn("Supabase CDN blocked/failed! Trying unpkg fallback...");
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.onload = () => {
            if (window.supabase) {
                supabaseClient = window.supabase.createClient(databaseUrl, databaseKey);
                initSupabaseLogic();
            } else { alert("Không thể kết nối Supabase (Mạng bị chặn CDN)."); }
        };
        script.onerror = () => { alert("Lỗi mạng nghiêm trọng: CDN bị chặn."); };
        document.head.appendChild(script);
    }
});

// Securely view credentials for Topup Orders (Protected by RLS)
window.viewOrderCredentials = async function(orderId) {
    let modal = document.getElementById('viewCredModal');
    if (!modal) {
        const mHtml = `
            <div class="modal-overlay" id="viewCredModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;">
                <div class="modal-content" style="background:#18181b;border:1px solid #3f3f46;border-radius:14px;max-width:480px;width:90%;padding:24px;position:relative;color:#fff;">
                    <button class="modal-close" onclick="document.getElementById('viewCredModal').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#a1a1aa;font-size:20px;cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
                    <h3 style="margin-top:0;margin-bottom:16px;color:#f59e0b;display:flex;align-items:center;gap:8px;"><i class="fa-solid fa-key"></i> Thông Tin Tài Khoản Nạp</h3>
                    <div id="viewCredModalBody">Đang tải...</div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', mHtml);
        modal = document.getElementById('viewCredModal');
    }
    const body = document.getElementById('viewCredModalBody');
    body.innerHTML = '<div style="text-align:center;padding:20px;color:#a1a1aa;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải thông tin bảo mật...</div>';
    modal.style.display = 'flex';
    try {
        const { data: credentialRows, error } = await supabaseClient.rpc('get_order_credentials', { p_order_id: orderId });
        const data = credentialRows?.[0] || null;
        if (error || !data) throw error || new Error('Không tìm thấy thông tin đăng nhập hoặc bạn không có quyền xem.');
        body.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:14px;">
                <div style="background:#27272a;padding:12px;border-radius:8px;">
                    <div style="font-size:12px;color:#a1a1aa;margin-bottom:4px;">Phương thức đăng nhập</div>
                    <div style="font-weight:700;color:#fff;">${escapeHtml(data.login_method || 'Hoyoverse')}</div>
                </div>
                <div style="background:#27272a;padding:12px;border-radius:8px;">
                    <div style="font-size:12px;color:#a1a1aa;margin-bottom:4px;">Tên tài khoản / Email</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;color:#fff;font-family:monospace;word-break:break-all;">${escapeHtml(data.account_username)}</span>
                        <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" data-copy-value="${escapeHtml(data.account_username)}"><i class="fa-solid fa-copy"></i></button>
                    </div>
                </div>
                <div style="background:#27272a;padding:12px;border-radius:8px;">
                    <div style="font-size:12px;color:#a1a1aa;margin-bottom:4px;">Mật khẩu</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <input type="password" id="viewCredPassField" readonly value="${escapeHtml(data.account_password)}" style="background:none;border:none;color:#fff;font-weight:700;font-family:monospace;font-size:15px;outline:none;width:70%;">
                        <div style="display:flex;gap:6px;">
                            <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" data-toggle-password="viewCredPassField"><i class="fa-solid fa-eye"></i></button>
                            <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" data-copy-value="${escapeHtml(data.account_password)}"><i class="fa-solid fa-copy"></i></button>
                        </div>
                    </div>
                </div>
                <div style="background:#27272a;padding:12px;border-radius:8px;">
                    <div style="font-size:12px;color:#a1a1aa;margin-bottom:4px;">SĐT Zalo liên hệ</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;color:#38bdf8;">${escapeHtml(data.contact_phone)}</span>
                        <a href="https://zalo.me/${encodeURIComponent(data.contact_phone)}" target="_blank" class="btn btn-outline" style="padding:4px 10px;font-size:12px;text-decoration:none;"><i class="fa-solid fa-comment-dots"></i> Zalo</a>
                    </div>
                </div>
                ${data.notes ? `
                <div style="background:#27272a;padding:12px;border-radius:8px;">
                    <div style="font-size:12px;color:#a1a1aa;margin-bottom:4px;">Ghi chú</div>
                    <div style="font-size:13px;color:#ddd;white-space:pre-wrap;">${escapeHtml(data.notes)}</div>
                </div>` : ''}
            </div>
        `;
        body.querySelectorAll('[data-copy-value]').forEach((button) => {
            button.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(button.dataset.copyValue || '');
                    alert(button.dataset.copyValue === document.getElementById('viewCredPassField')?.value ? 'Đã sao chép mật khẩu!' : 'Đã sao chép tài khoản!');
                } catch (copyError) {
                    alert('Không thể sao chép thông tin trên thiết bị này.');
                }
            });
        });
        body.querySelectorAll('[data-toggle-password]').forEach((button) => {
            button.addEventListener('click', () => {
                const field = document.getElementById(button.dataset.togglePassword);
                if (field) field.type = field.type === 'password' ? 'text' : 'password';
            });
        });
    } catch (err) {
        body.innerHTML = '<div style="color:#ef4444;padding:16px;">' + escapeHtml(err.message || 'Lỗi khi tải thông tin đăng nhập') + '</div>';
    }
};
// Browsers may restore form values when returning to the dashboard from history/BFCache.
if (typeof window.addEventListener === 'function') window.addEventListener('pageshow', () => {
    const orderSearch = document.getElementById('searchInput');
    if (orderSearch) {
        orderSearch.value = '';
        if (typeof window.applyFilters === 'function') window.applyFilters();
    }
});
