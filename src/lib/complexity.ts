/**
 * Summary helpers for the Complexity Assistant.
 *
 * Kept pure so the level distribution and total-points math can be unit
 * tested without rendering the view.
 */

export const LEVELS = ["Trivial", "Medium", "High"] as const;
export type ComplexityLevel = (typeof LEVELS)[number];

export interface ComplexityAssessment {
  level: ComplexityLevel;
  points: number;
}

export interface ComplexitySummary {
  counts: { level: ComplexityLevel; count: number }[];
  totalPoints: number;
}

export function summarizeAssessments(
  assessments: ComplexityAssessment[],
): ComplexitySummary {
  const counts = LEVELS.map((level) => ({
    level,
    count: assessments.filter((a) => a.level === level).length,
  }));
  const totalPoints = assessments.reduce((sum, a) => sum + a.points, 0);
  return { counts, totalPoints };
}