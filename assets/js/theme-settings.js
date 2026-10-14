/**
 * theme-settings.js — Cài đặt giao diện Namcumz
 * Tính năng: màu chính, màu nền, chế độ sáng/tối/hệ thống, độ bo góc, độ trong suốt, độ mờ nền
 * Lưu trữ: localStorage key "ncmz_theme"
 */

(function () {
  'use strict';

  /* ─── Palette dữ liệu ─────────────────────────────────────────────────── */

  const ACCENT_COLORS = [
    { name: 'Đỏ',         value: '#ef4444', glow: 'rgba(239,68,68,0.35)'   },
    { name: 'Cam Đỏ',     value: '#f97316', glow: 'rgba(249,115,22,0.35)'  },
    { name: 'Cam',        value: '#f59e0b', glow: 'rgba(245,158,11,0.35)'  },
    { name: 'Vàng',       value: '#eab308', glow: 'rgba(234,179,8,0.35)'   },
    { name: 'Xanh Lá',    value: '#84cc16', glow: 'rgba(132,204,22,0.35)'  },
    { name: 'Lá Cây',     value: '#22c55e', glow: 'rgba(34,197,94,0.35)'   },
    { name: 'Ngọc Lam',   value: '#10b981', glow: 'rgba(16,185,129,0.35)'  },
    { name: 'Xanh Mint',  value: '#14b8a6', glow: 'rgba(20,184,166,0.35)'  },
    { name: 'Xanh Dương', value: '#70dce5', glow: 'rgba(112,220,229,0.35)' },
    { name: 'Cobalt',     value: '#60a5fa', glow: 'rgba(96,165,250,0.35)'  },
    { name: 'Tím Nhạt',   value: '#818cf8', glow: 'rgba(129,140,248,0.35)' },
    { name: 'Tím',        value: '#8b5cf6', glow: 'rgba(139,92,246,0.35)'  },
    { name: 'Tím Đậm',    value: '#a855f7', glow: 'rgba(168,85,247,0.35)'  },
    { name: 'Hồng Tím',   value: '#d946ef', glow: 'rgba(217,70,239,0.35)'  },
    { name: 'Hồng',       value: '#ec4899', glow: 'rgba(236,72,153,0.35)'  },
    { name: 'Đỏ Hồng',   value: '#f43f5e', glow: 'rgba(244,63,94,0.35)'   },
  ];

  const BG_COLORS = [
    { name: 'Xám Đen',  preview: '#586574', surface0: '#070912', surface1: '#0e121f', surface2: '#14192b', raised: '#182130' },
    { name: 'Xám Tối',  preview: '#505c6a', surface0: '#0a0a0a', surface1: '#141414', surface2: '#1c1c1c', raised: '#222222' },
    { name: 'Xám Kẽm',  preview: '#434f5c', surface0: '#0d1117', surface1: '#161b22', surface2: '#21262d', raised: '#30363d' },
    { name: 'Xám Ấm',   preview: '#636056', surface0: '#111110', surface1: '#1a1915', surface2: '#25231e', raised: '#2e2b24' },
  ];

  const RADIUS_STEPS = [
    { label: '0',     multiplier: 0    },
    { label: '0.125', multiplier: 0.125 },
    { label: '0.25',  multiplier: 0.25 },
    { label: '0.375', multiplier: 0.375 },
    { label: '0.5',   multiplier: 0.5  },
  ];

  // Radius gốc (px) — đồng bộ với design-tokens.css
  const BASE_RADII = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, full: 9999 };

  /* ─── Mặc định ─────────────────────────────────────────────────────────── */

  const DEFAULTS = {
    accentIndex: 8,      // Xanh Dương (index 8)
    bgIndex: 0,          // Xám Đen
    colorScheme: 'dark', // 'light' | 'dark' | 'system'
    radiusIndex: 2,      // 0.25×
    bgOpacity: 100,      // 0-100
    bgBlur: 32,          // px
  };

  /* ─── Storage ─────────────────────────────────────────────────────────── */

  const STORAGE_KEY = 'ncmz_theme';

  function loadPrefs() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
    catch { return { ...DEFAULTS }; }
  }

  function savePrefs(prefs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  /* ─── Apply to DOM ────────────────────────────────────────────────────── */

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  function applyAccent(index, root) {
    const c = ACCENT_COLORS[index];
    root.style.setProperty('--ui-accent', c.value);
    root.style.setProperty('--brand-cyan', c.value);
    root.style.setProperty('--brand-cyan-glow', c.glow);
    root.style.setProperty('--border-active', c.value.replace('#', 'rgba(') + ',0.36)');
    root.style.setProperty('--accent', c.value);
    root.style.setProperty('--primary', c.value);
    root.style.setProperty('--primary-light', c.value);
    // Surface glass border dùng màu accent
    const { r, g, b } = hexToRgb(c.value);
    root.style.setProperty('--surface-glass-border', `rgba(${r},${g},${b},0.22)`);
  }

  function applyBg(index, opacity, blur, root) {
    const bg = BG_COLORS[index];
    const op = opacity / 100;
    root.style.setProperty('--surface-0', bg.surface0);
    root.style.setProperty('--surface-1', bg.surface1);
    root.style.setProperty('--surface-2', bg.surface2);
    root.style.setProperty('--surface-raised', bg.raised);
    // Glass surface sử dụng opacity
    const { r, g, b } = hexToRgb(bg.surface1);
    root.style.setProperty('--surface-glass', `rgba(${r},${g},${b},${Math.max(0.2, op).toFixed(2)})`);
    // Blur
    root.style.setProperty('--theme-bg-blur', `${blur}px`);
    // Cập nhật ui-bg
    root.style.setProperty('--ui-bg', bg.surface0);
    root.style.setProperty('--ui-surface', bg.surface1);
    root.style.setProperty('--ui-surface-raised', bg.raised);
    root.style.setProperty('--bg-dark', bg.surface0);
    root.style.setProperty('--bg-card', bg.surface1);
  }

  function applyRadius(index, root) {
    const m = RADIUS_STEPS[index].multiplier;
    // Với multiplier=0 → radius 0. Với 0.5 → nửa giá trị gốc. Với >0 → nội suy.
    // Thực tế UX tốt hơn: base cộng thêm bonus.
    // Công thức: result = base + (base * m) để radius luôn tăng dần
    // Nhưng tự nhiên hơn: 0=flat, 1=full
    // Ta dùng: result = base * (0.5 + m * 1.5) clamped, 0 thì = 0
    for (const [name, base] of Object.entries(BASE_RADII)) {
      let val;
      if (name === 'full') { val = base; }
      else if (m === 0) { val = 0; }
      else { val = Math.round(base * (0.5 + m * 1.5)); }
      root.style.setProperty(`--radius-${name}`, `${val}px`);
    }
    // Cập nhật ui-radius dùng radius-md
    const md = m === 0 ? 0 : Math.round(BASE_RADII.md * (0.5 + m * 1.5));
    root.style.setProperty('--ui-radius', `${md}px`);
  }

  function applyColorScheme(scheme, root) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = scheme === 'system' ? prefersDark : scheme === 'dark';
    if (isDark) {
      root.style.setProperty('color-scheme', 'dark');
      root.classList.remove('theme-light');
      root.classList.add('theme-dark');
    } else {
      root.style.setProperty('color-scheme', 'light');
      root.classList.remove('theme-dark');
      root.classList.add('theme-light');
    }
  }

  function applyAll(prefs) {
    const root = document.documentElement;
    applyAccent(prefs.accentIndex, root);
    applyBg(prefs.bgIndex, prefs.bgOpacity, prefs.bgBlur, root);
    applyRadius(prefs.radiusIndex, root);
    applyColorScheme(prefs.colorScheme, root);
  }

  /* ─── Modal HTML ──────────────────────────────────────────────────────── */

  function buildModal(prefs) {
    const accentSwatches = ACCENT_COLORS.map((c, i) => `
      <button type="button"
        class="ts-swatch ts-swatch--accent ${i === prefs.accentIndex ? 'is-active' : ''}"
        data-accent-index="${i}"
        style="background:${c.value}"
        title="${c.name}"
        aria-label="${c.name}"
        aria-pressed="${i === prefs.accentIndex ? 'true' : 'false'}"
      >${i === prefs.accentIndex ? '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,6 5,9 10,3"/></svg>' : ''}</button>
    `).join('');

    const bgSwatches = BG_COLORS.map((bg, i) => `
      <button type="button"
        class="ts-swatch ts-swatch--bg ${i === prefs.bgIndex ? 'is-active' : ''}"
        data-bg-index="${i}"
        style="background:${bg.preview}"
        title="${bg.name}"
        aria-label="${bg.name}"
        aria-pressed="${i === prefs.bgIndex ? 'true' : 'false'}"
      >${i === prefs.bgIndex ? '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,6 5,9 10,3"/></svg>' : ''}</button>
    `).join('');

    const radiusBtns = RADIUS_STEPS.map((r, i) => `
      <button type="button"
        class="ts-chip ${i === prefs.radiusIndex ? 'is-active' : ''}"
        data-radius-index="${i}"
        aria-pressed="${i === prefs.radiusIndex ? 'true' : 'false'}"
      >${r.label}</button>
    `).join('');

    return `
    <div id="ts-modal" class="ts-overlay" role="dialog" aria-modal="true" aria-labelledby="ts-title">
      <div class="ts-panel">
        <div class="ts-header">
          <h2 class="ts-title" id="ts-title">CÀI ĐẶT GIAO DIỆN</h2>
          <button type="button" class="ts-close" id="ts-close-btn" aria-label="Đóng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="ts-body">
          <!-- Màu chính -->
          <div class="ts-section">
            <div class="ts-section-label">
              <span class="ts-dot" style="background:var(--ui-accent)"></span>
              <strong>Màu chính</strong>
              <span class="ts-section-value" id="ts-accent-name">${ACCENT_COLORS[prefs.accentIndex].name}</span>
            </div>
            <div class="ts-swatches" id="ts-accent-swatches">${accentSwatches}</div>
          </div>

          <div class="ts-divider"></div>

          <!-- Màu nền -->
          <div class="ts-section">
            <div class="ts-section-label">
              <span class="ts-dot ts-dot--muted"></span>
              <strong>Màu nền</strong>
              <span class="ts-section-value" id="ts-bg-name">${BG_COLORS[prefs.bgIndex].name}</span>
            </div>
            <div class="ts-swatches" id="ts-bg-swatches">${bgSwatches}</div>
          </div>

          <div class="ts-divider"></div>

          <!-- Giao diện -->
          <div class="ts-section">
            <div class="ts-section-label">
              <svg class="ts-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              <strong>Giao diện</strong>
            </div>
            <div class="ts-toggle-group" id="ts-scheme-group">
              <button type="button" class="ts-toggle ${prefs.colorScheme === 'light' ? 'is-active' : ''}" data-scheme="light">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                Sáng
              </button>
              <button type="button" class="ts-toggle ${prefs.colorScheme === 'dark' ? 'is-active' : ''}" data-scheme="dark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                Tối
              </button>
              <button type="button" class="ts-toggle ${prefs.colorScheme === 'system' ? 'is-active' : ''}" data-scheme="system">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                Hệ thống
              </button>
            </div>
          </div>

          <div class="ts-divider"></div>

          <!-- Độ bo góc -->
          <div class="ts-section">
            <div class="ts-section-label">
              <svg class="ts-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21 L3 6 Q3 3 6 3 L21 3"/></svg>
              <strong>Độ bo góc</strong>
            </div>
            <div class="ts-chips" id="ts-radius-chips">${radiusBtns}</div>
          </div>

          <div class="ts-divider"></div>

          <!-- Độ trong suốt nền -->
          <div class="ts-section">
            <div class="ts-section-label">
              <svg class="ts-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18" opacity="0.4"/></svg>
              <strong>Độ trong suốt nền</strong>
              <span class="ts-section-value" id="ts-opacity-val">${prefs.bgOpacity}%</span>
            </div>
            <input type="range" class="ts-slider" id="ts-opacity-slider"
              min="20" max="100" step="5" value="${prefs.bgOpacity}"
              aria-label="Độ trong suốt nền">
            <p class="ts-hint">Kéo sang trái để nhìn xuyên qua các khối và viền, thấy ảnh nền phía sau</p>
          </div>

          <!-- Độ mờ nền -->
          <div class="ts-section" style="margin-top:-4px">
            <div class="ts-section-label">
              <svg class="ts-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/></svg>
              <strong>Độ mờ nền</strong>
              <span class="ts-section-value" id="ts-blur-val">${prefs.bgBlur}px</span>
            </div>
            <input type="range" class="ts-slider" id="ts-blur-slider"
              min="0" max="64" step="4" value="${prefs.bgBlur}"
              aria-label="Độ mờ nền (backdrop blur)">
          </div>

          <!-- Reset -->
          <div class="ts-footer">
            <button type="button" class="ts-reset-btn" id="ts-reset-btn">Đặt lại mặc định</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ─── Cập nhật UI sau khi thay đổi ──────────────────────────────────── */

  function updateSliderTrack(slider) {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--ui-accent) 0%, var(--ui-accent) ${pct}%, var(--surface-raised,#182130) ${pct}%, var(--surface-raised,#182130) 100%)`;
  }

  function updateSwatchActive(container, activeIndex) {
    container.querySelectorAll('.ts-swatch').forEach((btn, i) => {
      const active = i === activeIndex;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.innerHTML = active
        ? '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="2,6 5,9 10,3"/></svg>'
        : '';
    });
  }

  function updateChipActive(container, activeIndex) {
    container.querySelectorAll('.ts-chip').forEach((btn, i) => {
      const active = i === activeIndex;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function updateToggleActive(container, activeScheme) {
    container.querySelectorAll('.ts-toggle').forEach(btn => {
      const active = btn.dataset.scheme === activeScheme;
      btn.classList.toggle('is-active', active);
    });
  }

  /* ─── Init Modal ─────────────────────────────────────────────────────── */

  let modalEl = null;
  let focusTrap = null;
  let prefs = loadPrefs();

  function openModal() {
    if (document.getElementById('ts-modal')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildModal(prefs);
    modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);
    bindModalEvents();
    // Trap focus
    requestAnimationFrame(() => {
      const closeBtn = modalEl.querySelector('#ts-close-btn');
      if (closeBtn) closeBtn.focus();
    });
    document.addEventListener('keydown', handleEsc);
    modalEl.addEventListener('click', handleOverlayClick);
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.add('ts-overlay--closing');
    document.removeEventListener('keydown', handleEsc);
    setTimeout(() => {
      if (modalEl) { modalEl.remove(); modalEl = null; }
    }, 240);
    // Trả focus về nút mở
    document.getElementById('ts-open-btn')?.focus();
  }

  function handleEsc(e) { if (e.key === 'Escape') closeModal(); }
  function handleOverlayClick(e) { if (e.target === modalEl) closeModal(); }

  function bindModalEvents() {
    if (!modalEl) return;

    // Đóng
    modalEl.querySelector('#ts-close-btn').addEventListener('click', closeModal);

    // Accent swatches
    modalEl.querySelector('#ts-accent-swatches').addEventListener('click', e => {
      const btn = e.target.closest('[data-accent-index]');
      if (!btn) return;
      prefs.accentIndex = parseInt(btn.dataset.accentIndex);
      applyAccent(prefs.accentIndex, document.documentElement);
      savePrefs(prefs);
      updateSwatchActive(modalEl.querySelector('#ts-accent-swatches'), prefs.accentIndex);
      // Update dot
      modalEl.querySelector('.ts-dot').style.background = 'var(--ui-accent)';
      modalEl.querySelector('#ts-accent-name').textContent = ACCENT_COLORS[prefs.accentIndex].name;
    });

    // BG swatches
    modalEl.querySelector('#ts-bg-swatches').addEventListener('click', e => {
      const btn = e.target.closest('[data-bg-index]');
      if (!btn) return;
      prefs.bgIndex = parseInt(btn.dataset.bgIndex);
      applyBg(prefs.bgIndex, prefs.bgOpacity, prefs.bgBlur, document.documentElement);
      savePrefs(prefs);
      updateSwatchActive(modalEl.querySelector('#ts-bg-swatches'), prefs.bgIndex);
      modalEl.querySelector('#ts-bg-name').textContent = BG_COLORS[prefs.bgIndex].name;
    });

    // Scheme toggle
    modalEl.querySelector('#ts-scheme-group').addEventListener('click', e => {
      const btn = e.target.closest('[data-scheme]');
      if (!btn) return;
      prefs.colorScheme = btn.dataset.scheme;
      applyColorScheme(prefs.colorScheme, document.documentElement);
      savePrefs(prefs);
      updateToggleActive(modalEl.querySelector('#ts-scheme-group'), prefs.colorScheme);
    });

    // Radius chips
    modalEl.querySelector('#ts-radius-chips').addEventListener('click', e => {
      const btn = e.target.closest('[data-radius-index]');
      if (!btn) return;
      prefs.radiusIndex = parseInt(btn.dataset.radiusIndex);
      applyRadius(prefs.radiusIndex, document.documentElement);
      savePrefs(prefs);
      updateChipActive(modalEl.querySelector('#ts-radius-chips'), prefs.radiusIndex);
    });

    // Opacity slider
    const opacitySlider = modalEl.querySelector('#ts-opacity-slider');
    const opacityVal = modalEl.querySelector('#ts-opacity-val');
    updateSliderTrack(opacitySlider);
    opacitySlider.addEventListener('input', () => {
      prefs.bgOpacity = parseInt(opacitySlider.value);
      opacityVal.textContent = prefs.bgOpacity + '%';
      applyBg(prefs.bgIndex, prefs.bgOpacity, prefs.bgBlur, document.documentElement);
      savePrefs(prefs);
      updateSliderTrack(opacitySlider);
    });

    // Blur slider
    const blurSlider = modalEl.querySelector('#ts-blur-slider');
    const blurVal = modalEl.querySelector('#ts-blur-val');
    updateSliderTrack(blurSlider);
    blurSlider.addEventListener('input', () => {
      prefs.bgBlur = parseInt(blurSlider.value);
      blurVal.textContent = prefs.bgBlur + 'px';
      applyBg(prefs.bgIndex, prefs.bgOpacity, prefs.bgBlur, document.documentElement);
      savePrefs(prefs);
      updateSliderTrack(blurSlider);
    });

    // Reset
    modalEl.querySelector('#ts-reset-btn').addEventListener('click', () => {
      prefs = { ...DEFAULTS };
      savePrefs(prefs);
      applyAll(prefs);
      // Re-render modal
      closeModal();
      setTimeout(openModal, 260);
    });
  }

  /* ─── Nút mở (inject vào nav) ────────────────────────────────────────── */

  function injectOpenButton() {
    if (document.getElementById('ts-open-btn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ts-open-btn';
    btn.className = 'ts-open-btn';
    btn.setAttribute('aria-label', 'Cài đặt giao diện');
    btn.setAttribute('title', 'Cài đặt giao diện');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>`;
    btn.addEventListener('click', openModal);

    // Xác định container phù hợp theo thứ tự ưu tiên:
    const navAccountGroup = document.querySelector('.nav-account-group');
    const lpHeaderActions = document.querySelector('.lp-header-actions');
    const hubTopbarRight  = document.querySelector('.hub-topbar-right');
    const headerWrap      = document.querySelector('.header-wrap');

    if (navAccountGroup) {
      navAccountGroup.insertBefore(btn, navAccountGroup.firstChild);
    } else if (lpHeaderActions) {
      lpHeaderActions.insertBefore(btn, lpHeaderActions.firstChild);
    } else if (hubTopbarRight) {
      hubTopbarRight.insertBefore(btn, hubTopbarRight.firstChild);
    } else if (headerWrap) {
      const menuToggle = headerWrap.querySelector('.menu-toggle');
      if (menuToggle) {
        headerWrap.insertBefore(btn, menuToggle);
      } else {
        headerWrap.appendChild(btn);
      }
    } else {
      btn.classList.add('ts-open-btn--float');
      document.body.appendChild(btn);
    }
  }

  /* ─── Boot ────────────────────────────────────────────────────────────── */

  // Apply ngay lập tức để tránh flash
  applyAll(prefs);

  // Đợi DOM rồi inject nút
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectOpenButton);
  } else {
    injectOpenButton();
  }

  // Listen system theme change khi chế độ = 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (prefs.colorScheme === 'system') {
      applyColorScheme('system', document.documentElement);
    }
  });

  // Expose để trang khác có thể mở modal nếu cần
  window.ThemeSettings = { open: openModal, close: closeModal, prefs: () => ({ ...prefs }) };
})();
