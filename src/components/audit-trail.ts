import { h } from '../utils/dom';
import type { ScoringEvent } from '../types/scoring';

export function auditTrail(events: ScoringEvent[]): HTMLElement {
  const list = h('div', { className: 'audit-trail' });
  const ordered = [...events]
    .filter((e) => e.category !== 'pending')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (!ordered.length) {
    list.append(h('p', { className: 'audit-empty' }, 'No points scored yet.'));
    return list;
  }

  for (const event of ordered) {
    const awarded = event.points > 0;
    list.append(
      h('div', { className: `audit-item ${awarded ? 'is-awarded' : 'is-missed'}` },
        h('span', { className: 'audit-check', 'aria-hidden': 'true' }, awarded ? '✓' : '·'),
        h('div', { className: 'audit-body' },
          h('p', { className: 'audit-match' }, event.description),
          h('p', { className: 'audit-reason' }, event.label),
        ),
        h('span', { className: 'audit-points' },
          awarded ? `+${event.points} pts` : '0 pts',
        ),
      ),
    );
  }

  return list;
}
