import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../assets/js/app.js', import.meta.url), 'utf8');

function createAppVm(options = {}) {
    const elements = options.elements || {};
    const callbacks = {};
    const storage = new Map();
    const alerts = [];
    const locationObj = {
        hostname: 'localhost',
        pathname: '/dashboard.html',
        search: '',
        origin: 'http://localhost',
        assign() {}
    };
    const context = vm.createContext({
        window: {
            location: locationObj,
            addEventListener() {},
            setTimeout() {},
            clearTimeout() {}
        },
        location: locationObj,
        URLSearchParams,
        console,
        localStorage: {
            getItem: k => storage.get(k) ?? null,
            setItem: (k, v) => storage.set(k, v),
            removeItem: k => storage.delete(k)
        },
        document: {
            getElementById: id => elements[id] || null,
            addEventListener: (name, fn) => { callbacks[name] = fn; },
            createElement: () => ({ setAttribute() {}, querySelector() { return null; } }),
            body: { prepend() {}, appendChild() {}, insertAdjacentHTML() {} },
            documentElement: { classList: { contains: () => false } },
            querySelectorAll: () => []
        },
        IntersectionObserver: class { observe() {} disconnect() {} },
        setTimeout() {},
        clearTimeout() {},
        setInterval() {},
        alert(msg) { alerts.push(String(msg)); },
        confirm() { return true; },
        requestAnimationFrame() {},
        performance: { now: () => 0 }
    });
    vm.runInContext(appSource, context);
    return { context, elements, callbacks, alerts };
}

function createMockFormElements(values = {}) {
    const listeners = {};
    let resetCount = 0;
    const modalClasses = new Set(['active']);
    const btn = { disabled: false, textContent: 'Tạo đơn', innerHTML: 'Tạo đơn' };
    const createOrderForm = {
        addEventListener(event, handler) { listeners[event] = handler; },
        reportValidity: () => true,
        reset() { resetCount++; }
    };
    const elements = {
        createOrderForm,
        submitOrderBtn: btn,
        createOrderModal: { classList: { remove: cls => modalClasses.delete(cls), has: cls => modalClasses.has(cls) } },
        orderRenter: { value: values.renter ?? 'Khách Test' },
        orderPrice: { value: values.price ?? '0' },
        orderServer: { value: values.server ?? 'Asia' },
        orderServiceGroup: { value: values.group ?? 'La Hoàn' },
        orderGoal: { value: values.goal ?? 'La Hoàn tầng 12' },
        orderDeadline: { value: values.deadline ?? '2026-12-01' },
        orderContent: { value: values.content ?? 'Chăm acc 1 tháng' }
    };
    return {
        elements,
        btn,
        getResetCount: () => resetCount,
        submit: async () => {
            assert.equal(typeof listeners.submit, 'function', 'createOrderForm submit listener must be registered');
            let prevented = false;
            await listeners.submit({ preventDefault() { prevented = true; } });
            assert.equal(prevented, true);
        }
    };
}

test('containsSensitiveCredentialText detects explicit password and OTP labels', () => {
    const { context } = createAppVm();
    const detect = context.window.containsSensitiveCredentialText;
    assert.equal(typeof detect, 'function');

    const positiveCases = [
        'mk: 123456',
        'mk=123456',
        'MK: Abc12345',
        'pass: mySecret',
        'password=mySecret123',
        'pw: hunter2',
        'Mật khẩu: xyz789',
        'MẬT KHẨU: xyz789',
        'mat khau = xyz789',
        'Mật khẩu: xyz789'.normalize('NFD'),
        'Mật khẩu:\nxyz789',
        'OTP: 482910',
        'Mã OTP: 482910',
        'ma otp = 482910',
        'Ghi chú đơn (pass: abc123)',
        'mk 123456',
        'Mật khẩu là xyz789',
        'OTP 482910'
    ];

    for (const sample of positiveCases) {
        assert.equal(detect(sample), true, `Expected positive detection for: ${JSON.stringify(sample)}`);
    }
});

test('containsSensitiveCredentialText detects email paired with password cue or password token', () => {
    const { context } = createAppVm();
    const detect = context.window.containsSensitiveCredentialText;

    const positiveCases = [
        'tanphat622005@gmail.com \nabc1234567',
        'tanphat622005@gmail.com \r\nabc1234567',
        'tanphat622005@gmail.com\n\nAbc@12345',
        'TK: tanphat622005@gmail.com\nP@ssword1\nNhớ xả nhựa',
        'tanphat622005@gmail.com | abc1234567',
        'tanphat622005@gmail.com / MyP@ss123',
        'tanphat622005@gmail.com:12345678',
        'tanphat622005@gmail.com abc1234567',
        'user@gmail.com mk gửi kèm',
        'user@gmail.com pass ở trên',
        'user@gmail.com mật khẩu gửi qua đây',
        'user@gmail.com mã otp'
    ];

    for (const sample of positiveCases) {
        assert.equal(detect(sample), true, `Expected positive detection for: ${JSON.stringify(sample)}`);
    }
});

test('containsSensitiveCredentialText allows safe boosting goals and notes without false positives', () => {
    const { context } = createAppVm();
    const detect = context.window.containsSensitiveCredentialText;

    const safeCases = [
        'La Hoàn tầng 12',
        'Battle Pass Trân Châu',
        'Battle Pass: Gói Trân Châu 50',
        'Express Supply Pass',
        'Express Supply Pass: 2 gói',
        'Explore Map Fontaine 100%',
        'SĐT Zalo 0901234567',
        'Chăm acc 1 tháng',
        'passing abyss floor 12',
        'Treasure compass 100%',
        'compass: full map Sumeru',
        'Cày pass 12-3 full 36*',
        'Cần mã OTP thì gọi Zalo 0901234567',
        'Mình sẽ gửi mật khẩu qua chat sau khi báo giá',
        'Liên hệ email khach@gmail.com khi xong Battle Pass',
        'Email liên hệ: khach@gmail.com\nExplore Map Fontaine 100%',
        'Email liên hệ: khach@gmail.com\n26/11/2026',
        'Email liên hệ: khach@gmail.com\nhttps://imgur.com/a/abc123',
        '',
        '   ',
        null,
        undefined,
        12345
    ];

    for (const sample of safeCases) {
        assert.equal(detect(sample), false, `Expected safe (false) for: ${JSON.stringify(sample)}`);
    }
});

test('createOrderForm RPC branch blocks sensitive credentials and allows safe submissions', async () => {
    const form = createMockFormElements({
        goal: 'La Hoàn tầng 12',
        content: 'tanphat622005@gmail.com \nabc1234567'
    });
    const { context, elements, alerts } = createAppVm({ elements: form.elements });
    const dialogs = [];
    const createdOrders = [];

    context.window.NAMCUMZ_CONFIG = { environment: 'production' };
    context.window.showOrderDialog = async opts => { dialogs.push(opts); return true; };
    context.window.OrderAPI = {
        create: async (_client, userId, content, server) => {
            createdOrders.push({ userId, content, server });
            return { id: 'order-1' };
        }
    };
    context.window.fetchOrders = async () => {};
    vm.runInContext("supabaseClient = { rpc: async () => ({}) }; currentUser = { id: 'user-1' }; bindEvents();", context);

    // 1. Plaintext email + password in orderContent is blocked before OrderAPI.create.
    await form.submit();
    assert.equal(createdOrders.length, 0);
    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0].tone, 'warning');
    assert.match(dialogs[0].message, /mật khẩu/i);
    assert.equal(form.btn.disabled, false);

    // 2. Password in orderGoal is also blocked.
    elements.orderGoal.value = 'pass: mySecret';
    elements.orderContent.value = 'Chăm acc 1 tháng';
    await form.submit();
    assert.equal(createdOrders.length, 0);
    assert.equal(dialogs.length, 2);

    // 3. Split-field paste (email in orderGoal + password token in orderContent) is blocked.
    elements.orderGoal.value = 'tanphat622005@gmail.com';
    elements.orderContent.value = 'abc1234567';
    await form.submit();
    assert.equal(createdOrders.length, 0);
    assert.equal(dialogs.length, 3);

    // 4. Fallback to alert when showOrderDialog is unavailable.
    context.window.showOrderDialog = null;
    elements.orderGoal.value = 'La Hoàn tầng 12';
    elements.orderContent.value = 'OTP: 482910';
    await form.submit();
    assert.equal(createdOrders.length, 0);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /OTP/);

    // 5. Safe boosting order passes validation and calls OrderAPI.create.
    context.window.showOrderDialog = async opts => { dialogs.push(opts); return true; };
    elements.orderGoal.value = 'Battle Pass Trân Châu';
    elements.orderContent.value = 'Explore Map Fontaine 100%, SĐT Zalo 0901234567';
    await form.submit();
    assert.equal(createdOrders.length, 1);
    assert.equal(createdOrders[0].userId, 'user-1');
    assert.equal(createdOrders[0].server, 'Asia');
    assert.equal(form.getResetCount(), 1);
});

test('createOrderForm legacy branch blocks sensitive credentials and allows safe submissions', async () => {
    const form = createMockFormElements({
        goal: 'La Hoàn tầng 12',
        content: 'Mật khẩu: xyz789'
    });
    const { context, elements } = createAppVm({ elements: form.elements });
    const dialogs = [];
    const insertedRows = [];

    context.window.NAMCUMZ_CONFIG = { environment: 'local' };
    context.window.showOrderDialog = async opts => { dialogs.push(opts); return true; };
    context.window.logOrderAction = () => {};
    context.window.sendTelegramNotification = () => {};
    context.window.fetchOrders = async () => {};
    context.__mockInsert = rows => {
        insertedRows.push(...rows);
        return { data: [{ id: 'legacy-1' }], error: null };
    };
    vm.runInContext(
        "supabaseClient = { from: () => ({ insert: rows => ({ select: async () => __mockInsert(rows) }) }) }; currentUser = { id: 'user-2' }; bindEvents();",
        context
    );

    // 1. Sensitive notes are blocked before legacy insert.
    await form.submit();
    assert.equal(insertedRows.length, 0);
    assert.equal(dialogs.length, 1);
    assert.equal(form.btn.disabled, false);

    // 2. Safe notes proceed to legacy insert.
    elements.orderContent.value = 'Chăm acc 1 tháng';
    await form.submit();
    assert.equal(insertedRows.length, 1);
    assert.equal(form.getResetCount(), 1);
});
