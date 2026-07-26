// =============================================================================
//  PsychE V3 — Assessment Engine
//  Owns: pure scoring functions + question-fetch logic.
//  NO Supabase calls except fetchAssessmentQuestions.
//  Per docs/GUIDE_developer.md §5 + ARCH_technical-specs.md §7
// =============================================================================

import { supabase } from './supabase';
import type { AssessmentSummary } from '../types';

// =============================================================================
//  Pure Scoring Functions
//  (No Supabase calls — safe to call anywhere)
// =============================================================================

/**
 * Apply reverse-scoring to a raw score on an N-point scale.
 * Formula: (maxScale + 1) - rawScore
 * e.g. raw=1 on 4-point scale → effective = 4
 */
export function reverseScore(rawScore: number, maxScale = 4): number {
  return maxScale + 1 - rawScore;
}

/**
 * Compute effective score for a single response.
 * Applies reverse-scoring if flagged, otherwise passes through raw.
 */
export function effectiveScore(raw: number, isReverse: boolean, maxScale = 4): number {
  return isReverse ? reverseScore(raw, maxScale) : raw;
}

/**
 * Compute a 0–100 percentage score for a complete module response set.
 * Applies reverse-scoring at read time per ARCH_technical-specs.md §7.
 * Raw scores are stored as-is; this function converts.
 */
export function computeModuleScore(
  responses: Array<{ score_value: number; is_reverse_scored: boolean }>,
  maxScale = 4
): number {
  if (responses.length === 0) return 0;
  const maxPossible = responses.length * maxScale;
  const total = responses.reduce(
    (sum, r) => sum + effectiveScore(r.score_value, r.is_reverse_scored, maxScale),
    0
  );
  return Math.round((total / maxPossible) * 100);
}

/**
 * Interpret a 0–100 score percentage into a human-readable severity label.
 * Used for displaying assessment results in StudentProfile and ReportExport.
 */
export function interpretScore(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Strong', color: 'var(--accent-green)' };
  if (score >= 50) return { label: 'Moderate', color: 'var(--accent-amber)' };
  if (score >= 25) return { label: 'Concerning', color: 'var(--accent-red)' };
  return { label: 'Critical', color: 'var(--accent-red)' };
}

// =============================================================================
//  Assessment Question Interface
// =============================================================================

export interface AssessmentQuestion {
  id: string;
  module_id: string;
  module_name: string;
  prompt_text: string;
  is_reverse_scored: boolean;
  custom_labels: Record<string, string>;
}

// =============================================================================
//  fetchAssessmentQuestions
//  Fetches active questions for a module with cooldown filtering.
//  Called by AssessmentWizard and LiveAssessmentModal.
// =============================================================================

export async function fetchAssessmentQuestions(
  studentUuid: string,
  moduleId?: string,
  limit = 8
): Promise<AssessmentQuestion[]> {
  try {
    // 1. Fetch cooldown setting
    const { data: settings } = await supabase
      .from('PsychE_Settings')
      .select('assessment_cooldown_days')
      .eq('id', 1)
      .single();
    const cooldownDays = settings?.assessment_cooldown_days ?? 30;

    // 2. Find recently answered question IDs within cooldown window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cooldownDays);
    const cutoffStr = cutoff.toISOString();

    const { data: recentLogs } = await supabase
      .from('PsychE_Counseling_Logs')
      .select('id')
      .eq('student_uuid', studentUuid)
      .gte('session_date', cutoffStr);

    let cooldownQuestionIds: string[] = [];
    if (recentLogs && recentLogs.length > 0) {
      const logIds = recentLogs.map(l => l.id);
      const { data: recentResponses } = await supabase
        .from('PsychE_Responses')
        .select('question_id')
        .in('log_id', logIds);
      cooldownQuestionIds = (recentResponses ?? []).map(r => r.question_id);
    }

    // 3. Build question query
    let query = supabase
      .from('PsychE_Questions')
      .select(`
        id,
        module_id,
        prompt_text,
        is_reverse_scored,
        custom_labels,
        is_active,
        PsychE_Modules!inner (
          id,
          name,
          type,
          is_locked
        )
      `)
      .eq('is_active', true);

    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }

    const { data: available, error } = await query;
    if (error || !available) {
      console.error('[assessmentEngine] fetchAssessmentQuestions error:', error);
      return [];
    }

    // Use unknown cast since Supabase returns join as array but !inner guarantees one record
    type QRow = {
      id: string;
      module_id: string;
      prompt_text: string;
      is_reverse_scored: boolean;
      custom_labels: Record<string, string>;
      is_active: boolean;
      PsychE_Modules: { id: string; name: string; type: string; is_locked: boolean };
    };
    let filtered = (available as unknown as QRow[]);

    // 4. If no specific module → COMPE only, unlocked only (Daily Mix mode)
    if (!moduleId) {
      filtered = filtered.filter(
        q => q.PsychE_Modules.type === 'COMPE' && !q.PsychE_Modules.is_locked
      );
    }

    // 5. Apply cooldown filter
    filtered = filtered.filter(q => !cooldownQuestionIds.includes(q.id));

    // 6. Randomize and limit
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit);

    return selected.map(q => ({
      id: q.id,
      module_id: q.module_id,
      module_name: q.PsychE_Modules.name,
      prompt_text: q.prompt_text,
      is_reverse_scored: q.is_reverse_scored,
      custom_labels: q.custom_labels,
    }));

  } catch (err) {
    console.error('[assessmentEngine] Fatal error:', err);
    return [];
  }
}

// =============================================================================
//  buildAssessmentSummary
//  Creates an AssessmentSummary object for storing in
//  PsychE_Counseling_Logs.assessment_data JSONB field.
// =============================================================================

export function buildAssessmentSummary(
  moduleId: string,
  moduleName: string,
  responses: Array<{ score_value: number; is_reverse_scored: boolean }>
): AssessmentSummary {
  return {
    module_id: moduleId,
    module_name: moduleName,
    score_percentage: computeModuleScore(responses),
    response_count: responses.length,
    computed_at: new Date().toISOString(),
  };
}
