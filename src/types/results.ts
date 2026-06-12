import type { TeamId } from './team';
import type { KnockoutRound, MatchStatus } from './tournament';

export interface MatchResult {
  matchId: string;
  status: MatchStatus;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  homeScore: number | null;
  awayScore: number | null;
  winnerId?: TeamId;
  updatedAt: string;
  source: 'api' | 'manual';
}

export interface GroupStanding {
  group: string;
  positions: TeamId[];
  updatedAt: string;
}

export interface KnockoutState {
  round: KnockoutRound;
  matchId: string;
  homeTeamId: TeamId;
  awayTeamId: TeamId;
  winnerId?: TeamId;
}

export interface ResultsBundle {
  version: number;
  fetchedAt: string;
  matches: MatchResult[];
  groupStandings: GroupStanding[];
  knockout: KnockoutState[];
  championId?: TeamId;
  finalists?: TeamId[];
}
