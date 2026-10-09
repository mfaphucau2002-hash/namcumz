// Keep the landing-page account links aligned with the existing sign-in marker.
function updateLandingAccountLinks() {
  try {
    const isLoggedIn = Boolean((window.currentUser || window.NAMCUMZ_PUBLIC_USER)?.id);
    const actions = document.getElementById('lpAuthActions');
    const mobileAccount = document.getElementById('lpMobileAccount');
    if (actions) {
      if (isLoggedIn) {
        actions.innerHTML = '';
        const accountLink = document.createElement('a');
        accountLink.className = 'lp-button lp-button-primary lp-header-cta';
        accountLink.href = '/dashboard.html';
        const user = window.currentUser || window.NAMCUMZ_PUBLIC_USER;
        const cachedName = localStorage.getItem('userId') === user.id ? localStorage.getItem('username') : '';
        accountLink.textContent = (cachedName || user.user_metadata?.display_name || 'Tài khoản') + ' / Đơn hàng';
        actions.appendChild(accountLink);
      } else {
        const loginLink = actions.querySelector('.lp-login');
        const createLink = actions.querySelector('.lp-header-cta');
        if (!loginLink) {
          actions.innerHTML = '<a class="lp-button lp-login" href="/login.html?form=login">Đăng nhập / Đăng ký</a><a class="lp-button lp-button-primary lp-header-cta" href="/login.html?form=login&next=%2Fdashboard%3Faction%3Dcreate-order" data-order-link>Tạo đơn ↗</a>';
        }
        if (loginLink) loginLink.href = '/login.html?form=login';
        if (createLink) createLink.href = '/login.html?form=login&next=%2Fdashboard%3Faction%3Dcreate-order';
      }
    }
    if (mobileAccount) {
      mobileAccount.href = isLoggedIn ? '/dashboard.html' : '/login.html?form=login';
      mobileAccount.textContent = isLoggedIn ? 'Tài khoản / Đơn hàng' : 'Đăng nhập / Tạo tài khoản';
    }
    document.querySelectorAll('[data-order-link]').forEach((link) => {
      const destination = '/dashboard?action=create-order';
      link.href = isLoggedIn ? destination : `/login.html?form=login&next=${encodeURIComponent(destination)}`;
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

window.addEventListener('namcumz-auth-updated', updateLandingAccountLinks);
updateLandingAccountLinks();
setupLandingMenu();
setupLandingCarousel();
setupLandingAccountModal();
setupLandingServiceSelection();
setupLandingGateway();
setupAnnouncementBar();
setupLiveTicker();
setupEcoMode();
setupGameFilters();

// Open local customer auth routes in an accessible dialog while preserving direct-link fallbacks.
function setupLandingAccountModal() {
  if (!document.getElementById('lpAuthOverlay')) {
    document.body.insertAdjacentHTML('beforeend', '<div class="lp-auth-overlay" id="lpAuthOverlay" hidden><section class="lp-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="lpAuthDialogTitle"><header class="lp-auth-dialog-header"><h2 id="lpAuthDialogTitle">Tài khoản NAMCUMZ</h2><button class="lp-auth-close" type="button" data-auth-close aria-label="Đóng đăng nhập">×</button></header><iframe class="lp-auth-frame" id="lpAuthFrame" title="Đăng nhập hoặc tạo tài khoản NAMCUMZ" referrerpolicy="same-origin"></iframe></section></div>');
  }
  const overlay = document.getElementById('lpAuthOverlay');
  const frame = document.getElementById('lpAuthFrame');
  const closeButton = overlay?.querySelector('[data-auth-close]');
  if (!overlay || !frame || !closeButton) return;
  let returnFocus = null;
  let inertSnapshot = [];
  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('lp-auth-modal-open');
    frame.src = 'about:blank';
    inertSnapshot.forEach(([element, wasInert]) => { element.inert = wasInert; });
    inertSnapshot = [];
    returnFocus?.focus();
  };
  const open = (url, trigger) => {
    returnFocus = trigger;
    url.searchParams.set('embed', '1');
    frame.src = url.href;
    inertSnapshot = [...document.body.children].filter((element) => element !== overlay).map((element) => [element, element.inert]);
    inertSnapshot.forEach(([element]) => { element.inert = true; });
    document.body.classList.add('lp-auth-modal-open');
    overlay.hidden = false;
    closeButton.focus();
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
    let url;
    try { url = new URL(link.href, window.location.href); } catch (_) { return; }
    if (url.origin !== window.location.origin || !['/login', '/login.html'].includes(url.pathname) || !['login', 'register'].includes(url.searchParams.get('form') || 'login')) return;
    event.preventDefault();
    open(url, link);
  });
  closeButton.addEventListener('click', close);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  document.addEventListener('keydown', (event) => {
    if (overlay.hidden) return;
    if (event.key === 'Escape' && document.activeElement !== frame) { event.preventDefault(); close(); return; }
    if (event.key === 'Tab' && document.activeElement === closeButton && event.shiftKey) { event.preventDefault(); frame.focus(); }
  });
  window.addEventListener('message', (event) => {
    if (event.origin === window.location.origin && event.source === frame.contentWindow && event.data?.type === 'namcumz-auth-close') close();
  });
}

// Rotate through artwork for games available in the real catalog.
function setupLandingCarousel() {
  const carousel = document.getElementById('lpHeroCarousel');
  const image = document.getElementById('lpHeroSlideImage');
  const gameTag = document.getElementById('lpHeroGameTag');
  const controls = [...document.querySelectorAll('[data-hero-slide]')];
  if (!carousel || !image || controls.length < 2) return;
  const slides = [
    {name:'Genshin Impact', src:'/assets/images/games/genshin_banner.jpg', tag:'GENSHIN IMPACT'},
    {name:'Honkai: Star Rail', src:'/assets/images/games/hsr_banner.jpg', tag:'HONKAI: STAR RAIL'},
    {name:'Zenless Zone Zero', src:'/assets/images/games/zzz_banner.jpg', tag:'ZENLESS ZONE ZERO'},
    {name:'Wuthering Waves', src:'/assets/images/games/wuwa_banner.jpg', tag:'WUTHERING WAVES'}
  ];
  let active = 0;
  let timer;
  const show = (index) => {
    active = (index + slides.length) % slides.length;
    image.src = slides[active].src;
    image.alt = `Ảnh ${slides[active].name}`;
    if (gameTag) gameTag.textContent = slides[active].tag;
    controls.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
  };
  controls.forEach((button) => button.addEventListener('click', () => {
    show(Number(button.dataset.heroSlide));
    stop();
    start();
  }));
  const stop = () => { if (timer) window.clearInterval(timer); timer = undefined; };
  const start = () => {
    if (timer || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden || carousel.matches(':hover') || carousel.contains(document.activeElement)) return;
    timer = window.setInterval(() => show(active + 1), 6500);
  };
  carousel.addEventListener('mouseenter', stop);
  carousel.addEventListener('mouseleave', start);
  carousel.addEventListener('focusin', stop);
  carousel.addEventListener('focusout', (event) => { if (!carousel.contains(event.relatedTarget)) start(); });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  start();
}

// Carry only a short-lived service choice across same-tab navigation and the login dialog.
function setupLandingServiceSelection() {
  document.addEventListener('click', event => {
    const card = event.target.closest('[data-service-preset]');
    if (!card || !['map','challenge','resources','daily','quest','events'].includes(card.dataset.servicePreset)) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    try { const preset = {key:card.dataset.servicePreset,created:Date.now()}; const goal = card.dataset.serviceGoal?.trim(); if (goal && goal.length <= 180) preset.goal = goal; sessionStorage.setItem('namcumz-service-preset', JSON.stringify(preset)); } catch (_) { /* The form remains usable when storage is unavailable. */ }
  }, true);
}

// Gateway Boot Loader: subtle session-only initiation screen, safe timeout, never blocks repeats.
function setupLandingGateway() {
  const gateway = document.getElementById('lpGatewayScreen');
  if (!gateway) return;
  let isDone = false;
  try {
    isDone = sessionStorage.getItem('namcumz_gateway_done') === '1';
  } catch (_) {}
  if (isDone || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gateway.remove();
    return;
  }
  const bar = document.getElementById('lpGatewayProgress');
  const text = document.getElementById('lpGatewayStatus');
  const percent = document.getElementById('lpGatewayPercent');
  const skipBtn = document.getElementById('lpGatewaySkip');

  const finish = () => {
    try { sessionStorage.setItem('namcumz_gateway_done', '1'); } catch (_) {}
    gateway.classList.add('is-exiting');
    setTimeout(() => { if (gateway.parentNode) gateway.remove(); }, 350);
  };

  if (skipBtn) {
    skipBtn.addEventListener('click', finish);
  }

  const steps = [
    { p: 25, t: 'Khởi tạo hệ thống NAMCUMZ Gateway...' },
    { p: 60, t: 'Đồng bộ dịch vụ Genshin, Star Rail, ZZZ, WuWa...' },
    { p: 85, t: 'Thiết lập kênh bảo mật PGP...' },
    { p: 100, t: 'Sẵn sàng trải nghiệm!' }
  ];

  let progress = 0;
  let stepIdx = 0;
  const timer = setInterval(() => {
    progress += 5;
    if (percent) percent.textContent = progress + '%';
    if (bar) bar.style.width = progress + '%';
    if (stepIdx < steps.length && progress >= steps[stepIdx].p) {
      if (text) text.textContent = steps[stepIdx].t;
      stepIdx++;
    }
    if (progress >= 100) {
      clearInterval(timer);
      setTimeout(finish, 160);
    }
  }, 24);

  // Safety fallback timeout: never block page longer than 1.5s under any circumstance
  setTimeout(() => {
    clearInterval(timer);
    finish();
  }, 1500);
}

// Global Announcement Bar: dismissable, remembers within the session.
function setupAnnouncementBar() {
  const bar = document.getElementById('lpAnnouncementBar');
  const close = document.getElementById('lpAnnouncementClose');
  if (!bar) return;
  let isClosed = false;
  try {
    isClosed = sessionStorage.getItem('namcumz_announcement_closed') === '1';
  } catch (_) {}
  if (isClosed) {
    bar.remove();
    return;
  }
  if (close) {
    close.addEventListener('click', () => {
      bar.classList.add('is-closing');
      try { sessionStorage.setItem('namcumz_announcement_closed', '1'); } catch (_) {}
      setTimeout(() => bar.remove(), 250);
    });
  }
}

// Live Operational Activity Ticker: handles pause on hover/focus and smooth continuous flow.
function setupLiveTicker() {
  const ticker = document.getElementById('lpLiveTicker');
  if (!ticker) return;
  ticker.addEventListener('focusin', () => ticker.classList.add('is-paused'));
  ticker.addEventListener('focusout', () => ticker.classList.remove('is-paused'));
}

// Eco Mode Toggle: allows smooth performance & battery conservation on low-power devices.
function setupEcoMode() {
  const toggle = document.getElementById('lpEcoToggle');
  const apply = (on) => {
    document.body.classList.toggle('perf-eco-mode', on);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(on));
      toggle.classList.toggle('active', on);
      const label = toggle.querySelector('.lp-eco-label');
      if (label) label.textContent = on ? 'Mượt mà: Bật' : 'Mượt mà';
    }
  };
  let isEco = false;
  try {
    isEco = localStorage.getItem('namcumz_eco_mode') === '1';
  } catch (_) {}
  apply(isEco);
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = !document.body.classList.contains('perf-eco-mode');
      try { localStorage.setItem('namcumz_eco_mode', next ? '1' : '0'); } catch (_) {}
      apply(next);
    });
  }
}

// Interactive Game Tab Filter for Homepage Catalog.
function setupGameFilters() {
  const buttons = document.querySelectorAll('[data-game-filter]');
  const cards = document.querySelectorAll('[data-game-target]');
  if (!buttons.length) return;
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.gameFilter;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      cards.forEach(card => {
        if (target === 'all' || card.dataset.gameTarget === target) {
          card.hidden = false;
        } else {
          card.hidden = true;
        }
      });
    });
  });
}
