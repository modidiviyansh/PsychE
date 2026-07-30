// =============================================================================
//  Session sanitization — used only by generate-session-report, never by
//  generate-ai-report (which stays structured-telemetry-only by design).
//
//  ⚠ THIS IS BEST-EFFORT, NOT A PII GUARANTEE. There is no NER model in this
//    stack — just structural substitution for fields we know the exact value
//    of (counselor_name, session_date), plus a regex pass over free text for
//    common patterns (honorific + name, known exam names, class-section
//    strings). A teacher referred to without a title, an unusual exam name, or
//    any other phrasing the regex doesn't anticipate will pass through
//    unredacted. Treat this the same way GUIDE_developer.md treats the
//    pre-production RLS gap: real, documented, not silently pretended away.
//    If this ever needs to be airtight, that's a real NER integration, not a
//    bigger regex.
// =============================================================================

export interface RawSession {
  id: string;
  session_date: string | null;
  counselor_name: string | null;
  reason: string | null;
  student_response: string | null;
  recommended_action: string | null;
}

export interface SanitizedSession {
  /** Relative ordering phrase — never an exact date. */
  order: string;
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

/** Computed from real chronological order, never parsed out of the date string. */
function relativeOrderPhrase(index: number, total: number): string {
  if (total === 1) return 'in this session';
  if (index === total - 1) return 'in the most recent of these sessions';
  if (index === 0) return 'in the earliest of these sessions';
  return 'in an intervening session';
}

/** Oldest-first, so "most recent" / "earliest" phrasing matches reality. */
export function sanitizeSessions(raw: RawSession[]): SanitizedSession[] {
  const ordered = [...raw].sort((a, b) => (a.session_date ?? '').localeCompare(b.session_date ?? ''));
  return ordered.map((session, i) => ({
    order: relativeOrderPhrase(i, ordered.length),
    reason: session.reason ? coarsenText(session.reason, session.counselor_name) : null,
    student_response: session.student_response ? coarsenText(session.student_response, session.counselor_name) : null,
    recommended_action: session.recommended_action ? coarsenText(session.recommended_action, session.counselor_name) : null,
  }));
}

export function renderSanitizedSessions(sessions: SanitizedSession[]): string {
  return sessions.map((s, i) => {
    const lines = [`Session ${i + 1} (${s.order}):`];
    if (s.reason) lines.push(`  Reason for contact: ${s.reason}`);
    if (s.student_response) lines.push(`  Notes: ${s.student_response}`);
    if (s.recommended_action) lines.push(`  Action taken: ${s.recommended_action}`);
    return lines.join('\n');
  }).join('\n\n');
}
