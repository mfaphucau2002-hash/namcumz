const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('assets/js/landing.js', 'utf8');
const start = source.indexOf('function updateLandingAccountLinks() {');
const end = source.indexOf('// Open and close the small-screen navigation', start);
const listener = "window.addEventListener('namcumz-auth-updated', updateLandingAccountLinks);";
assert.ok(start >= 0 && end > start && source.includes(listener));

function harness() {
  const listeners = {};
  const orders = Array.from({length: 5}, () => ({href: '/login.html'}));
  const account = {href: '', textContent: ''};
  const actions = {
    innerHTML: '',
    links: {'.lp-login': {href: ''}, '.lp-header-cta': {href: ''}},
    querySelector(selector) { return this.links[selector]; },
    appendChild(link) { this.accountLink = link; }
  };
  const context = {
    window: {currentUser: null, NAMCUMZ_PUBLIC_USER: null, addEventListener: (name, callback) => {listeners[name] = callback;}},
    document: {
      getElementById: id => ({lpAuthActions: actions, lpMobileAccount: account}[id] || null),
      querySelectorAll: selector => selector === '[data-order-link]' ? orders : [],
      createElement: () => ({ setAttribute(){}, classList: { contains: () => false } }),
      body: { classList: { contains: () => false } }
    },
    localStorage: {getItem: () => null},
    encodeURIComponent
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + listener, context);
  return {context, listeners, orders, account, actions};
}

test('guest service links open login and return to order creation', () => {
  const h = harness();
  h.listeners['namcumz-auth-updated']();
  for (const link of h.orders) {
    const url = new URL(link.href, 'https://namcumz.io.vn');
    assert.equal(url.pathname, '/login.html');
    assert.equal(url.searchParams.get('form'), 'login');
    assert.equal(url.searchParams.get('next'), '/dashboard?action=create-order');
  }
  assert.equal(h.account.href, '/login.html?form=login');
  assert.equal(h.actions.links['.lp-login'].href, '/login.html?form=login');
});

test('verified session sends service links directly to order creation', () => {
  const h = harness();
  h.context.window.NAMCUMZ_PUBLIC_USER = {id: 'session-user'};
  h.listeners['namcumz-auth-updated']();
  assert.ok(h.orders.every(link => link.href === '/dashboard?action=create-order'));
  assert.equal(h.account.href, '/profile.html#orders');
  assert.equal(h.actions.accountLink.href, '/profile.html#orders');
  h.context.window.NAMCUMZ_PUBLIC_USER = null;
  h.listeners['namcumz-auth-updated']();
  assert.equal(new URL(h.orders[0].href, 'https://namcumz.io.vn').searchParams.get('next'), '/dashboard?action=create-order');
});
test('public account label uses the same actor-scoped profile name as dashboard', () => {
  const h = harness();
  h.context.window.NAMCUMZ_PUBLIC_USER = {id:'session-user',user_metadata:{display_name:'old name'}};
  h.context.localStorage.getItem = key => key === 'userId' ? 'session-user' : 'current profile name';
  h.listeners['namcumz-auth-updated']();
  assert.equal(h.actions.accountLink.textContent,'current profile name / Đơn hàng');
  h.context.localStorage.getItem = key => key === 'userId' ? 'other-user' : 'other profile name';
  h.listeners['namcumz-auth-updated']();
  assert.equal(h.actions.accountLink.textContent,'old name / Đơn hàng');
});

test('eco mode toggles performance state, updates button classes, and preserves setting', () => {
  const fullSource = fs.readFileSync('assets/js/landing.js', 'utf8');
  const ecoStart = fullSource.indexOf('function applyEcoMode(on) {');
  const ecoEnd = fullSource.indexOf('// Interactive Game Tab Filter', ecoStart);
  assert.ok(ecoStart > 0 && ecoEnd > ecoStart);

  const storage = {};
  const classes = new Set();
  const toggleBtn = {
    id: 'lpEcoToggle',
    classes: new Set(['perf-toggle-btn']),
    attrs: {},
    classList: {
      toggle(cls, val) { if (val) toggleBtn.classes.add(cls); else toggleBtn.classes.delete(cls); },
      contains(cls) { return toggleBtn.classes.has(cls); }
    },
    setAttribute(k, v) { toggleBtn.attrs[k] = v; },
    getAttribute(k) { return toggleBtn.attrs[k] || null; },
    addEventListener(event, fn) { toggleBtn.listener = fn; }
  };
  const body = {
    classList: {
      toggle(cls, val) { if (val) classes.add(cls); else classes.delete(cls); },
      contains(cls) { return classes.has(cls); }
    }
  };
  const ctx = {
    window: {},
    document: {
      body,
      getElementById: id => id === 'lpEcoToggle' ? toggleBtn : null,
      querySelectorAll: sel => sel.includes('perf-toggle-btn') ? [toggleBtn] : []
    },
    localStorage: {
      getItem: k => storage[k] || null,
      setItem: (k, v) => { storage[k] = String(v); }
    },
    Boolean,
    String
  };
  vm.createContext(ctx);
  vm.runInContext(fullSource.slice(ecoStart, ecoEnd), ctx);

  // Initial call to setup
  ctx.setupEcoMode();
  assert.equal(classes.has('perf-eco-mode'), false);
  assert.equal(toggleBtn.classes.has('active'), false);

  // 1st toggle: turns ON
  ctx.window.toggleEcoMode();
  assert.equal(classes.has('perf-eco-mode'), true);
  assert.equal(toggleBtn.classes.has('active'), true);
  assert.equal(storage['namcumz_eco_mode'], '1');
  assert.equal(toggleBtn.attrs['aria-pressed'], 'true');

  // 2nd toggle: turns OFF
  ctx.window.toggleEcoMode();
  assert.equal(classes.has('perf-eco-mode'), false);
  assert.equal(toggleBtn.classes.has('active'), false);
  assert.equal(storage['namcumz_eco_mode'], '0');
  assert.equal(toggleBtn.attrs['aria-pressed'], 'false');
});
