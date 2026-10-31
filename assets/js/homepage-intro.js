(() => {
  'use strict';

  const screen = document.getElementById('lp-intro-screen');
  if (!screen) return;

  const root = document.documentElement;
  const skipButton = document.getElementById('lpIntroSkip');
  const progressText = document.getElementById('lpIntroProgress');
  const percentText = document.getElementById('lpIntroPercent');
  const progressRing = document.getElementById('lpIntroRing');
  const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alreadySeen = false;

  try {
    alreadySeen = sessionStorage.getItem('namcumz_intro_seen') === '1';
  } catch (_) {
    alreadySeen = false;
  }

  // Đã truy cập trong phiên này hoặc kích hoạt chế độ giảm chuyển động: Đóng ngay lập tức
  if (alreadySeen || hasReducedMotion) {
    root.classList.add('lp-intro-done');
    if (screen.parentNode) screen.remove();
    return;
  }

  root.classList.add('lp-intro-active');
  if (window.innerWidth <= 768) screen.classList.add('intro-mobile');

  const startedAt = performance.now();
  let animationFrame = 0;
  let isClosing = false;
  const targetDuration = 450; // Giới hạn tối đa 0.45s

  function updateProgress(now) {
    if (isClosing) return;

    const progress = Math.min((now - startedAt) / targetDuration, 1);
    const percent = Math.round(progress * 100);
    if (progressText) progressText.textContent = String(percent);
    if (percentText) percentText.textContent = String(percent);
    if (progressRing) progressRing.style.strokeDashoffset = String(163 * (1 - progress));

    if (progress >= 1) {
      closeIntro();
      return;
    }

    animationFrame = window.requestAnimationFrame(updateProgress);
  }

  function closeIntro() {
    if (isClosing) return;
    isClosing = true;

    // 1. Hủy ngay lập tức requestAnimationFrame
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    // 2. Ghi nhớ phiên truy cập
    try {
      sessionStorage.setItem('namcumz_intro_seen', '1');
    } catch (_) {}

    // 3. Kích hoạt hiệu ứng mở cánh màn hình (tối đa 0.4s)
    screen.querySelector('.intro-curtain-left')?.classList.add('intro-exit-left');
    screen.querySelector('.intro-curtain-right')?.classList.add('intro-exit-right');
    screen.querySelector('.intro-center')?.classList.add('intro-fade-out');
    if (screen.classList.contains('intro-mobile')) screen.classList.add('intro-exit-mobile');

    // 4. Sau 400ms chuyển cảnh, hủy sạch canvas nội bộ và gỡ DOM khỏi bộ nhớ
    window.setTimeout(() => {
      root.classList.remove('lp-intro-active');
      root.classList.add('lp-intro-done');

      const introCanvas = document.getElementById('intro-particles');
      if (introCanvas) {
        introCanvas.width = 0;
        introCanvas.height = 0;
      }
      if (screen.parentNode) screen.remove();
    }, 400);
  }

  // Ẩn màn hình chờ ngay khi DOMContentLoaded sẵn sàng
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    animationFrame = window.requestAnimationFrame(updateProgress);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      // Cho một độ trễ siêu ngắn để cảm nhận logo trước khi đóng mượt mà
      window.setTimeout(closeIntro, 350);
    }, { once: true });
    animationFrame = window.requestAnimationFrame(updateProgress);
  }

  skipButton?.addEventListener('click', closeIntro);
})();
