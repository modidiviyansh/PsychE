// =============================================================================
//  Operational Day — pure shaping for the counsellor's homepage.
//
//  No Supabase, no React. Same contract as programmeHealth.ts: every function
//  is a pure transformation, so the day's arithmetic can be reasoned about
//  independently of how it is drawn.
//
//  TIMEZONE RULE — the whole point of this file
//  -------------------------------------------
//  "Today" is a LOCAL calendar concept. Postgres stores scheduled_date as DATE
//  (no zone) and follow_up_date / session_date as TIMESTAMPTZ (UTC on the wire),
//  so the two must be normalised differently or the school loses a day at either
//  end of the clock. Everything here funnels through dateKey(), which treats a
//  bare YYYY-MM-DD as already-local and converts anything with a time component
//  using local calendar components. Never compare these values with
//  new Date(a) < new Date(b) — that reintroduces the bug.
//
//  Note also that psyche_programme_health() buckets daily_throughput with
//  session_date::date, i.e. in the DATABASE's timezone (UTC on Supabase). That
//  is fine for a 14-day trend but is NOT accurate enough for "how many did I
//  complete today", which is why todaysCompleted is counted by its own query
//  against local day bounds. See ARCH_technical-specs.md §9.
// =============================================================================

// ---------------------------------------------------------------------------
//  Date primitives
// ---------------------------------------------------------------------------

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Local YYYY-MM-DD for a Date. Mirrors toLocalDateStr in lib/capacity.ts. */
export function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalise any date-ish value to a local YYYY-MM-DD key.
 *
 * A bare `2026-07-30` is a zoneless DATE column and is returned untouched —
 * running it through `new Date()` would parse it as UTC midnight and shift it
 * backwards a day in every negative-offset timezone.
 */
export function dateKey(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  if (typeof v === 'string') {
    if (DATE_ONLY.test(v)) return v;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : localKey(d);
  }
  return isNaN(v.getTime()) ? null : localKey(v);
}

/** Local calendar today. */
export function todayKey(now: Date = new Date()): string {
  return localKey(now);
}

/**
 * Whole days from key `a` to key `b` (negative when `a` is later).
 * Anchored at UTC noon so a DST transition can never round to ±1.
 */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Local bounds of a day, as ISO strings for a Supabase range filter. */
export function localDayBounds(now: Date = new Date()): { start: string; end: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ---------------------------------------------------------------------------
//  Row shapes — the minimum each panel needs, nothing more
// ---------------------------------------------------------------------------

export interface ScheduledRow {
  id: string;
  reason: string;
  scheduled_date: string | null;
  student_uuid: string;
  student_name: string;
  student_sid: string | null;
  risk_level: string | null;
}

export interface FollowUpRow {
  id: string;
  reason: string;
  follow_up_date: string;
  student_uuid: string;
  student_name: string;
  student_sid: string | null;
}

/** A scheduled row carrying its position relative to today. */
export type DatedRow<T> = T & { dayKey: string | null; daysLate: number };

// ---------------------------------------------------------------------------
//  Bucketing
// ---------------------------------------------------------------------------

export interface ScheduledBuckets {
  today: DatedRow<ScheduledRow>[];
  overdue: DatedRow<ScheduledRow>[];
  ahead: DatedRow<ScheduledRow>[];
  /** Scheduled with no date at all — invisible work, so it is surfaced, not dropped. */
  undated: DatedRow<ScheduledRow>[];
}

/**
 * Split open Scheduled sessions into today / late / ahead / undated.
 * Late rows sort most-overdue first; ahead rows sort soonest first.
 */
export function bucketScheduled(rows: ScheduledRow[], now: Date = new Date()): ScheduledBuckets {
  const t = todayKey(now);
  const out: ScheduledBuckets = { today: [], overdue: [], ahead: [], undated: [] };

  for (const r of rows) {
    const k = dateKey(r.scheduled_date);
    const row = { ...r, dayKey: k, daysLate: k ? daysBetween(k, t) : 0 };
    if (!k) out.undated.push(row);
    else if (k === t) out.today.push(row);
    else if (k < t) out.overdue.push(row);
    else out.ahead.push(row);
  }

  out.overdue.sort((a, b) => b.daysLate - a.daysLate);
  out.ahead.sort((a, b) => (a.dayKey! < b.dayKey! ? -1 : 1));
  out.today.sort((a, b) => a.student_name.localeCompare(b.student_name));
  return out;
}

export interface FollowUpBuckets {
  overdue: DatedRow<FollowUpRow>[];
  today: DatedRow<FollowUpRow>[];
  /** Due inside the next `soonDays` days. */
  soon: DatedRow<FollowUpRow>[];
}

/**
 * Split outstanding follow-ups the same way.
 *
 * Callers must pass only rows with a non-null follow_up_date: a Pending status
 * with a NULL date is the column DEFAULT firing, not a real commitment (v7_2).
 */
export function bucketFollowUps(
  rows: FollowUpRow[],
  soonDays = 7,
  now: Date = new Date()
): FollowUpBuckets {
  const t = todayKey(now);
  const out: FollowUpBuckets = { overdue: [], today: [], soon: [] };

  for (const r of rows) {
    const k = dateKey(r.follow_up_date);
    if (!k) continue;
    const row = { ...r, dayKey: k, daysLate: daysBetween(k, t) };
    if (k === t) out.today.push(row);
    else if (k < t) out.overdue.push(row);
    else if (daysBetween(t, k) <= soonDays) out.soon.push(row);
  }

  out.overdue.sort((a, b) => b.daysLate - a.daysLate);
  out.soon.sort((a, b) => (a.dayKey! < b.dayKey! ? -1 : 1));
  return out;
}

// ---------------------------------------------------------------------------
//  Pairing — one commitment must not be listed twice
// ---------------------------------------------------------------------------

/** The prefix AddLog.tsx writes on the Scheduled row it books for a follow-up. */
const FOLLOW_UP_PREFIX = /^\s*follow-?up\s+for\s*:\s*/i;

const norm = (s: string) => s.trim().toLowerCase();

/** Reason with a single "Follow-up for: " prefix removed, normalised for comparison. */
export function baseReason(reason: string): string {
  return norm(reason.replace(FOLLOW_UP_PREFIX, ''));
}

/**
 * Drop follow-up flags that already have a Scheduled session standing in for
 * them.
 *
 * When a follow-up date is entered, AddLog.tsx writes it in two places: the
 * origin log's follow_up_date, and a brand-new Scheduled row named
 * "Follow-up for: <origin reason>" on the same date. Both are the same
 * commitment, so listing both shows the counsellor duplicate work and inflates
 * every count derived from them.
 *
 * Matching is deliberately strict — same student, same date, same underlying
 * reason. Reason alone is not enough: a recurring concern legitimately produces
 * several commitments over time with identical wording, and collapsing those
 * would hide real work. Exactly one prefix is stripped, because the chain grows
 * by one each generation and stripping them all would merge distinct rounds of
 * follow-up into one.
 *
 * Note the date comparison assumes the viewer's clock shares the school's
 * timezone, which holds here (single school, IST): follow_up_date is a
 * TIMESTAMPTZ written from a date-only input, so it lands at UTC midnight and
 * resolves back to the intended local day at any non-negative offset.
 */
export function dedupeFollowUps(
  followUps: FollowUpRow[],
  scheduled: ScheduledRow[]
): FollowUpRow[] {
  const paired = new Set(
    scheduled
      .filter(s => FOLLOW_UP_PREFIX.test(s.reason))
      .map(s => `${s.student_uuid}|${dateKey(s.scheduled_date)}|${baseReason(s.reason)}`)
  );
  return followUps.filter(
    f => !paired.has(`${f.student_uuid}|${dateKey(f.follow_up_date)}|${norm(f.reason)}`)
  );
}

// ---------------------------------------------------------------------------
//  Today's load against capacity
// ---------------------------------------------------------------------------

export interface DayLoad {
  /** Still to be seen today. */
  booked: number;
  /** Already logged as Completed today. */
  completed: number;
  total: number;
  capacity: number;
  freeSlots: number;
  /** Slots committed beyond stated capacity, if any. */
  overBy: number;
  utilisationPct: number;
}

export function dayLoad(booked: number, completed: number, capacity: number): DayLoad {
  const total = booked + completed;
  const cap = Math.max(0, capacity);
  return {
    booked,
    completed,
    total,
    capacity: cap,
    freeSlots: Math.max(0, cap - total),
    overBy: Math.max(0, total - cap),
    utilisationPct: cap > 0 ? (total / cap) * 100 : 0
  };
}

// ---------------------------------------------------------------------------
//  Momentum
// ---------------------------------------------------------------------------

export interface MomentumPoint {
  day: string;
  /** Short axis label, e.g. "30 Jul". */
  label: string;
  completed: number;
  isToday: boolean;
}

export interface Momentum {
  series: MomentumPoint[];
  /** Sessions in the most recent half of the window. */
  recent: number;
  /** Sessions in the preceding half — the comparison baseline. */
  previous: number;
  /** Percentage change recent vs previous. Null when there is no baseline. */
  deltaPct: number | null;
  busiestDay: number;
  activeDays: number;
}

/**
 * Zero-filled trailing window of completed sessions.
 *
 * Zero-filling is not cosmetic: the RPC emits only days that had sessions, so
 * plotting it raw would silently compress idle days out of existence and make
 * a sparse fortnight look continuously busy.
 */
export function momentum(
  daily: { day: string; completed: number }[],
  days = 14,
  now: Date = new Date()
): Momentum {
  const byDay = new Map<string, number>();
  for (const d of daily) {
    const k = dateKey(d.day);
    if (k) byDay.set(k, (byDay.get(k) ?? 0) + Number(d.completed ?? 0));
  }

  const t = todayKey(now);
  const series: MomentumPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const k = localKey(d);
    series.push({
      day: k,
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      completed: byDay.get(k) ?? 0,
      isToday: k === t
    });
  }

  const half = Math.floor(days / 2);
  const sum = (a: MomentumPoint[]) => a.reduce((x, p) => x + p.completed, 0);
  const previous = sum(series.slice(0, half));
  const recent = sum(series.slice(half));

  return {
    series,
    recent,
    previous,
    deltaPct: previous > 0 ? ((recent - previous) / previous) * 100 : null,
    busiestDay: series.length ? Math.max(...series.map(p => p.completed)) : 0,
    activeDays: series.filter(p => p.completed > 0).length
  };
}

// ---------------------------------------------------------------------------
//  The focus line — one sentence naming the day's actual state
// ---------------------------------------------------------------------------

export type FocusTone = 'clear' | 'steady' | 'behind';

export interface FocusState {
  tone: FocusTone;
  /** Ordered fragments, most urgent first. Rendered as separated clauses. */
  parts: string[];
  headline: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Names what the day actually is. Deliberately refuses to congratulate: an
 * empty diary with people waiting is not a clear day, it is an idle one, and
 * conflating the two is how a dashboard stops being trusted.
 */
export function focusState(c: {
  todaySessions: number;
  overdueSessions: number;
  followUpsOverdue: number;
  followUpsToday: number;
  drifting: number;
}): FocusState {
  const parts: string[] = [];
  if (c.todaySessions > 0) parts.push(`${plural(c.todaySessions, 'session')} booked today`);
  if (c.overdueSessions > 0) {
    parts.push(c.overdueSessions === 1
      ? '1 session past its date'
      : `${c.overdueSessions} sessions past their date`);
  }
  if (c.followUpsOverdue > 0) parts.push(`${plural(c.followUpsOverdue, 'follow-up')} overdue`);
  if (c.followUpsToday > 0) parts.push(`${plural(c.followUpsToday, 'follow-up')} due today`);
  if (c.drifting > 0) parts.push(`${plural(c.drifting, 'student')} drifting`);

  const behind = c.overdueSessions > 0 || c.followUpsOverdue > 0;
  if (behind) return { tone: 'behind', parts, headline: 'Some commitments have slipped' };
  if (c.todaySessions > 0) return { tone: 'steady', parts, headline: 'Your day is set' };
  if (c.drifting > 0) return { tone: 'steady', parts, headline: 'Nothing booked — but students are waiting' };
  return { tone: 'clear', parts, headline: 'Nothing outstanding' };
}

/** Time-of-day greeting, local clock. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
