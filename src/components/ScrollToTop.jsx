import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function smoothScrollTo(top, duration = 500) {
  const start = window.pageYOffset;
  const change = top - start;
  const startTime = performance.now();

  function easeInOutQuad(t) {
    return t < 0.5
      ? 2 * t * t
      : -1 + (4 - 2 * t) * t;
  }

  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeInOutQuad(progress);

    window.scrollTo(0, start + change * easeProgress);

    if (elapsed < duration) {
      requestAnimationFrame(animateScroll);
    }
  }

  requestAnimationFrame(animateScroll);
}

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Instantly scroll to top to prevent visual jump
    window.scrollTo(0, 0);

    // Then optionally smooth scroll to top again (remove if not needed)
    // smoothScrollTo(0, 800);
  }, [pathname]);

  return null;
}
