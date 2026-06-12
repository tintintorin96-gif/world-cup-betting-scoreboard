import type { GroupMatchPrediction } from '../types/prediction';
import type { MatchResult } from '../types/results';
import type { ScoringConfig, ScoringEvent } from '../types/scoring';
import { createScoringEvent } from './create-scoring-event';
import { getPoints } from './scoring-config';

function getOutcome(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

function outcomeLabel(outcome: 'home' | 'away' | 'draw', homeName: string, awayName: string): string {
  if (outcome === 'home') return `${homeName} win`;
  if (outcome === 'away') return `${awayName} win`;
  return 'Draw';
}

export function calculateMatchScore(
  participantId: string,
  prediction: GroupMatchPrediction,
  result: MatchResult,
  config: ScoringConfig,
  homeName: string,
  awayName: string,
  timestamp: string,
): ScoringEvent {
  const matchLabel = `${homeName} vs ${awayName}`;
  const predictedScore = `${prediction.homeScore}-${prediction.awayScore}`;

  if (result.status !== 'finished' || result.homeScore === null || result.awayScore === null) {
    return createScoringEvent({
      participantId,
      type: 'pending',
      points: 0,
      label: 'Awaiting result',
      description: matchLabel,
      prediction: predictedScore,
      actualResult: 'Match not finished',
      matchId: prediction.matchId,
      timestamp,
    });
  }

  const actualScore = `${result.homeScore}-${result.awayScore}`;
  const exact =
    prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore;

  if (exact) {
    return createScoringEvent({
      participantId,
      type: 'group_exact_score',
      points: getPoints(config, 'group_exact_score'),
      label: 'Exact score',
      description: matchLabel,
      prediction: predictedScore,
      actualResult: actualScore,
      matchId: prediction.matchId,
      timestamp,
    });
  }

  const predOutcome = getOutcome(prediction.homeScore, prediction.awayScore);
  const actualOutcome = getOutcome(result.homeScore, result.awayScore);

  if (predOutcome === actualOutcome) {
    return createScoringEvent({
      participantId,
      type: 'group_correct_outcome',
      points: getPoints(config, 'group_correct_outcome'),
      label: 'Correct outcome',
      description: matchLabel,
      prediction: outcomeLabel(predOutcome, homeName, awayName),
      actualResult: actualScore,
      matchId: prediction.matchId,
      timestamp,
    });
  }

  return createScoringEvent({
    participantId,
    type: 'group_wrong_outcome',
    points: getPoints(config, 'group_wrong_outcome'),
    label: 'Wrong outcome',
    description: matchLabel,
    prediction: `${predictedScore} (${outcomeLabel(predOutcome, homeName, awayName)})`,
    actualResult: actualScore,
    matchId: prediction.matchId,
    timestamp,
  });
}
