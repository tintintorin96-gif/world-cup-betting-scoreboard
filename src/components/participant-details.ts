import { h } from '../utils/dom';
import type { ScoringBreakdown, ScoringEvent } from '../types/scoring';

interface DetailSection {
  title: string;
  filter: (e: ScoringEvent) => boolean;
  sort?: (events: ScoringEvent[]) => ScoringEvent[];
}

const DETAIL_SECTIONS: DetailSection[] = [
  {
    title: 'Group Matches',
    filter: (e) =>
      Boolean(e.matchId) &&
      ['exact_score', 'correct_outcome', 'wrong_outcome'].includes(e.category),
    sort: (events) => [...events].reverse(),
  },
  {
    title: 'Group Winners',
    filter: (e) =>
      e.category === 'group_winner' ||
      (e.category === 'pending' && e.description.endsWith(' winner')),
  },
  {
    title: 'Knockout',
    filter: (e) =>
      ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place_reach', 'third_place_winner'].includes(
        e.category,
      ) ||
      (e.category === 'pending' && Boolean(e.round) && e.round !== 'final'),
  },
  {
    title: 'Finalists & Champion',
    filter: (e) =>
      e.category === 'finalist' ||
      e.category === 'champion' ||
      (e.category === 'pending' && e.round === 'final'),
  },
];

function formatPoints(event: ScoringEvent): string {
  if (event.category === 'pending') return 'Pending';
  if (event.points > 0) return `+${event.points}`;
  return '0';
}

function detailEventRow(event: ScoringEvent): HTMLElement {
  const pointsClass =
    event.category === 'pending'
      ? 'detail-event-points is-pending'
      : event.points > 0
        ? 'detail-event-points is-positive'
        : 'detail-event-points';

  return h('div', { className: `detail-event detail-event--${event.category}` },
    h('p', { className: 'detail-event-match' }, event.description),
    h('p', { className: 'detail-event-picks' },
      h('span', {}, `Pick: ${event.prediction}`),
      h('span', {}, `Result: ${event.actualResult}`),
    ),
    h('p', { className: 'detail-event-meta' },
      event.label,
      h('span', { className: pointsClass }, formatPoints(event)),
    ),
  );
}

function detailSection(title: string, events: ScoringEvent[]): HTMLElement | null {
  if (!events.length) return null;

  return h('section', { className: 'detail-section' },
    h('h4', { className: 'detail-section-title' }, title),
    h('div', { className: 'detail-events' },
      ...events.map((event) => detailEventRow(event)),
    ),
  );
}

export function participantDetails(breakdown: ScoringBreakdown | undefined): HTMLElement {
  const panel = h('div', { className: 'participant-details' });

  if (!breakdown) {
    panel.append(h('p', { className: 'details-empty' }, 'Loading…'));
    return panel;
  }

  let hasContent = false;
  for (const section of DETAIL_SECTIONS) {
    const filtered = breakdown.events.filter(section.filter);
    const events = section.sort ? section.sort(filtered) : filtered;
    const block = detailSection(section.title, events);
    if (block) {
      panel.append(block);
      hasContent = true;
    }
  }

  if (!hasContent) {
    panel.append(h('p', { className: 'details-empty' }, 'No picks recorded yet.'));
  }

  return panel;
}
