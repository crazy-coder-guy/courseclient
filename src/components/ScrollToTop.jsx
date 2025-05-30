import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function smoothScrollTo(top, duration = 500) {
  const start = window.pageYOffset;
  const change = top - start;
  const startTime = performance.now();

  // easing function: easeInOutQuad
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
    smoothScrollTo(0, 800); // scroll to top with 800ms duration (adjust speed here)
  }, [pathname]);

  return null;
}
