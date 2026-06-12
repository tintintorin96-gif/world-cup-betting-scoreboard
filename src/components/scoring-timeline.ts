import { h } from '../utils/dom';
import type { ScoringEvent } from '../types/scoring';

export function scoringTimeline(events: ScoringEvent[]): HTMLElement {
  const timeline = h('div', { className: 'scoring-timeline' });

  const awarded = events.filter((e) => e.points > 0);
  if (!awarded.length) {
    timeline.append(h('p', { className: 'empty-state' }, 'No points awarded yet.'));
    return timeline;
  }

  for (const event of awarded) {
    timeline.append(
      h('div', { className: 'timeline-item glass-panel' },
        h('span', { className: 'timeline-points' }, `+${event.points}`),
        h('div', { className: 'timeline-body' },
          h('strong', {}, event.label),
          h('span', {}, event.description),
        ),
      ),
    );
  }

  return timeline;
}
