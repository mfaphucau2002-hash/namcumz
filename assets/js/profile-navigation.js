// Same-origin detail destinations and keyboard-accessible account panels.
(() => {
  const keys = ['my-orders', 'claim-order', 'settings'];
  window.profileOrderDestination = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? '/dashboard?order=' + encodeURIComponent(id) : '';
  window.switchTab = (key, trigger, updateUrl = true) => {
    if (!keys.includes(key)) return;
    const target = document.getElementById('tab-' + key);
    if (!target) return;
    document.querySelectorAll('.tab-content').forEach(panel => panel.classList.toggle('active', panel === target));
    document.querySelectorAll('[data-profile-tab]').forEach(button => {
      const selected = button.dataset.profileTab === key;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    if (updateUrl && window.location.hash !== '#' + key) window.history.replaceState(null, '', '#' + key);
    if (key === 'my-orders' && typeof window.loadMyOrders === 'function') window.loadMyOrders();
  };
  const fromHash = () => {
    const key = window.location.hash.slice(1);
    if (keys.includes(key)) window.switchTab(key, null, false);
  };
  document.querySelectorAll('[data-profile-tab]').forEach(button => {
    button.addEventListener('keydown', event => {
      const current = keys.indexOf(button.dataset.profileTab);
      let next;
      if (event.key === 'ArrowRight') next = (current + 1) % keys.length;
      else if (event.key === 'ArrowLeft') next = (current + keys.length - 1) % keys.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = keys.length - 1;
      else return;
      event.preventDefault();
      const target = document.getElementById('profile-tab-' + keys[next]);
      window.switchTab(keys[next], target);
      target?.focus();
    });
  });
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
