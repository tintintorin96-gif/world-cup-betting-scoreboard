import type { ScoringCategory, ScoringEvent, ScoringEventType } from '../types/scoring';
import type { KnockoutRound } from '../types/tournament';
import { TYPE_TO_CATEGORY } from './scoring-categories';

let eventCounter = 0;

export function resetEventCounter(): void {
  eventCounter = 0;
}

export function createScoringEvent(params: {
  participantId: string;
  type: ScoringEventType;
  points: number;
  label: string;
  description: string;
  prediction: string;
  actualResult: string;
  matchId?: string;
  teamId?: string;
  round?: KnockoutRound;
  timestamp: string;
  category?: ScoringCategory;
}): ScoringEvent {
  eventCounter += 1;
  const category = params.category ?? TYPE_TO_CATEGORY[params.type];
  const suffix = params.matchId ?? params.teamId ?? params.round ?? String(eventCounter);

  return {
    id: `${params.participantId}:${category}:${suffix}:${eventCounter}`,
    participantId: params.participantId,
    type: params.type,
    category,
    points: params.points,
    label: params.label,
    description: params.description,
    prediction: params.prediction,
    actualResult: params.actualResult,
    matchId: params.matchId,
    teamId: params.teamId,
    round: params.round,
    timestamp: params.timestamp,
  };
}
