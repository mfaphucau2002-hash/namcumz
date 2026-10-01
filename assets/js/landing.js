// Keep the landing-page account links aligned with the existing sign-in marker.
function updateLandingAccountLinks() {
  try {
    if (localStorage.getItem('isLoggedIn') !== 'true') return;
    const actions = document.getElementById('lpAuthActions');
    const mobileAccount = document.getElementById('lpMobileAccount');
    if (actions) {
      actions.innerHTML = '';
      const accountLink = document.createElement('a');
      accountLink.className = 'lp-button lp-button-primary lp-header-cta';
      accountLink.href = '/dashboard.html';
      accountLink.textContent = 'Tài khoản ↗';
      actions.appendChild(accountLink);
    }
    if (mobileAccount) {
      mobileAccount.href = '/dashboard.html';
      mobileAccount.textContent = 'Tài khoản / Đơn hàng';
    }
    document.querySelectorAll('[data-order-link]').forEach((link) => {
      link.href = '/dashboard.html';
    });
  } catch (_) {
    // Storage can be unavailable in private browsing; default links still work.
  }
}

// Open and close the small-screen navigation with accessible state.
function setupLandingMenu() {
  const toggle = document.querySelector('.lp-menu-toggle');
  const menu = document.getElementById('lpMobileNav');
  if (!toggle || !menu) return;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    menu.hidden = !open;
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setOpen(false);
  });
}

updateLandingAccountLinks();
setupLandingMenu();
