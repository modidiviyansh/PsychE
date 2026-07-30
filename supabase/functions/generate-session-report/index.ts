// =============================================================================
//  PsychE V11 — generate-session-report (Supabase Edge Function)
//
//  The counterpart to generate-ai-report that's allowed to touch session
//  text. generate-ai-report stays structured-telemetry-only by design (see
//  its own header); a "Formal Report" is explicitly a narrative write-up of
//  actual sessions, so there's no version of this feature that avoids text —
//  the redaction pass in _shared/redaction.ts is the mitigation, not text
//  avoidance.
//
//  Triggered from the same "Generate Report" modal as the raw statement
//  export (ReportExport.tsx / /report) — the counsellor picks Raw vs Formal
//  there. This function only runs for Formal.
//
//  Body: {
//    studentUuid: string,
//    startDate?: string, endDate?: string,   // ISO dates, custom range
//    allTime?: boolean,                       // overrides start/end if true
//    includeTelemetry?: boolean,              // fold in banded telemetry (V10 labelizer, reused)
//    includeSummary?: boolean,                // fold in the latest AI Summary's clinical_summary
//  }
//
//  Deploy:
//    supabase functions deploy generate-session-report --project-ref <your-ref>
//  Shares GROQ_API_KEY / GEMINI_API_KEY secrets with generate-ai-report — no
//  separate secret to set.
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { buildTelemetrySummary, renderTelemetrySummary } from '../_shared/telemetryLabels.ts';
import { sanitizeSessions, renderSanitizedSessions, type RawSession } from '../_shared/redaction.ts';
import { callGroq, callGemini, generatePlainText, type CallFn } from '../_shared/llmProviders.ts';
import { getLoadStats, rankModelsForReport, logModelUsage, type ModelProfile } from '../_shared/modelRouter.ts';

// Formal reports cover a whole date range, not one snapshot — a slightly
// longer cap than the technical report's 900, still well inside the "crisp"
// brief the source PRD (and Task 3.3) asked for.
const MAX_OUTPUT_TOKENS = 1000;

const SYSTEM_PROMPT = `You are a child psychology assistant writing a formal, printable session
report for a school counsellor's records. This is a clinical document, not a dashboard
summary — write connected prose, not bullet fragments.

You have been given a redacted, chronological account of one or more counselling sessions.
Teacher names, exact dates, and specific exam/class-section references have already been
replaced with generic phrasing — do not try to guess or reconstruct what was redacted.

Tone: formal, caring, and precise. Use proper psychological/clinical terminology where it
fits, each time paired with a plain-language gloss so the document stays readable to a
non-specialist (e.g. a parent or administrator) who may eventually see it. Never invent
numbers, scores, or metrics — none were given to you, and none belong in this document.

Ground every sentence in what was actually provided. If telemetry context or a prior AI
summary is included below, you may reference it once for framing, but the sessions
themselves are the substance of the report.

Keep the whole report tight: aim for 4-6 short paragraphs covering the arc of contact,
key themes, and current standing. Do not pad. Respond with ONLY the report text itself —
no title, no markdown, no commentary before or after.`;

function buildUserPrompt(sessionsText: string, telemetryText: string | null, summaryText: string | null): string {
  let prompt = `Redacted session record:\n\n${sessionsText}`;
  if (telemetryText) prompt += `\n\nContext — current assessment telemetry (for framing only):\n${telemetryText}`;
  if (summaryText) prompt += `\n\nContext — most recent AI technical summary (for framing only):\n${summaryText}`;
  prompt += '\n\nWrite the formal session report now.';
  return prompt;
}

function callFnFor(profile: ModelProfile, groqKey: string | undefined, geminiKey: string | undefined): CallFn {
  if (profile.provider === 'groq') {
    return (system, user) => callGroq(groqKey!, profile.name, system, user, { maxTokens: MAX_OUTPUT_TOKENS, jsonMode: false });
  }
  return (system, user) => callGemini(geminiKey!, profile.name, system, user, { maxTokens: MAX_OUTPUT_TOKENS, jsonMode: false });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const studentUuid: string | undefined = body.studentUuid;
    const allTime: boolean = body.allTime === true;
    const startDate: string | undefined = body.startDate;
    const endDate: string | undefined = body.endDate;
    const includeTelemetry: boolean = body.includeTelemetry === true;
    const includeSummary: boolean = body.includeSummary === true;

    if (!studentUuid || typeof studentUuid !== 'string') {
      return new Response(JSON.stringify({ report: null, error: 'studentUuid is required.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!allTime && (!startDate || !endDate)) {
      return new Response(JSON.stringify({ report: null, error: 'Provide startDate and endDate, or set allTime.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Metadata only — no full_name, email, mobile, or exact enrolled_date.
    const { data: student, error: studentError } = await supabase
      .from('PsychE_Students').select('risk_level, course').eq('id', studentUuid).single();
    if (studentError || !student) {
      return new Response(JSON.stringify({ report: null, error: 'Student not found.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let logsQuery = supabase
      .from('PsychE_Counseling_Logs')
      .select('id, session_date, counselor_name, reason, student_response, recommended_action')
      .eq('student_uuid', studentUuid)
      .eq('session_status', 'Completed')
      .order('session_date', { ascending: true });

    if (!allTime && startDate && endDate) {
      const startIso = new Date(startDate).toISOString();
      const endD = new Date(endDate);
      endD.setHours(23, 59, 59, 999);
      logsQuery = logsQuery.gte('session_date', startIso).lte('session_date', endD.toISOString());
    }

    const { data: logs, error: logsError } = await logsQuery;
    if (logsError) {
      return new Response(JSON.stringify({ report: null, error: logsError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({ report: null, error: null, noSessions: true, reason: 'No completed sessions found in this range.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitized = sanitizeSessions(logs as RawSession[]);
    const sessionsText = renderSanitizedSessions(sanitized);

    let telemetryText: string | null = null;
    if (includeTelemetry) {
      const [{ data: telemetry }, { data: engineStatusData }] = await Promise.all([
        supabase.from('PsychE_Student_Telemetry')
          .select('metrics_payload, eti_data, composite_data')
          .eq('student_uuid', studentUuid).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.rpc('psyche_get_engine_status', { p_student_uuid: studentUuid }),
      ]);
      const engineStatus = typeof engineStatusData === 'string' ? engineStatusData : 'warming';
      const summary = buildTelemetrySummary(
        student, telemetry?.metrics_payload ?? null, telemetry?.eti_data, telemetry?.composite_data, engineStatus
      );
      telemetryText = renderTelemetrySummary(summary);
    }

    let summaryText: string | null = null;
    if (includeSummary) {
      const { data: latestReport } = await supabase
        .from('PsychE_AI_Reports').select('report_jsonb')
        .eq('student_uuid', studentUuid).order('generated_at', { ascending: false }).limit(1).maybeSingle();
      const content = latestReport?.report_jsonb;
      if (content?.clinical_summary) {
        summaryText = `${content.dominant_theme ? content.dominant_theme + ' — ' : ''}${content.clinical_summary}`;
      }
    }

    const userPrompt = buildUserPrompt(sessionsText, telemetryText, summaryText);

    const groqKey = Deno.env.get('GROQ_API_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const availableProviders = new Set<'groq' | 'gemini'>([
      ...(groqKey ? (['groq'] as const) : []),
      ...(geminiKey ? (['gemini'] as const) : []),
    ]);

    if (availableProviders.size === 0) {
      return new Response(
        JSON.stringify({ report: null, error: 'No LLM provider configured (GROQ_API_KEY / GEMINI_API_KEY missing).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loadStats = await getLoadStats(supabase);
    const ranked = rankModelsForReport(loadStats, 'full', availableProviders);

    let reportText: string | null = null;
    let tokensUsed: number | null = null;
    let chosenProfile: ModelProfile | null = null;
    let lastError: unknown = null;

    for (const profile of ranked) {
      try {
        const call = callFnFor(profile, groqKey, geminiKey);
        const result = await generatePlainText(call, SYSTEM_PROMPT, userPrompt);
        reportText = result.text;
        tokensUsed = result.tokensUsed;
        chosenProfile = profile;
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!reportText || !chosenProfile) {
      console.error('[generate-session-report] All candidate models failed:', lastError);
      return new Response(
        JSON.stringify({ report: null, error: 'Unable to generate the formal report right now. Please try again later.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modelUsed = `${chosenProfile.provider}:${chosenProfile.name}`;

    await logModelUsage(supabase, {
      modelName: chosenProfile.name, provider: chosenProfile.provider,
      reportType: 'session', tokensUsed, studentUuid,
    });

    const { data: inserted, error: insertError } = await supabase
      .from('PsychE_Sanitized_Session_Reports')
      .insert([{
        student_uuid: studentUuid,
        session_ids: logs.map((l: RawSession) => l.id),
        report_text: reportText,
        report_jsonb: { included_telemetry: includeTelemetry, included_summary: includeSummary },
        included_telemetry: includeTelemetry,
        included_summary: includeSummary,
        model_used: modelUsed,
      }])
      .select('id, student_uuid, session_ids, report_text, report_jsonb, included_telemetry, included_summary, model_used, generated_at')
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ report: null, error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ report: inserted, error: null }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[generate-session-report] Unhandled error:', err);
    return new Response(JSON.stringify({ report: null, error: 'Unexpected error generating the report.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
