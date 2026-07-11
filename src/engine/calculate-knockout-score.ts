import type { KnockoutPrediction } from '../types/prediction';
import type { ResultsBundle } from '../types/results';
import type { KnockoutRound, TournamentConfig } from '../types/tournament';
import type { ScoringConfig, ScoringEvent, ScoringEventType } from '../types/scoring';
import { createScoringEvent } from './create-scoring-event';
import { getPoints } from './scoring-config';

function knockoutEventType(round: KnockoutRound): ScoringEventType | null {
  const map: Partial<Record<KnockoutRound, ScoringEventType>> = {
    r32: 'knockout_r32',
    r16: 'knockout_r16',
    qf: 'knockout_qf',
    sf: 'knockout_sf',
  };
  return map[round] ?? null;
}

function getRoundMatches(round: KnockoutRound, results: ResultsBundle) {
  return results.knockout.filter((k) => k.round === round);
}

const KNOCKOUT_ROUND_ORDER: KnockoutRound[] = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];

function previousKnockoutRound(round: KnockoutRound): KnockoutRound | null {
  const index = KNOCKOUT_ROUND_ORDER.indexOf(round);
  return index > 0 ? KNOCKOUT_ROUND_ORDER[index - 1]! : null;
}

function getTeamRoundMatch(
  teamId: string,
  round: KnockoutRound,
  results: ResultsBundle,
) {
  return getRoundMatches(round, results).find(
    (m) => m.homeTeamId === teamId || m.awayTeamId === teamId,
  );
}

type KnockoutAdvanceOutcome = 'advanced' | 'eliminated' | 'pending';

function resolveKnockoutAdvanceOutcome(
  teamId: string,
  round: KnockoutRound,
  results: ResultsBundle,
): KnockoutAdvanceOutcome {
  const match = getTeamRoundMatch(teamId, round, results);
  if (match) {
    if (!match.winnerId) return 'pending';
    return match.winnerId === teamId ? 'advanced' : 'eliminated';
  }

  let priorRound = previousKnockoutRound(round);
  while (priorRound) {
    const priorMatch = getTeamRoundMatch(teamId, priorRound, results);
    if (priorMatch) {
      if (!priorMatch.winnerId) return 'pending';
      return priorMatch.winnerId === teamId ? 'pending' : 'eliminated';
    }
    priorRound = previousKnockoutRound(priorRound);
  }

  const roundMatches = getRoundMatches(round, results);
  if (!roundMatches.length || roundMatches.some((m) => !m.winnerId)) {
    return 'pending';
  }

  return 'eliminated';
}

export function calculateKnockoutScore(
  participantId: string,
  predictions: KnockoutPrediction[],
  results: ResultsBundle,
  config: ScoringConfig,
  tournament: TournamentConfig,
  getTeamLabel: (id: string) => string,
  timestamp: string,
): ScoringEvent[] {
  const events: ScoringEvent[] = [];

  for (const pred of predictions) {
    if (pred.round === 'third') {
      const thirdMatches = results.knockout.filter((k) => k.round === 'third');
      const participants = new Set<string>();
      for (const m of thirdMatches) {
        participants.add(m.homeTeamId);
        participants.add(m.awayTeamId);
      }

      for (const teamId of pred.advancingTeamIds) {
        if (thirdMatches.length === 0) {
          continue;
        }

        const reached = participants.has(teamId);
        events.push(
          createScoringEvent({
            participantId,
            type: 'knockout_third_reach',
            points: reached ? getPoints(config, 'knockout_third_reach') : 0,
            label: reached ? 'Third-place reach' : 'Missed third-place reach',
            description: getTeamLabel(teamId),
            prediction: 'Reaches third-place match',
            actualResult: reached ? 'Played third-place match' : 'Did not reach third-place match',
            teamId,
            round: 'third',
            timestamp,
          }),
        );
      }

      const winner = thirdMatches.find((m) => m.winnerId)?.winnerId;
      const predictedWinner = pred.advancingTeamIds[pred.advancingTeamIds.length - 1];
      if (predictedWinner && winner) {
        const correct = predictedWinner === winner;
        events.push(
          createScoringEvent({
            participantId,
            type: 'knockout_third_winner',
            points: correct ? getPoints(config, 'knockout_third_winner') : 0,
            label: correct ? 'Third-place winner' : 'Wrong third-place winner',
            description: getTeamLabel(predictedWinner),
            prediction: getTeamLabel(predictedWinner),
            actualResult: getTeamLabel(winner),
            teamId: predictedWinner,
            round: 'third',
            timestamp,
          }),
        );
      }
      continue;
    }

    if (pred.round === 'final') {
      const actualFinalists = new Set<string>();
      for (const m of results.knockout.filter((k) => k.round === 'final')) {
        actualFinalists.add(m.homeTeamId);
        actualFinalists.add(m.awayTeamId);
      }

      for (const teamId of pred.advancingTeamIds) {
        const correct = actualFinalists.has(teamId);
        if (actualFinalists.size) {
          events.push(
            createScoringEvent({
              participantId,
              type: 'finalist',
              points: correct ? getPoints(config, 'finalist') : 0,
              label: correct ? 'Correct finalist' : 'Missed finalist',
              description: getTeamLabel(teamId),
              prediction: 'Reaches final',
              actualResult: correct ? 'Finalist' : 'Did not reach final',
              teamId,
              round: 'final',
              timestamp,
            }),
          );
        }
      }
      continue;
    }

    const eventType = knockoutEventType(pred.round);
    if (!eventType) continue;

    const roundConfig = tournament.knockoutRounds.find((r) => r.round === pred.round);
    const pointsEach = getPoints(config, eventType);

    for (const teamId of pred.advancingTeamIds) {
      const outcome = resolveKnockoutAdvanceOutcome(teamId, pred.round, results);
      if (outcome === 'pending') continue;

      const correct = outcome === 'advanced';
      events.push(
        createScoringEvent({
          participantId,
          type: eventType,
          points: correct ? pointsEach : 0,
          label: correct
            ? `${roundConfig?.label ?? pred.round} correct`
            : `${roundConfig?.label ?? pred.round} missed`,
          description: getTeamLabel(teamId),
          prediction: 'Advances',
          actualResult: correct ? 'Advanced' : 'Eliminated',
          teamId,
          round: pred.round,
          timestamp,
        }),
      );
    }
  }

  if (results.championId) {
    const championPred = predictions.find((p) => p.round === 'final');
    const championPick = championPred?.advancingTeamIds[0];
    if (championPick) {
      const correct = championPick === results.championId;
      events.push(
        createScoringEvent({
          participantId,
          type: 'champion',
          points: correct ? getPoints(config, 'champion') : 0,
          label: correct ? 'Champion' : 'Wrong champion',
          description: getTeamLabel(championPick),
          prediction: getTeamLabel(championPick),
          actualResult: getTeamLabel(results.championId),
          teamId: championPick,
          timestamp,
        }),
      );
    }
  }

  return events;
}
