const MONOGRAM_STROKES = [
  { d: 'M 18 20 H 82', delay: '0.35s' },
  { d: 'M 36 20 V 56', delay: '0.55s' },
  { d: 'M 64 20 V 56', delay: '0.75s' },
] as const;

export function createTeamTorinLogo(): HTMLElement {
  const stage = document.createElement('div');
  stage.className = 'intro-logo-stage';

  stage.innerHTML = `
    <div class="intro-glow" aria-hidden="true"></div>
    <div class="intro-logo">
      <svg
        class="intro-monogram"
        viewBox="0 0 100 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tt-stroke-gradient" x1="18" y1="12" x2="82" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="55%" stop-color="#e8fff8" />
            <stop offset="100%" stop-color="#c4b5fd" />
          </linearGradient>
          <filter id="tt-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#tt-glow)">
          ${MONOGRAM_STROKES.map(
            ({ d, delay }) =>
              `<path class="intro-monogram-stroke" d="${d}" pathLength="100" style="animation-delay: ${delay}" />`,
          ).join('')}
          <path class="intro-monogram-fill" d="M 18 20 H 82 V 24 H 64 V 56 H 60 V 24 H 40 V 56 H 36 V 24 H 18 Z" />
        </g>
      </svg>
      <p class="intro-wordmark" aria-label="Team Torin">TEAM TORIN</p>
      <div class="intro-shimmer" aria-hidden="true"></div>
    </div>
  `;

  return stage;
}
