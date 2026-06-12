import { h } from '../utils/dom';
import type { ScoringBreakdown } from '../types/scoring';
import { formatPct } from '../services/format';

export function participantCard(breakdown: ScoringBreakdown, displayName: string): HTMLElement {
  return h('div', { className: 'participant-card glass-panel' },
    h('h2', { className: 'participant-name' }, displayName),
    h('div', { className: 'participant-stats' },
      h('div', { className: 'stat' },
        h('span', { className: 'stat-value' }, `${breakdown.totalPoints}`),
        h('span', { className: 'stat-label' }, 'Total points'),
      ),
      h('div', { className: 'stat' },
        h('span', { className: 'stat-value' }, `${breakdown.groupStagePoints}`),
        h('span', { className: 'stat-label' }, 'Group stage'),
      ),
      h('div', { className: 'stat' },
        h('span', { className: 'stat-value' }, `${breakdown.knockoutPoints}`),
        h('span', { className: 'stat-label' }, 'Knockout'),
      ),
      h('div', { className: 'stat' },
        h('span', { className: 'stat-value' }, formatPct(breakdown.accuracyPct)),
        h('span', { className: 'stat-label' }, 'Accuracy'),
      ),
    ),
  );
}
