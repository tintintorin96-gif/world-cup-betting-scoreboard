import { h } from '../utils/dom';
import { parseMatchKickoff } from '../services/format';
import type { ScoringBreakdown, ScoringEvent } from '../types/scoring';

interface DetailSection {
  title: string;
  filter: (e: ScoringEvent) => boolean;
  sort?: (events: ScoringEvent[]) => ScoringEvent[];
}

export function sortGroupMatchEventsByKickoff(
  events: ScoringEvent[],
  matchKickoffs: Map<string, number>,
): ScoringEvent[] {
  return [...events].sort((a, b) => {
    const aTime = a.matchId ? (matchKickoffs.get(a.matchId) ?? 0) : 0;
    const bTime = b.matchId ? (matchKickoffs.get(b.matchId) ?? 0) : 0;
    return aTime - bTime;
  });
}

function groupLetterFromEvent(event: ScoringEvent): string | null {
  if (event.matchId) return event.matchId.split('-')[0] ?? null;
  const match = event.description.match(/^Group ([A-Z]) winner$/);
  return match?.[1] ?? null;
}

function isGroupMatchEvent(event: ScoringEvent): boolean {
  return (
    Boolean(event.matchId) &&
    ['exact_score', 'correct_outcome', 'wrong_outcome'].includes(event.category)
  );
}

function isGroupWinnerEvent(event: ScoringEvent): boolean {
  return event.category === 'group_winner';
}

function isDecidedEvent(event: ScoringEvent): boolean {
  return event.category !== 'pending';
}

function sumEventPoints(events: ScoringEvent[]): number {
  return events.reduce((sum, e) => sum + (e.category === 'pending' ? 0 : e.points), 0);
}

function buildGroupStageBuckets(
  events: ScoringEvent[],
  matchKickoffs: Map<string, number>,
): Map<string, ScoringEvent[]> {
  const buckets = new Map<string, { matches: ScoringEvent[]; winner: ScoringEvent | null }>();

  for (const event of events) {
    if (!isDecidedEvent(event)) continue;

    const group = groupLetterFromEvent(event);
    if (!group) continue;

    const bucket = buckets.get(group) ?? { matches: [], winner: null };
    if (isGroupMatchEvent(event)) {
      bucket.matches.push(event);
    } else if (isGroupWinnerEvent(event)) {
      bucket.winner = event;
    }
    buckets.set(group, bucket);
  }

  const ordered = new Map<string, ScoringEvent[]>();
  for (const group of [...buckets.keys()].sort()) {
    const bucket = buckets.get(group)!;
    const matches = sortGroupMatchEventsByKickoff(bucket.matches, matchKickoffs);
    ordered.set(group, bucket.winner ? [...matches, bucket.winner] : matches);
  }
  return ordered;
}

function buildDetailSections(): DetailSection[] {
  return [
    {
      title: 'Knockout',
      filter: (e) =>
        isDecidedEvent(e) &&
        ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place_reach', 'third_place_winner'].includes(
          e.category,
        ),
    },
    {
      title: 'Finalists & Champion',
      filter: (e) => isDecidedEvent(e) && (e.category === 'finalist' || e.category === 'champion'),
    },
  ];
}

export function buildMatchKickoffMap(
  matches: { matchId: string; updatedAt: string }[],
): Map<string, number> {
  return new Map(matches.map((m) => [m.matchId, parseMatchKickoff(m.updatedAt)]));
}

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

function detailSection(title: string, events: ScoringEvent[], points?: number): HTMLElement | null {
  if (!events.length) return null;

  const titleRow = points !== undefined
    ? h('div', { className: 'detail-section-heading' },
        h('h4', { className: 'detail-section-title' }, title),
        h('span', { className: 'detail-section-points' }, `${points} pts`),
      )
    : h('h4', { className: 'detail-section-title' }, title);

  return h('section', { className: 'detail-section' },
    titleRow,
    h('div', { className: 'detail-events' },
      ...events.map((event) => detailEventRow(event)),
    ),
  );
}

function collapsibleSection(
  title: string,
  points: number,
  content: HTMLElement,
  collapsed = true,
): HTMLElement {
  let expanded = !collapsed;
  const panelId = `detail-panel-${title.toLowerCase().replace(/\s+/g, '-')}`;
  const expandMark = h('span', { className: 'detail-section-expand', 'aria-hidden': 'true' }, expanded ? '−' : '+');

  const trigger = h('button', {
    type: 'button',
    className: 'detail-section-trigger',
    'aria-expanded': expanded ? 'true' : 'false',
    'aria-controls': panelId,
  },
    h('h4', { className: 'detail-section-title' }, title),
    h('span', { className: 'detail-section-points' }, `${points} pts`),
    expandMark,
  );

  const panel = h('div', {
    className: 'detail-section-panel',
    id: panelId,
    'aria-hidden': expanded ? 'false' : 'true',
  },
    h('div', { className: 'detail-section-panel-inner' }, content),
  );

  const section = h('section', { className: 'detail-section detail-section--collapsible' }, trigger, panel);

  function setExpanded(open: boolean) {
    expanded = open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    section.classList.toggle('is-expanded', open);
    expandMark.textContent = open ? '−' : '+';
  }

  trigger.addEventListener('click', () => setExpanded(!expanded));
  if (expanded) section.classList.add('is-expanded');

  return section;
}

function groupStageSection(
  events: ScoringEvent[],
  matchKickoffs: Map<string, number>,
  totalPoints: number,
): HTMLElement | null {
  const buckets = buildGroupStageBuckets(events, matchKickoffs);
  if (!buckets.size) return null;

  const groupsContainer = h('div', { className: 'detail-groups' });

  for (const [group, groupEvents] of buckets) {
    const groupPoints = sumEventPoints(groupEvents);
    groupsContainer.append(
      h('div', { className: 'detail-group' },
        h('div', { className: 'detail-group-heading' },
          h('h5', { className: 'detail-group-title' }, `Group ${group}`),
          h('span', { className: 'detail-group-points' }, `${groupPoints} pts`),
        ),
        h('div', { className: 'detail-events detail-events--nested' },
          ...groupEvents.map((event) => detailEventRow(event)),
        ),
      ),
    );
  }

  return collapsibleSection('Group Stage', totalPoints, groupsContainer, true);
}

export function participantDetails(
  breakdown: ScoringBreakdown | undefined,
  matchKickoffs: Map<string, number> = new Map(),
): HTMLElement {
  const panel = h('div', { className: 'participant-details' });

  if (!breakdown) {
    panel.append(h('p', { className: 'details-empty' }, 'Loading…'));
    return panel;
  }

  const detailSections = buildDetailSections();
  let hasContent = false;

  for (const section of detailSections) {
    const filtered = breakdown.events.filter(section.filter);
    const events = section.sort ? section.sort(filtered) : filtered;
    const block = detailSection(section.title, events, sumEventPoints(events));
    if (block) {
      panel.append(block);
      hasContent = true;
    }
  }

  const groupStage = groupStageSection(breakdown.events, matchKickoffs, breakdown.groupStagePoints);
  if (groupStage) {
    panel.append(groupStage);
    hasContent = true;
  }

  if (!hasContent) {
    panel.append(h('p', { className: 'details-empty' }, 'No picks recorded yet.'));
  }

  return panel;
}
