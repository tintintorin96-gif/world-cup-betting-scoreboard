import type { KnockoutRound } from './tournament';

export type ScoringEventType =
  | 'group_exact_score'
  | 'group_correct_outcome'
  | 'group_wrong_outcome'
  | 'group_winner'
  | 'knockout_r32'
  | 'knockout_r16'
  | 'knockout_qf'
  | 'knockout_sf'
  | 'knockout_third_reach'
  | 'knockout_third_winner'
  | 'finalist'
  | 'champion'
  | 'pending';

export type ScoringCategory =
  | 'exact_score'
  | 'correct_outcome'
  | 'wrong_outcome'
  | 'group_winner'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place_reach'
  | 'third_place_winner'
  | 'finalist'
  | 'champion'
  | 'pending';

export interface ScoringConfig {
  maxPoints: number;
  rules: Record<Exclude<ScoringEventType, 'pending'>, number>;
}

export interface ScoringEvent {
  id: string;
  participantId: string;
  type: ScoringEventType;
  category: ScoringCategory;
  points: number;
  label: string;
  description: string;
  prediction: string;
  actualResult: string;
  matchId?: string;
  teamId?: string;
  round?: KnockoutRound;
  timestamp: string;
}

export interface ScoringBreakdown {
  participantId: string;
  events: ScoringEvent[];
  totalPoints: number;
  groupStagePoints: number;
  knockoutPoints: number;
  pointsByCategory: Record<ScoringCategory, number>;
  correctPicks: number;
  missedPicks: number;
  exactScoreHits: number;
  correctOutcomeHits: number;
  groupWinnerHits: number;
  knockoutHits: number;
  accuracyPct: number;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  displayName: string;
  totalPoints: number;
  delta: number;
  progressPct: number;
  groupStagePoints: number;
  knockoutPoints: number;
}

export interface AuditTrailEntry {
  timestamp: string;
  resultsVersion: number;
  participantId: string;
  event: ScoringEvent;
  pointsDelta: number;
  reason: 'new_match' | 'result_correction' | 'initial';
}

export interface Snapshot {
  timestamp: string;
  resultsVersion: number;
  leaderboard: LeaderboardEntry[];
}

export interface MetaInfo {
  appName: string;
  version: number;
  resultsVersion: number;
  lastUpdated: string;
  participantCount: number;
  maxPoints: number;
  degraded?: boolean;
}
