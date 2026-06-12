import type { GroupWinnerPrediction } from '../types/prediction';
import type { GroupStanding } from '../types/results';
import type { ScoringConfig, ScoringEvent } from '../types/scoring';
import { createScoringEvent } from './create-scoring-event';
import { getPoints } from './scoring-config';

export function calculateGroupWinnerScore(
  participantId: string,
  prediction: GroupWinnerPrediction,
  standing: GroupStanding | undefined,
  config: ScoringConfig,
  predictedTeamName: string,
  actualTeamName: (id: string) => string,
  timestamp: string,
): ScoringEvent | null {
  if (!standing || standing.positions.length === 0) return null;

  const actualWinnerId = standing.positions[0];
  const actualWinnerName = actualTeamName(actualWinnerId);
  const correct = prediction.winnerId === actualWinnerId;

  return createScoringEvent({
    participantId,
    type: 'group_winner',
    points: correct ? getPoints(config, 'group_winner') : 0,
    label: correct ? 'Correct group winner' : 'Wrong group winner',
    description: `Group ${prediction.group} winner`,
    prediction: predictedTeamName,
    actualResult: actualWinnerName,
    teamId: prediction.winnerId,
    timestamp,
  });
}
