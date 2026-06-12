import { h } from '../utils/dom';
import type { MetaInfo } from '../types/scoring';

export function competitionHeader(meta: MetaInfo): HTMLElement {
  const updated = new Date(meta.lastUpdated).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return h('header', { className: 'competition-header' },
    h('div', { className: 'competition-header-inner' },
      h('p', { className: 'competition-eyebrow' }, 'Private Competition'),
      h('h1', { className: 'competition-title' }, 'World Cup 2026'),
      h('p', { className: 'competition-meta' },
        `${meta.participantCount} participants`,
        h('span', { className: 'competition-meta-sep', 'aria-hidden': 'true' }, '·'),
        `Updated ${updated}`,
      ),
    ),
  );
}
