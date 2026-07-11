import type { Prediction } from '../types/prediction';
import type { ResultsBundle } from '../types/results';
import type { ScoringBreakdown, ScoringConfig, ScoringEvent } from '../types/scoring';
import type { TournamentConfig } from '../types/tournament';
import type { TeamRegistry } from '../types/team';
import { getTeamDisplay } from '../normalize/team-registry';
import { calculateGroupWinnerScore } from './calculate-group-winner-score';
import { calculateKnockoutScore } from './calculate-knockout-score';
import { calculateMatchScore } from './calculate-match-score';
import { computeGroupStanding, isGroupStageComplete } from './compute-group-standings';
import { resetEventCounter } from './create-scoring-event';
import { deriveBreakdownFromEvents } from './derive-breakdown';
import { isDecidedScoringEvent } from './scoring-categories';

function keepDecidedEvent(event: ScoringEvent): boolean {
  return isDecidedScoringEvent(event);
}

export function calculateFinalScore(
  prediction: Prediction,
  results: ResultsBundle,
  config: ScoringConfig,
  tournament: TournamentConfig,
  registry: TeamRegistry,
): ScoringBreakdown {
  resetEventCounter();

  const events: ScoringEvent[] = [];
  const timestamp = results.fetchedAt;
  const participantId = prediction.participantId;
  const getLabel = (id: string) => getTeamDisplay(id, registry);

  for (const gm of prediction.groupMatches) {
    const matchRef = tournament.groupMatches.find((m) => m.matchId === gm.matchId);
    const result = results.matches.find((m) => m.matchId === gm.matchId);
    if (!matchRef || !result) continue;

    const matchEvent = calculateMatchScore(
      participantId,
      gm,
      result,
      config,
      getLabel(matchRef.homeTeamId!),
      getLabel(matchRef.awayTeamId!),
      timestamp,
    );
    if (keepDecidedEvent(matchEvent)) {
      events.push(matchEvent);
    }
  }

  for (const gw of prediction.groupWinners) {
    const groupComplete = isGroupStageComplete(gw.group, tournament, results);
    const standing = groupComplete
      ? computeGroupStanding(gw.group, tournament, results, registry)
      : null;
    const groupWinnerEvent = calculateGroupWinnerScore(
      participantId,
      gw,
      standing,
      groupComplete,
      config,
      getLabel(gw.winnerId),
      getLabel,
      timestamp,
    );
    if (keepDecidedEvent(groupWinnerEvent)) {
      events.push(groupWinnerEvent);
    }
  }

  events.push(
    ...calculateKnockoutScore(
      participantId,
      prediction.knockout,
      results,
      config,
      tournament,
      getLabel,
      timestamp,
    ),
  );

  return {
    ...deriveBreakdownFromEvents(participantId, events),
    events,
  };
}
