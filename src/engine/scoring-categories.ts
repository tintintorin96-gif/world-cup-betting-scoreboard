import type { ScoringCategory, ScoringEventType } from '../types/scoring';

export interface ScoringSection {
  id: string;
  title: string;
  categories: ScoringCategory[];
}

export const SCORING_SECTIONS: ScoringSection[] = [
  {
    id: 'group_stage',
    title: 'Group Stage',
    categories: ['exact_score', 'correct_outcome', 'wrong_outcome'],
  },
  {
    id: 'group_winners',
    title: 'Group Winners',
    categories: ['group_winner'],
  },
  {
    id: 'round_of_32',
    title: 'Round of 32',
    categories: ['round_of_32'],
  },
  {
    id: 'round_of_16',
    title: 'Round of 16',
    categories: ['round_of_16'],
  },
  {
    id: 'quarter_final',
    title: 'Quarter-finals',
    categories: ['quarter_final'],
  },
  {
    id: 'semi_final',
    title: 'Semi-finals',
    categories: ['semi_final'],
  },
  {
    id: 'third_place',
    title: 'Third-place match',
    categories: ['third_place_reach', 'third_place_winner'],
  },
  {
    id: 'final',
    title: 'Final',
    categories: ['finalist', 'champion'],
  },
];

export const TYPE_TO_CATEGORY: Record<ScoringEventType, ScoringCategory> = {
  group_exact_score: 'exact_score',
  group_correct_outcome: 'correct_outcome',
  group_wrong_outcome: 'wrong_outcome',
  group_winner: 'group_winner',
  knockout_r32: 'round_of_32',
  knockout_r16: 'round_of_16',
  knockout_qf: 'quarter_final',
  knockout_sf: 'semi_final',
  knockout_third_reach: 'third_place_reach',
  knockout_third_winner: 'third_place_winner',
  finalist: 'finalist',
  champion: 'champion',
  pending: 'pending',
};

const GROUP_CATEGORIES = new Set<ScoringCategory>([
  'exact_score',
  'correct_outcome',
  'wrong_outcome',
  'group_winner',
]);

export function isGroupCategory(category: ScoringCategory): boolean {
  return GROUP_CATEGORIES.has(category);
}
