import { h } from '../utils/dom';
import type { MatchResult } from '../types/results';
import type { TeamRegistry } from '../types/team';
import { getTeamDisplay } from '../normalize/team-registry';
import { formatMatchStatus, formatScore } from '../services/format';

export function liveMatchCard(
  match: MatchResult,
  registry: TeamRegistry,
  group?: string,
): HTMLElement {
  const isLive = match.status === 'live';
  return h('div', { className: `match-card glass-panel ${isLive ? 'is-live' : ''}` },
    h('div', { className: 'match-meta' },
      group ? h('span', { className: 'match-group' }, `Group ${group}`) : null,
      h('span', { className: `match-status status-${match.status}` }, formatMatchStatus(match.status)),
    ),
    h('div', { className: 'match-teams' },
      h('span', { className: 'team home' }, getTeamDisplay(match.homeTeamId, registry)),
      h('span', { className: 'match-score' }, formatScore(match.homeScore, match.awayScore)),
      h('span', { className: 'team away' }, getTeamDisplay(match.awayTeamId, registry)),
    ),
  );
}
