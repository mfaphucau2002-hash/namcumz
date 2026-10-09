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
  } catch (error) {
    alreadySeen = false;
  }

  if (alreadySeen || hasReducedMotion) {
    root.classList.add('lp-intro-done');
    return;
  }

  root.classList.add('lp-intro-active');
  if (window.innerWidth <= 768) screen.classList.add('intro-mobile');

  const startedAt = performance.now();
  let animationFrame = 0;
  let isClosing = false;

  // Cập nhật vòng tiến trình cho intro ngắn trước khi mở trang chủ.
  function updateProgress(now) {
    if (isClosing) return;

    const progress = Math.min((now - startedAt) / 1450, 1);
    const percent = Math.round(progress * 100);
    progressText.textContent = String(percent);
    percentText.textContent = String(percent);
    progressRing.style.strokeDashoffset = String(163 * (1 - progress));

    if (progress >= 1) {
      closeIntro();
      return;
    }

    animationFrame = window.requestAnimationFrame(updateProgress);
  }

  // Thu hai cánh intro để lộ trang chủ và chỉ phát lại ở tab mới.
  function closeIntro() {
    if (isClosing) return;
    isClosing = true;
    window.cancelAnimationFrame(animationFrame);
    try {
      sessionStorage.setItem('namcumz_intro_seen', '1');
    } catch (error) {
      // Intro vẫn đóng bình thường nếu bộ nhớ phiên bị chặn.
    }

    screen.querySelector('.intro-curtain-left')?.classList.add('intro-exit-left');
    screen.querySelector('.intro-curtain-right')?.classList.add('intro-exit-right');
    screen.querySelector('.intro-center')?.classList.add('intro-fade-out');
    if (screen.classList.contains('intro-mobile')) screen.classList.add('intro-exit-mobile');

    window.setTimeout(() => {
      root.classList.remove('lp-intro-active');
      root.classList.add('lp-intro-done');
    }, 900);
  }

  skipButton?.addEventListener('click', closeIntro);
  animationFrame = window.requestAnimationFrame(updateProgress);
})();