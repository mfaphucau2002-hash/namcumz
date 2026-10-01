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
        }
    };
})();
