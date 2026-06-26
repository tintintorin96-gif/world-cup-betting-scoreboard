import { h } from '../utils/dom';
import type { AppData } from '../services/data-loader';
import { loadAllBreakdowns } from '../services/data-loader';
import { buildMatchKickoffMap } from '../components/participant-details';
import { leaderboardTable } from '../components/leaderboard-table';

export async function renderLeaderboardPage(main: HTMLElement, data: AppData) {
  const breakdowns = await loadAllBreakdowns(data.leaderboard.map((e) => e.participantId));
  const matchKickoffs = buildMatchKickoffMap(data.results.matches);
  const leader = data.leaderboard.find((e) => e.rank === 1);

  main.append(
    leader
      ? h('div', { className: 'sheet-hero', 'aria-hidden': 'true' },
          h('p', { className: 'sheet-hero-label' }, 'Leading'),
          h('p', { className: 'sheet-hero-name' }, leader.displayName),
          h('p', { className: 'sheet-hero-points' }, `${leader.totalPoints} points`),
        )
      : null,
    leaderboardTable(data.leaderboard, breakdowns, matchKickoffs),
  );
}
