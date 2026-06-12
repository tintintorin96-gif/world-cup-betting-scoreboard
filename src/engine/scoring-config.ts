import type { ScoringConfig, ScoringEventType } from '../types/scoring';
import type { TournamentConfig } from '../types/tournament';

export function getPoints(config: ScoringConfig, type: ScoringEventType): number {
  return config.rules[type];
}

export function computeMaxPossibleScore(
  config: ScoringConfig,
  tournament: TournamentConfig,
): number {
  const groupMatchCount = tournament.groupMatches.length;
  const groupCount = tournament.groups.length;

  let max = 0;
  max += groupMatchCount * config.rules.group_exact_score;
  max += groupCount * config.rules.group_winner;

  for (const round of tournament.knockoutRounds) {
    const key = `knockout_${round.round}` as ScoringEventType;
    if (round.round === 'third') {
      max += config.rules.knockout_third_reach;
      max += config.rules.knockout_third_winner;
    } else if (round.round === 'final') {
      max += config.rules.finalist * 2;
      max += config.rules.champion;
    } else if (key in config.rules) {
      max += config.rules[key] * round.slots;
    }
  }

  return max;
}
