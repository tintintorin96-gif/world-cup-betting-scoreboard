import { h } from '../utils/dom';
import type { LeaderboardEntry, ScoringBreakdown } from '../types/scoring';
import { formatDelta } from '../services/format';
import { participantDetails } from './participant-details';

export function leaderboardTable(
  entries: LeaderboardEntry[],
  breakdowns: Map<string, ScoringBreakdown>,
): HTMLElement {
  const table = h('div', { className: 'leaderboard' },
    h('div', { className: 'leaderboard-head', 'aria-hidden': 'true' },
      h('span', { className: 'lb-col-rank' }, 'Rank'),
      h('span', { className: 'lb-col-name' }, 'Participant'),
      h('span', { className: 'lb-col-points' }, 'Points'),
      h('span', { className: 'lb-col-trend' }, 'Trend'),
      h('span', { className: 'lb-col-chevron' }),
    ),
    h('div', { className: 'leaderboard-body', role: 'list' }),
  );

  const body = table.querySelector('.leaderboard-body')!;

  for (const entry of entries) {
    const breakdown = breakdowns.get(entry.participantId);
    const detailsId = `lb-details-${entry.participantId}`;
    let expanded = false;

    const chevron = chevronIcon();

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
      h('span', { className: 'lb-col-rank lb-rank' }, String(entry.rank)),
      h('span', { className: 'lb-col-name lb-name' }, entry.displayName),
      h('span', { className: 'lb-col-points lb-points' }, String(entry.totalPoints)),
      h('span', {
        className: `lb-col-trend lb-trend ${entry.delta > 0 ? 'is-up' : entry.delta < 0 ? 'is-down' : ''}`,
      }, entry.delta !== 0 ? formatDelta(entry.delta) : '—'),
      h('span', { className: 'lb-col-chevron lb-chevron-wrap' }, chevron),
    );

    const detailsPanel = h('div', {
      className: 'lb-details-panel',
      id: detailsId,
      'aria-hidden': 'true',
    },
      h('div', { className: 'lb-details-inner glass-panel' },
        participantDetails(breakdown),
      ),
    );

    function setExpanded(open: boolean) {
      expanded = open;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      detailsPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
      row.classList.toggle('is-expanded', open);
      chevron.classList.toggle('is-up', open);
    }

    trigger.addEventListener('click', () => setExpanded(!expanded));

    row.append(trigger, detailsPanel);
    body.append(row);
  }

  return table;
}

function chevronIcon(): HTMLElement {
  const el = h('span', { className: 'lb-chevron', 'aria-hidden': 'true' });
  el.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return el;
}
