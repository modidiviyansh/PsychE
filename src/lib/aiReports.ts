// =============================================================================
//  PsychE V10 — AI Technical Report data access
//  Owns: reading PsychE_AI_Reports and invoking the generate-ai-report Edge
//  Function. The actual LLM call and the redaction/banding logic live in the
//  Edge Function (supabase/functions/generate-ai-report) — this module never
//  talks to Groq/Gemini directly, and never could, since it runs in the
//  browser where a provider key would be public the moment it shipped.
// =============================================================================

import { supabase } from './supabase';
import type { AIReport } from '../types';

const TABLE = 'PsychE_AI_Reports';

const REPORT_COLUMNS = 'id, student_uuid, report_jsonb, generation_source, model_used, generated_at';

export interface ReportResult {
  data: AIReport | null;
  error: string | null;
  insufficientData?: boolean;
  cooldownActive?: boolean;
  cooldownEndsAt?: string;
}

function normalizeRow(row: Record<string, any>): AIReport {
  return {
    id: row.id,
    student_uuid: row.student_uuid,
    report: row.report_jsonb,
    generation_source: row.generation_source,
    model_used: row.model_used,
    generated_at: row.generated_at,
  };
}

/** Latest report for this student, if any — what the profile panel reads on load. */
export async function fetchLatestReport(studentUuid: string): Promise<ReportResult> {
  if (!studentUuid) return { data: null, error: null };

  const { data, error } = await supabase
    .from(TABLE)
    .select(REPORT_COLUMNS)
    .eq('student_uuid', studentUuid)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: data ? normalizeRow(data) : null, error: null };
}

/**
 * The Edge Function returns 200 with `{ insufficientData: true }` or
 * `{ cooldownActive: true }` for expected non-error states, and a non-2xx
 * status for real failures — supabase-js only parses the JSON body into
 * `data` on 2xx, so a real failure needs its message pulled off the raw
 * Response attached to `error.context`.
 */
async function extractErrorMessage(err: any): Promise<string> {
  if (err?.context && typeof err.context.json === 'function') {
    try {
      const body = await err.context.json();
      if (body?.error) return body.error;
    } catch {
      // Response body wasn't JSON or was already consumed — fall through.
    }
  }
  return err?.message || 'Unable to reach the report service.';
}

/** Calls the Edge Function. Counts against the 24h on-demand cooldown it enforces. */
export async function generateReport(studentUuid: string): Promise<ReportResult> {
  if (!studentUuid) return { data: null, error: 'No student selected.' };

  const { data, error } = await supabase.functions.invoke('generate-ai-report', {
    body: { studentUuid, source: 'on_demand' },
  });

  if (error) return { data: null, error: await extractErrorMessage(error) };
  if (data?.error) return { data: null, error: data.error };

  if (data?.insufficientData) {
    return { data: null, error: null, insufficientData: true };
  }

  if (data?.cooldownActive) {
    return {
      data: data.report ? normalizeRow(data.report) : null,
      error: null,
      cooldownActive: true,
      cooldownEndsAt: data.cooldownEndsAt,
    };
  }

  return { data: data?.report ? normalizeRow(data.report) : null, error: null };
}
