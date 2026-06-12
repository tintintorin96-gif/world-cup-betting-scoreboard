import type { ScoringConfig, ScoringEventType } from '../types/scoring';
import defaultScoring from '../../config/scoring.defaults.json';

const SCORING_KEYS: ScoringEventType[] = [
  'group_exact_score',
  'group_correct_outcome',
  'group_wrong_outcome',
  'group_winner',
  'knockout_r32',
  'knockout_r16',
  'knockout_qf',
  'knockout_sf',
  'knockout_third_reach',
  'knockout_third_winner',
  'finalist',
  'champion',
];

export function parseRulesFile(markdown: string): { config: ScoringConfig; warnings: string[] } {
  const warnings: string[] = [];
  const jsonBlock = markdown.match(
    /##\s+Scoring Config \(machine-readable\)\s*```json\s*([\s\S]*?)```/i,
  );

  if (!jsonBlock) {
    warnings.push('No machine-readable scoring config in rules file; using scoring.defaults.json');
    return { config: defaultScoring as ScoringConfig, warnings };
  }

  try {
    const parsed = JSON.parse(jsonBlock[1]) as Partial<ScoringConfig>;
    const rules = { ...(defaultScoring.rules as Record<ScoringEventType, number>) };
    for (const key of SCORING_KEYS) {
      if (parsed.rules && key in parsed.rules) {
        rules[key] = parsed.rules[key] as number;
      }
    }
    return {
      config: {
        maxPoints: parsed.maxPoints ?? defaultScoring.maxPoints,
        rules,
      },
      warnings,
    };
  } catch {
    warnings.push('Failed to parse scoring config JSON; using defaults');
    return { config: defaultScoring as ScoringConfig, warnings };
  }
}
