import { h } from '../utils/dom';
import type { ScoringBreakdown, ScoringEvent } from '../types/scoring';
import { SCORING_SECTIONS } from '../engine/scoring-categories';
import { deriveBreakdownFromEvents } from '../engine/derive-breakdown';

function eventRow(event: ScoringEvent): HTMLElement {
  const awarded = event.points > 0;
  return h('div', { className: `inspector-event ${awarded ? 'awarded' : 'missed'}` },
    h('div', { className: 'inspector-event-head' },
      h('span', { className: 'inspector-check' }, awarded ? '✓' : '✗'),
      h('strong', { className: 'inspector-event-title' }, event.description),
      h('span', { className: `inspector-event-points ${awarded ? 'positive' : 'zero'}` },
        awarded ? `+${event.points} pts` : '0 pts',
      ),
    ),
    h('dl', { className: 'inspector-event-details' },
      h('div', { className: 'detail-row' },
        h('dt', {}, 'Predicted'),
        h('dd', {}, event.prediction),
      ),
      h('div', { className: 'detail-row' },
        h('dt', {}, 'Actual'),
        h('dd', {}, event.actualResult),
      ),
      h('div', { className: 'detail-row' },
        h('dt', {}, 'Reason'),
        h('dd', {}, event.label),
      ),
      event.matchId
        ? h('div', { className: 'detail-row' },
            h('dt', {}, 'Match'),
            h('dd', {}, event.matchId),
          )
        : null,
    ),
  );
}

function sectionBlock(title: string, sectionPoints: number, events: ScoringEvent[]): HTMLElement | null {
  if (!events.length) return null;

  return h('div', { className: 'inspector-section' },
    h('h4', { className: 'inspector-section-title' },
      `${title} `,
      h('span', { className: 'section-points' }, `(+${sectionPoints})`),
    ),
    h('div', { className: 'inspector-events' }, ...events.map(eventRow)),
  );
}

export function scoringInspector(
  breakdown: ScoringBreakdown,
  options: { showTotal?: boolean; showPending?: boolean; compact?: boolean } = {},
): HTMLElement {
  const { showTotal = true, showPending = false, compact = false } = options;
  const derived = deriveBreakdownFromEvents(breakdown.participantId, breakdown.events);
  const scored = breakdown.events.filter((e) => e.category !== 'pending');
  const pending = breakdown.events.filter((e) => e.category === 'pending');

  const container = h('div', { className: `scoring-inspector ${compact ? 'compact' : ''}` });

  for (const section of SCORING_SECTIONS) {
    const sectionEvents = scored.filter((e) => section.categories.includes(e.category));
    const sectionPoints = sectionEvents.reduce((sum, e) => sum + e.points, 0);
    const block = sectionBlock(section.title.toUpperCase(), sectionPoints, sectionEvents);
    if (block) container.append(block);
  }

  if (showPending && pending.length) {
    container.append(
      sectionBlock('AWAITING RESULTS', 0, pending),
    );
  }

  if (showTotal) {
    container.append(
      h('div', { className: 'inspector-total glass-panel' },
        h('span', {}, 'TOTAL SCORE'),
        h('strong', {}, `= ${derived.totalPoints}`),
      ),
    );
  }

  if (!scored.length && !pending.length) {
    container.append(h('p', { className: 'empty-state' }, 'No scoring events yet.'));
  }

  return container;
}

export function scoringInspectorSummary(breakdown: ScoringBreakdown): HTMLElement {
  const derived = deriveBreakdownFromEvents(breakdown.participantId, breakdown.events);

  return h('div', { className: 'inspector-summary' },
    h('div', { className: 'summary-stat' },
      h('span', { className: 'summary-value' }, `${derived.exactScoreHits}`),
      h('span', { className: 'summary-label' }, 'Exact scores'),
    ),
    h('div', { className: 'summary-stat' },
      h('span', { className: 'summary-value' }, `${derived.correctOutcomeHits}`),
      h('span', { className: 'summary-label' }, 'Correct outcomes'),
    ),
    h('div', { className: 'summary-stat' },
      h('span', { className: 'summary-value' }, `${derived.groupWinnerHits}`),
      h('span', { className: 'summary-label' }, 'Group winners'),
    ),
    h('div', { className: 'summary-stat' },
      h('span', { className: 'summary-value' }, `${derived.knockoutHits}`),
      h('span', { className: 'summary-label' }, 'Knockout hits'),
    ),
  );
}

export function chronologicalEventList(events: ScoringEvent[]): HTMLElement {
  const list = h('div', { className: 'chronological-events' });
  const ordered = [...events]
    .filter((e) => e.category !== 'pending')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (!ordered.length) {
    list.append(h('p', { className: 'empty-state' }, 'No scored events yet.'));
    return list;
  }

  let running = 0;
  for (const event of ordered) {
    running += event.points;
    list.append(
      h('div', { className: 'chrono-item glass-panel' },
        h('div', { className: 'chrono-head' },
          h('time', {}, new Date(event.timestamp).toLocaleString()),
          h('span', { className: event.points > 0 ? 'positive' : 'zero' },
            event.points > 0 ? `+${event.points}` : '0',
          ),
        ),
        h('p', { className: 'chrono-desc' }, `${event.label}: ${event.description}`),
        h('p', { className: 'chrono-meta' }, `Predicted: ${event.prediction} · Actual: ${event.actualResult}`),
        h('p', { className: 'chrono-running' }, `Running total: ${running}`),
      ),
    );
  }

  return list;
}
