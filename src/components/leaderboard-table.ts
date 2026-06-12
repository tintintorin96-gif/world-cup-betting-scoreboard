import { h } from '../utils/dom';
import type { LeaderboardEntry, ScoringBreakdown } from '../types/scoring';
import { participantDetails } from './participant-details';

export function leaderboardTable(
  entries: LeaderboardEntry[],
  breakdowns: Map<string, ScoringBreakdown>,
): HTMLElement {
  const table = h('div', { className: 'leaderboard' },
    h('div', { className: 'leaderboard-body', role: 'list' }),
  );

  const body = table.querySelector('.leaderboard-body')!;

  for (const entry of entries) {
    const breakdown = breakdowns.get(entry.participantId);
    const detailsId = `lb-details-${entry.participantId}`;
    let expanded = false;

    const expandMark = h('span', { className: 'lb-expand', 'aria-hidden': 'true' }, '+');

    const row = h('div', {
      className: 'leaderboard-row',
      role: 'listitem',
    });

    const trigger = h('button', {
      type: 'button',
      className: 'lb-row-trigger',
      'aria-expanded': 'false',
      'aria-controls': detailsId,
    },
      h('span', { className: 'lb-rank' }, String(entry.rank)),
      h('span', { className: 'lb-name' }, entry.displayName),
      h('span', { className: 'lb-points' }, String(entry.totalPoints)),
      expandMark,
    );

    const detailsPanel = h('div', {
      className: 'lb-details-panel',
      id: detailsId,
      'aria-hidden': 'true',
    },
      h('div', { className: 'lb-details-inner' },
        participantDetails(breakdown),
      ),
    );

    function setExpanded(open: boolean) {
      expanded = open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      detailsPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
      row.classList.toggle('is-expanded', open);
      expandMark.textContent = open ? '−' : '+';
    }

    trigger.addEventListener('click', () => setExpanded(!expanded));

    row.append(trigger, detailsPanel);
    body.append(row);
  }

  return table;
}
