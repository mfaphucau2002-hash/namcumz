// RPC writes retain the same request ID after an uncertain network outcome.
(function () {
    const pending = new Map();
    const inflight = new Map();
    async function write(client, actor, operation, payload) {
        if (!client || !actor) throw new Error('Vui lòng đăng nhập trước khi thao tác.');
        if (window.NAMCUMZ_CONFIG?.environment && window.NAMCUMZ_DB_READY !== true) {
            throw new Error('Hệ thống đang bảo trì để đồng bộ cơ sở dữ liệu. Vui lòng thử lại sau.');
        }
        const key = JSON.stringify([actor, operation, payload]);
        if (inflight.has(key)) return inflight.get(key);
        const request = pending.get(key) || crypto.randomUUID();
        pending.set(key, request);
        const task = (async () => {
            let timer;
            let response;
            try {
                response = await Promise.race([
                    client.rpc(operation, { ...payload, p_request: request }),
                    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Quá thời gian chờ. Thử lại thao tác này sẽ dùng cùng mã yêu cầu.')), 20000); })
                ]);
            } finally { clearTimeout(timer); }
            const { data, error } = response;
            if (error) throw new Error(error.code === 'PGRST202'
                ? 'Hệ thống chưa có RPC quản lý đơn. Cần kiểm tra migration.'
                : error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
            const row = Array.isArray(data) ? data[0] : data;
            if (!row?.id) throw new Error('Chưa xác nhận được kết quả. Thử lại sẽ dùng cùng mã yêu cầu.');
            pending.delete(key);
            return row;
        })();
        inflight.set(key, task);
        try { return await task; } finally { inflight.delete(key); }
    }
    window.OrderAPI = {
        message(client, actor, orderId, message, attachment = null) {
            return write(client, actor, 'send_order_message', {p_order:orderId,p_message:message,p_attachment:attachment});
        },
        ticket(client, actor, orderId, issue, description) {
            return write(client, actor, 'create_ticket', {p_order:orderId,p_issue:issue,p_description:description});
        },
        create(client, actor, content, server) {
            if (!content.trim() || content.length > 10000 || !['Asia','Europe','America','TW/HK/MO'].includes(server)) {
                return Promise.reject(new Error('Nội dung hoặc máy chủ không hợp lệ.'));
            }
            return write(client, actor, 'create_order', {p_content: content.trim(), p_server: server});
        },
        topup(client, actor, packageId, server, loginMethod, account, password, phone, notes = '') {
            if (!packageId || !account.trim() || !password.trim() || !phone.trim() || !['Asia','Europe','America','TW/HK/MO'].includes(server)) {
                return Promise.reject(new Error('Vui lòng điền đầy đủ thông tin tài khoản, mật khẩu, SĐT và máy chủ.'));
            }
            return write(client, actor, 'create_topup_order', {
                p_package: packageId,
                p_server: server,
                p_login_method: loginMethod || 'Hoyoverse',
                p_account: account.trim(),
                p_password: password.trim(),
                p_phone: phone.trim(),
                p_notes: notes.trim()
            });
        },
        action(client, actor, order, action, data = {}) {
            if (!order?.id || !Number.isInteger(order.version)) {
                return Promise.reject(new Error('Thiếu phiên bản đơn. Hãy tải lại danh sách.'));
            }
            return write(client, actor, 'order_action', {
                p_order: order.id, p_version: order.version, p_action: action, p_data: data
            });
        },
        async payByWallet(client, actor, orderId) {
            if (!client || !actor) throw new Error('Vui lòng đăng nhập trước khi thao tác.');
            if (!orderId) throw new Error('Mã đơn không hợp lệ.');
            const { data, error } = await client.rpc('pay_order_by_wallet', { p_order_id: orderId });
            if (error) {
                throw new Error(error.message || 'Không thể thanh toán bằng ví. Vui lòng thử lại.');
            }
            const res = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(res) ? res[0] : res;
        },
        async cancelPayment(client, actor, orderId) {
            if (!client || !actor) throw new Error('Vui lòng đăng nhập trước khi thao tác.');
            if (!orderId) throw new Error('Mã đơn không hợp lệ.');
            const { data, error } = await client.rpc('cancel_order_payment', { p_order_id: orderId });
            if (error) {
                throw new Error(error.message || 'Không thể hủy thanh toán đơn.');
            }
            const res = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(res) ? res[0] : res;
        },
        async getPaymentInfo(client, orderIdentifier) {
            if (!client || !orderIdentifier) return null;
            const { data, error } = await client.rpc('get_order_payment_info', { p_order_identifier: String(orderIdentifier).trim() });
            if (error) throw error;
            const res = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(res) ? res[0] : res;
        },
        async createDeposit(client, actor, amount) {
            if (!client || !actor) throw new Error('Vui lòng đăng nhập trước khi thao tác.');
            const num = Number(amount);
            if (!num || num < 10000) throw new Error('Số tiền nạp tối thiểu là 10.000 VNĐ.');
            if (num > 50000000) throw new Error('Số tiền nạp tối đa mỗi lần là 50.000.000 VNĐ.');
            const { data, error } = await client.rpc('create_deposit_order', { p_amount: num });
            if (error) {
                throw new Error(error.code === 'PGRST202'
                    ? 'Hệ thống chưa đồng bộ RPC nạp ví. Vui lòng thử lại sau.'
                    : (error.message || 'Không thể tạo đơn nạp ví. Vui lòng thử lại.'));
            }
            const res = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(res) ? res[0] : res;
        },
        async claimDailyCheckin(client, actor) {
            if (!client || !actor) throw new Error('Vui lòng đăng nhập trước khi thao tác.');
            const { data, error } = await client.rpc('claim_daily_checkin');
            if (error) {
                throw new Error(error.message || 'Không thể điểm danh. Vui lòng thử lại.');
            }
            const res = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(res) ? res[0] : res;
        },
        async getProfileSummary(client) {
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu.');
            const { data, error } = await client.rpc('get_user_profile_summary');
            if (error) throw error;
            const res = typeof data === 'string' ? JSON.parse(data) : data;
            return Array.isArray(res) ? res[0] : res;
        }
    };
})();
