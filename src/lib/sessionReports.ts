// =============================================================================
//  PsychE V11 — Formal (Sanitized Session) Report data access
//  Owns: reading PsychE_Sanitized_Session_Reports and invoking the
//  generate-session-report Edge Function. Same split as aiReports.ts — the
//  actual redaction + LLM call live server-side; this module only ever reads
//  the redacted result back, never raw session text.
// =============================================================================

import { supabase } from './supabase';
import type { SanitizedSessionReport } from '../types';

const TABLE = 'PsychE_Sanitized_Session_Reports';

const REPORT_COLUMNS =
  'id, student_uuid, session_ids, report_text, report_jsonb, included_telemetry, included_summary, model_used, generated_at';

export interface SessionReportsResult {
  data: SanitizedSessionReport[];
  error: string | null;
}

export interface SessionReportResult {
  data: SanitizedSessionReport | null;
  error: string | null;
  noSessions?: boolean;
}

/** All formal reports generated for this student, newest first — what the Formal Reports tab lists. */
export async function fetchSessionReports(studentUuid: string): Promise<SessionReportsResult> {
  if (!studentUuid) return { data: [], error: null };

  const { data, error } = await supabase
    .from(TABLE)
    .select(REPORT_COLUMNS)
    .eq('student_uuid', studentUuid)
    .order('generated_at', { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SanitizedSessionReport[], error: null };
}

export interface GenerateSessionReportParams {
  studentUuid: string;
  startDate?: string;
  endDate?: string;
  allTime?: boolean;
  includeTelemetry?: boolean;
  includeSummary?: boolean;
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
  return err?.message || 'Unable to reach the report service.';
}

export async function generateSessionReport(params: GenerateSessionReportParams): Promise<SessionReportResult> {
  const { studentUuid, ...rest } = params;
  if (!studentUuid) return { data: null, error: 'No student selected.' };

  const { data, error } = await supabase.functions.invoke('generate-session-report', {
    body: { studentUuid, ...rest },
  });

  if (error) return { data: null, error: await extractErrorMessage(error) };
  if (data?.error) return { data: null, error: data.error };
  if (data?.noSessions) return { data: null, error: null, noSessions: true };

  return { data: data?.report ?? null, error: null };
}
