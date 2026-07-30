// =============================================================================
//  Per-session redaction — used only by formalize-sessions, never by
//  generate-ai-report (which stays structured-telemetry-only by design).
//
//  V12: each session is redacted and formalized independently — there is no
//  cross-session blending, so unlike the V11 version of this file there is no
//  "relative ordering phrase" concept. A session's real date is never sent to
//  the LLM at all (not needed for a pure language rewrite of one session's
//  text, and not sending it is a stronger property than redacting it).
//
//  ⚠ THIS IS BEST-EFFORT, NOT A PII GUARANTEE. There is no NER model in this
//    stack — just structural substitution for a field we know the exact value
//    of (counselor_name), plus a regex pass over free text for common
//    patterns (honorific + name, known exam names, class-section strings). A
//    teacher referred to without a title, an unusual exam name, or any other
//    phrasing the regex doesn't anticipate will pass through unredacted.
//    Treat this the same way GUIDE_developer.md treats the pre-production RLS
//    gap: real, documented, not silently pretended away. If this ever needs to
//    be airtight, that's a real NER integration, not a bigger regex.
// =============================================================================

export interface RawSession {
  id: string;
  counselor_name: string | null;
  reason: string | null;
  student_response: string | null;
  recommended_action: string | null;
}

export interface RedactedSessionInput {
  id: string;
  reason: string | null;
  student_response: string | null;
  recommended_action: string | null;
}

const HONORIFIC_NAME = /\b(Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
const EXAM_KEYWORDS = /\b(JEE(?:[\s-]?(?:Mains|Advanced))?|NEET|board exams?|CBSE|ICSE|semester exams?|mid-?terms?|finals?)\b/gi;
const SECTION_PATTERN = /\bClass\s*\d+\s*-\s*Section\s*[A-Z]\b/gi;

function coarsenText(text: string, counselorName: string | null): string {
  let out = text;
  if (counselorName && counselorName.trim()) {
    out = out.split(counselorName).join('a counsellor');
  }
  out = out.replace(HONORIFIC_NAME, 'a teacher');
  out = out.replace(EXAM_KEYWORDS, 'a core subject exam');
  out = out.replace(SECTION_PATTERN, 'a class section');
  return out;
}

/** One session in, one redacted session out — no sorting, no blending, no order phrase. */
export function redactSessionForFormalization(session: RawSession): RedactedSessionInput {
  return {
    id: session.id,
    reason: session.reason ? coarsenText(session.reason, session.counselor_name) : null,
    student_response: session.student_response ? coarsenText(session.student_response, session.counselor_name) : null,
    recommended_action: session.recommended_action ? coarsenText(session.recommended_action, session.counselor_name) : null,
  };
}
