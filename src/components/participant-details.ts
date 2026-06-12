import { h } from '../utils/dom';
import type { ScoringBreakdown, ScoringEvent } from '../types/scoring';
import { auditTrail } from './audit-trail';

interface DetailSection {
  id: string;
  title: string;
  filter: (e: ScoringEvent) => boolean;
}

const DETAIL_SECTIONS: DetailSection[] = [
  {
    id: 'group_stage',
    title: 'Group Stage',
    filter: (e) => ['exact_score', 'correct_outcome', 'wrong_outcome'].includes(e.category),
  },
  {
    id: 'group_winners',
    title: 'Group Winners',
    filter: (e) => e.category === 'group_winner',
  },
  {
    id: 'knockout',
    title: 'Knockout',
    filter: (e) =>
      ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place_reach', 'third_place_winner'].includes(
        e.category,
      ),
  },
  {
    id: 'finalists',
    title: 'Finalists',
    filter: (e) => e.category === 'finalist',
  },
  {
    id: 'champion',
    title: 'Champion',
    filter: (e) => e.category === 'champion',
  },
];

function sectionEvents(events: ScoringEvent[], filter: (e: ScoringEvent) => boolean): ScoringEvent[] {
  return events.filter((e) => e.category !== 'pending' && filter(e));
}

function detailSection(title: string, events: ScoringEvent[]): HTMLElement | null {
  if (!events.length) return null;

  const points = events.reduce((sum, e) => sum + e.points, 0);

  return h('section', { className: 'detail-section' },
    h('div', { className: 'detail-section-head' },
      h('h4', { className: 'detail-section-title' }, title),
      h('span', { className: 'detail-section-points' }, `${points} pts`),
    ),
    h('div', { className: 'detail-section-events' },
      ...events.map((event) => {
        const awarded = event.points > 0;
        return h('div', { className: `detail-event ${awarded ? 'is-awarded' : ''}` },
          h('span', { className: 'detail-event-check', 'aria-hidden': 'true' }, awarded ? '✓' : '·'),
          h('span', { className: 'detail-event-desc' }, event.description),
          h('span', { className: 'detail-event-label' }, event.label),
          h('span', { className: 'detail-event-points' },
            awarded ? `+${event.points}` : '0',
          ),
        );
      }),
    ),
  );
}

export function participantDetails(breakdown: ScoringBreakdown | undefined): HTMLElement {
  const panel = h('div', { className: 'participant-details' });

  if (!breakdown) {
    panel.append(h('p', { className: 'audit-empty' }, 'Loading details…'));
    return panel;
  }

  const sections = h('div', { className: 'detail-sections' });
  for (const section of DETAIL_SECTIONS) {
    const block = detailSection(section.title, sectionEvents(breakdown.events, section.filter));
    if (block) sections.append(block);
  }

  if (sections.childElementCount) panel.append(sections);

  panel.append(
    h('section', { className: 'detail-audit' },
      h('h4', { className: 'detail-section-title' }, 'Scoring Events'),
      auditTrail(breakdown.events),
    ),
  );

  return panel;
}
