import { h } from '../utils/dom';
import { createTeamTorinLogo } from './team-torin-logo';

const INTRO_HOLD_MS = 4700;
const INTRO_EXIT_MS = 500;

export function playIntro(onComplete: () => void): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    onComplete();
    return;
  }

  const overlay = h('div', { className: 'intro-overlay', 'aria-hidden': 'true' },
    createTeamTorinLogo(),
  );

  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-active'));

  window.setTimeout(() => {
    overlay.classList.add('is-exiting');
    window.setTimeout(() => {
      overlay.remove();
      onComplete();
    }, INTRO_EXIT_MS);
  }, INTRO_HOLD_MS);
}
