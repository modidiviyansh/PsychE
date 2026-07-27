export type EngineStatus = 'cold_start' | 'warming' | 'active' | 'stale' | 'assessment_only';

export function calculateConfidenceMultiplier(daysSinceFirst: number, completedSessions: number): number {
  // Treat the initial day as Day 1 to prevent a 0% multiplier baseline
  const effectiveDays = Math.max(1, daysSinceFirst);
  return Math.min(1, effectiveDays / 15) * Math.min(1, completedSessions / 3);
}
