import { h } from '../utils/dom';
import type { ScoringBreakdown, ScoringEvent } from '../types/scoring';

interface DetailSection {
  title: string;
  filter: (e: ScoringEvent) => boolean;
}

const DETAIL_SECTIONS: DetailSection[] = [
  {
    title: 'Group Stage',
    filter: (e) => ['exact_score', 'correct_outcome', 'wrong_outcome'].includes(e.category),
  },
  {
    title: 'Group Winners',
    filter: (e) => e.category === 'group_winner',
  },
  {
    title: 'Knockout',
    filter: (e) =>
      ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place_reach', 'third_place_winner'].includes(
        e.category,
      ),
  },
  {
    title: 'Finalists',
    filter: (e) => e.category === 'finalist',
  },
  {
    title: 'Champion',
    filter: (e) => e.category === 'champion',
  },
];

function awardedEvents(events: ScoringEvent[], filter: (e: ScoringEvent) => boolean): ScoringEvent[] {
  return events.filter((e) => e.category !== 'pending' && e.points > 0 && filter(e));
}

function detailSection(title: string, events: ScoringEvent[]): HTMLElement | null {
  if (!events.length) return null;

  return h('section', { className: 'detail-section' },
    h('h4', { className: 'detail-section-title' }, title),
    h('div', { className: 'detail-events' },
      ...events.map((event) =>
        h('div', { className: 'detail-event' },
          h('p', { className: 'detail-event-match' }, event.description),
          h('p', { className: 'detail-event-meta' },
            event.label,
            h('span', { className: 'detail-event-points' }, `+${event.points}`),
          ),
        ),
      ),
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
    const block = detailSection(section.title, awardedEvents(breakdown.events, section.filter));
    if (block) {
      panel.append(block);
      hasContent = true;
    }
  }

  if (!hasContent) {
    panel.append(h('p', { className: 'details-empty' }, 'No points scored yet.'));
  }

  return panel;
}
