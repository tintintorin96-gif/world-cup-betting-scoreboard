import { h } from '../utils/dom';

const INTRO_MS = 1000;

export function playIntro(onComplete: () => void): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    onComplete();
    return;
  }

  const overlay = h('div', { className: 'intro-overlay', 'aria-hidden': 'true' },
    h('div', { className: 'intro-light' }),
  );

  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-active'));

  window.setTimeout(() => {
    overlay.classList.add('is-exiting');
    window.setTimeout(() => {
      overlay.remove();
      onComplete();
    }, 450);
  }, INTRO_MS);
}
