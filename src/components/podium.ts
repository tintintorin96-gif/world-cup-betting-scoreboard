import { h } from '../utils/dom';
import type { LeaderboardEntry } from '../types/scoring';
import { formatDelta } from '../services/format';

const PODIUM_ORDER = [1, 0, 2];

export function podium(entries: LeaderboardEntry[]): HTMLElement {
  const top3 = entries.slice(0, 3);
  const ordered = PODIUM_ORDER.map((i) => top3[i]).filter(Boolean);

  return h('div', { className: 'podium' },
    ...ordered.map((entry, visualIndex) => {
      const place = visualIndex === 0 ? 2 : visualIndex === 1 ? 1 : 3;
      return h('a', {
        className: `podium-slot place-${place}`,
        href: `#/participant/${entry.participantId}`,
      },
        h('span', { className: 'podium-rank' }, `#${entry.rank}`),
        h('span', { className: 'podium-name' }, entry.displayName),
        h('span', { className: 'podium-points' }, `${entry.totalPoints} pts`),
        entry.delta !== 0
          ? h('span', { className: `podium-delta ${entry.delta > 0 ? 'up' : 'down'}` }, formatDelta(entry.delta))
          : null,
      );
    }),
  );
}
