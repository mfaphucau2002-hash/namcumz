/**
 * NAMCUMZ — HOMEPAGE CORE SCRIPT
 * Ambient particles, game artwork carousel, Eco mode, and support widgets
 */

(function() {
    'use strict';

    /* ================= 1. CANVAS AMBIENT PARTICLES ================= */
    function initAnimeParticles() {
        const canvas = document.getElementById('anime-particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let particles = [];
        const count = Math.min(35, Math.floor(width / 45));

        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 2 + 1,
                color: Math.random() > 0.5 ? 'rgba(0, 242, 254, ' : 'rgba(247, 37, 133, ',
                alpha: Math.random() * 0.6 + 0.2,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4
            });
        }

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }, { passive: true });

        function render() {
            if (document.body.classList.contains('perf-eco-mode') || document.hidden) {
                requestAnimationFrame(render);
                return;
            }
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color + p.alpha + ')';
                ctx.shadowBlur = 8;
                ctx.shadowColor = p.color + '0.8)';
                ctx.fill();
            }
            requestAnimationFrame(render);
        }
        render();
    }

    /* ================= 2. ECO MODE TOGGLE ================= */
    window.toggleEcoMode = function(e) {
        if (e) e.preventDefault();
        const isEco = document.body.classList.toggle('perf-eco-mode');
        localStorage.setItem('duck_eco_mode', isEco ? '1' : '0');
        const btns = document.querySelectorAll('.perf-toggle-btn');
        btns.forEach(b => {
            if (isEco) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    };

    function initEcoMode() {
        if (localStorage.getItem('duck_eco_mode') === '1') {
            document.body.classList.add('perf-eco-mode');
            const btns = document.querySelectorAll('.perf-toggle-btn');
            btns.forEach(b => b.classList.add('active'));
        }
    }

    /* ================= 3. BANNER SLIDER ================= */
    function initBannerSlider() {
        const track = document.getElementById('donate-slider');
        const dotsContainer = document.getElementById('slider-dots');
        if (!track || !dotsContainer) return;

        const slides = track.querySelectorAll('img');
        if (!slides || slides.length === 0) return;

        let currentIndex = 0;
        let slideInterval = null;

        dotsContainer.innerHTML = '';
        slides.forEach((_, idx) => {
            const dot = document.createElement('div');
            dot.classList.add('slider-dot');
            if (idx === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                goToSlide(idx);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });

        const dots = dotsContainer.querySelectorAll('.slider-dot');

        function goToSlide(index) {
            currentIndex = index;
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            dots.forEach((d, i) => {
                d.classList.toggle('active', i === currentIndex);
            });
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % slides.length;
            goToSlide(currentIndex);
        }

        function resetInterval() {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, 5000);
        }

        resetInterval();

        // Pause on mouse hover
        const wrapper = track.parentElement;
        if (wrapper) {
            wrapper.addEventListener('mouseenter', () => clearInterval(slideInterval));
            wrapper.addEventListener('mouseleave', resetInterval);
        }
    }

    /* ================= 6. FLOATING SUPPORT WIDGET ================= */
    window.closeNamcumzSupportTooltip = function(e) {
        if (e) e.stopPropagation();
        const tooltip = document.getElementById('namcumz-support-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    };

    window.toggleNamcumzSupportWindow = function() {
        // Open Zalo customer service
        window.open('https://zalo.me/0763550673', '_blank');
    };

    /* ================= 7. MOBILE MENU ================= */
    window.toggleMobileMenu = function(e) {
        if (e) e.preventDefault();
        const nav = document.querySelector('.nav-links');
        const toggle = document.getElementById('mobile-menu');
        if (nav && toggle) {
            nav.classList.toggle('active');
            toggle.classList.toggle('is-active');
        }
    };

    document.querySelectorAll('.nav-links a').forEach(a => {
        a.addEventListener('click', () => {
            const nav = document.querySelector('.nav-links');
            const toggle = document.getElementById('mobile-menu');
            if (nav && toggle && nav.classList.contains('active')) {
                nav.classList.remove('active');
                toggle.classList.remove('is-active');
            }
        });
    });

    /* ================= 8. NAV DROPDOWN & ANNOUNCEMENT BAR ================= */
    window.closeAnnouncementBar = function() {
        const bar = document.getElementById('lpAnnouncementBar');
        if (bar) {
            bar.classList.add('is-closing');
            try { sessionStorage.setItem('namcumz_announcement_closed', '1'); } catch (_) {}
            setTimeout(() => { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 250);
        }
    };

    try {
        if (sessionStorage.getItem('namcumz_announcement_closed') === '1') {
            const bar = document.getElementById('lpAnnouncementBar');
            if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
        }
    } catch (_) {}

    window.toggleNavDropdown = function(e, btn) {
        if (e) e.stopPropagation();
        const parent = btn.closest('.nav-dropdown');
        if (parent) {
            parent.classList.toggle('open');
            parent.classList.toggle('active');
        }
    };

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.nav-dropdown.active, .nav-dropdown.open').forEach(d => {
                d.classList.remove('active');
                d.classList.remove('open');
            });
        }
    });

    /* ================= 9. AUTH STATE & MODAL INTEGRATION ================= */
    window.handleAuthOrProfile = function(e) {
        if (e) e.preventDefault();
        let user = null;
        try {
            const keys = Object.keys(localStorage);
            for (const k of keys) {
                if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                    const data = JSON.parse(localStorage.getItem(k));
                    if (data && data.user) {
                        user = data.user;
                        break;
                    }
                }
            }
        } catch (_) {}
        user = user || window.currentUser || window.NAMCUMZ_PUBLIC_USER;
        if (user) {
            window.location.href = '/profile.html';
        } else {
            window.openAuthModal(e);
        }
    };

    function syncAuthState() {
        let user = null;
        try {
            const keys = Object.keys(localStorage);
            for (const k of keys) {
                if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                    const data = JSON.parse(localStorage.getItem(k));
                    if (data && data.user) {
                        user = data.user;
                        break;
                    }
                }
            }
        } catch (_) {}
        user = user || window.currentUser || window.NAMCUMZ_PUBLIC_USER;

        const authActions = document.getElementById('lpAuthActions');
        const mobileAccount = document.getElementById('lpMobileAccount');

        const cachedName = localStorage.getItem('username');
        const displayName = (user && (cachedName || user.user_metadata?.display_name || (user.email ? user.email.split('@')[0] : 'Tài khoản'))) || 'Tài khoản';
        const label = `${displayName} / Đơn hàng`;

        if (authActions) {
            authActions.innerHTML = `
                <a class="lp-button lp-button-primary lp-header-cta" href="${user ? '/profile.html' : '/login.html?form=login'}" id="lpAccountCta" onclick="handleAuthOrProfile(event)">
                    ${label}
                </a>
            `;
        }
        if (mobileAccount) {
            mobileAccount.textContent = label;
            mobileAccount.href = user ? '/profile.html' : '/login.html?form=login';
        }
    }

    window.addEventListener('namcumz-auth-updated', syncAuthState);
    setTimeout(syncAuthState, 50);

    window.openAuthModal = function(e) {
        if (e) e.preventDefault();
        const overlay = document.getElementById('lpAuthOverlay');
        const frame = document.getElementById('lpAuthFrame');
        if (overlay && frame) {
            frame.src = '/login.html?form=login';
            overlay.hidden = false;
        } else {
            window.location.href = '/login.html?form=login';
        }
    };

    window.closeAuthModal = function() {
        const overlay = document.getElementById('lpAuthOverlay');
        const frame = document.getElementById('lpAuthFrame');
        if (overlay) overlay.hidden = true;
        if (frame) frame.src = 'about:blank';
        syncAuthState();
    };

    // Close on overlay background click
    document.addEventListener('DOMContentLoaded', () => {
        const overlay = document.getElementById('lpAuthOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) window.closeAuthModal();
            });
        }
        const closeBtn = document.querySelector('[data-auth-close]');
        if (closeBtn) {
            closeBtn.addEventListener('click', window.closeAuthModal);
        }
    });

    /* ================= INITIALIZATION ================= */
    document.addEventListener('DOMContentLoaded', () => {
        initAnimeParticles();
        initEcoMode();
        initBannerSlider();
        syncAuthState();
    });

})();
