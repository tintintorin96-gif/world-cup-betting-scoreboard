import { h } from '../utils/dom';
import type { AppData } from '../services/data-loader';
import { loadAllBreakdowns } from '../services/data-loader';
import { competitionHeader } from '../components/competition-header';
import { leaderboardTable } from '../components/leaderboard-table';

export async function renderLeaderboardPage(main: HTMLElement, data: AppData) {
  const breakdowns = await loadAllBreakdowns(data.leaderboard.map((e) => e.participantId));

  main.append(
    h('div', { className: 'page competition-page' },
      competitionHeader(data.meta),
      leaderboardTable(data.leaderboard, breakdowns),
    ),
  );
}
