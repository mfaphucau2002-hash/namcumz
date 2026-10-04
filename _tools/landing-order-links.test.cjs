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
      createElement: () => ({})
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
  assert.equal(h.account.href, '/dashboard.html');
  assert.equal(h.actions.accountLink.href, '/dashboard.html');
  h.context.window.NAMCUMZ_PUBLIC_USER = null;
  h.listeners['namcumz-auth-updated']();
  assert.equal(new URL(h.orders[0].href, 'https://namcumz.io.vn').searchParams.get('next'), '/dashboard?action=create-order');
});