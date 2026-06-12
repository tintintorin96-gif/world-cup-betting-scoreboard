import type { TeamId } from './team';
import type { KnockoutRound } from './tournament';

export interface Participant {
  id: string;
  displayName: string;
  filePath: string;
}

export interface GroupMatchPrediction {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export interface GroupStandingPrediction {
  group: string;
  positions: TeamId[];
}

export interface GroupWinnerPrediction {
  group: string;
  winnerId: TeamId;
}

export interface KnockoutPrediction {
  round: KnockoutRound;
  advancingTeamIds: TeamId[];
}

export interface Prediction {
  participantId: string;
  groupMatches: GroupMatchPrediction[];
  groupStandings: GroupStandingPrediction[];
  groupWinners: GroupWinnerPrediction[];
  knockout: KnockoutPrediction[];
  championId?: TeamId;
  finalists?: TeamId[];
}

export interface PredictionBundle {
  participant: Participant;
  prediction: Prediction;
}
