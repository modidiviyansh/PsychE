// =============================================================================
//  PsychE V12 — Formal Timeline data access
//  Owns: reading PsychE_Formalized_Sessions and invoking the
//  formalize-sessions Edge Function. Same split as aiReports.ts — the actual
//  redaction + LLM call live server-side; this module only ever reads the
//  redacted result back, never raw session text.
//
//  There is no per-date-range fetch here on purpose: this table has no
//  concept of "a report" to look up, only "which sessions has this student
//  had formalized, ever". Callers merge these rows against the `logs` state
//  they already hold (StudentProfile.tsx loads all of a student's logs once
//  on mount) by `log_id` — no server-side join needed.
// =============================================================================

import { supabase } from './supabase';
import type { FormalizedSession } from '../types';

const TABLE = 'PsychE_Formalized_Sessions';

const COLUMNS = 'id, log_id, student_uuid, reason_formal, student_response_formal, recommended_action_formal, model_used, formalized_at';

export interface FormalizedSessionsResult {
  data: FormalizedSession[];
  error: string | null;
}

/** All sessions formalized so far for this student — merge by log_id against the raw logs. */
export async function fetchFormalizedSessions(studentUuid: string): Promise<FormalizedSessionsResult> {
  if (!studentUuid) return { data: [], error: null };

  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS)
    .eq('student_uuid', studentUuid);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as FormalizedSession[], error: null };
}

export interface FormalizeSessionsResult {
  formalizedSessions: FormalizedSession[];
  skippedCount: number;
  error: string | null;
  alreadyCurrent?: boolean;
}

/** Same reasoning as aiReports.ts: supabase-js only parses the JSON body into `data` on 2xx. */
async function extractErrorMessage(err: any): Promise<string> {
  if (err?.context && typeof err.context.json === 'function') {
    try {
      const body = await err.context.json();
      if (body?.error) return body.error;
    } catch {
      // Response body wasn't JSON or was already consumed — fall through.
    }
  }
  return err?.message || 'Unable to reach the formalization service.';
}

/**
 * Tops up whatever's pending for this student in ONE batched LLM call — never
 * once per session, never a second call for anything already formalized.
 * Returns `alreadyCurrent: true` (no LLM call happened) when there was
 * nothing pending.
 */
export async function formalizeSessions(studentUuid: string): Promise<FormalizeSessionsResult> {
  if (!studentUuid) return { formalizedSessions: [], skippedCount: 0, error: 'No student selected.' };

  const { data, error } = await supabase.functions.invoke('formalize-sessions', {
    body: { studentUuid },
  });

  if (error) return { formalizedSessions: [], skippedCount: 0, error: await extractErrorMessage(error) };
  if (data?.error) return { formalizedSessions: [], skippedCount: data.skippedCount ?? 0, error: data.error };

  return {
    formalizedSessions: data?.formalizedSessions ?? [],
    skippedCount: data?.skippedCount ?? 0,
    error: null,
    alreadyCurrent: data?.alreadyCurrent === true,
  };
}
