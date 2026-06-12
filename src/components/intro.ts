import { h } from '../utils/dom';

const INTRO_MS = 1400;

export function playIntro(onComplete: () => void): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    onComplete();
    return;
  }

  const overlay = h('div', { className: 'intro-overlay', 'aria-hidden': 'true' },
    h('div', { className: 'intro-backdrop' }),
    h('div', { className: 'intro-glow' }),
    h('div', { className: 'intro-panel glass-panel' },
      h('span', { className: 'intro-eyebrow' }, 'Private Competition'),
      h('span', { className: 'intro-title' }, 'World Cup 2026'),
    ),
  );

  document.body.append(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('is-active');
  });

  window.setTimeout(() => {
    overlay.classList.add('is-exiting');
    window.setTimeout(() => {
      overlay.remove();
      onComplete();
    }, 500);
  }, INTRO_MS);
}
