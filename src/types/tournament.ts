import type { TeamId } from './team';

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
export type KnockoutRound = 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';
export type TeamSlot = TeamId | string;

export interface KnockoutRoundConfig {
  round: KnockoutRound;
  label: string;
  slots: number;
}

export interface MatchRef {
  matchId: string;
  group?: string;
  homeSlot: TeamSlot;
  awaySlot: TeamSlot;
  homeTeamId?: TeamId;
  awayTeamId?: TeamId;
  kickoff?: string;
  round?: KnockoutRound;
}

export interface TournamentConfig {
  id: string;
  name: string;
  maxPoints: number;
  groups: string[];
  groupMatches: MatchRef[];
  knockoutRounds: KnockoutRoundConfig[];
}
