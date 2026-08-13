/**
 * Default scoring configuration seeded into AssessmentScoringConfig. This
 * is data, not code — an admin tool in a later phase can edit the DB row
 * directly without touching src/lib/assessment/scoring.ts.
 */
export const DEFAULT_STAGE_THRESHOLDS = {
  PASSION: 65,
  POWER: 65,
  LEGACY: 65,
} as const;

export const DEFAULT_STAGE_WEIGHTS = {
  PASSION: 1,
  POWER: 1,
  LEGACY: 1,
} as const;

export const DEFAULT_EXCELLENCE_THRESHOLD = 85;

export interface StatusBand {
  min: number;
  max: number;
  label: string;
}

export const DEFAULT_STATUS_BANDS: StatusBand[] = [
  { min: 0, max: 39, label: "Needs Development" },
  { min: 40, max: 64, label: "Developing" },
  { min: 65, max: 84, label: "Strong" },
  { min: 85, max: 100, label: "Established" },
];
