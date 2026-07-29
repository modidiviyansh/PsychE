// =============================================================================
//  Programme Health — pure analytics for the school-wide admin view
//
//  No Supabase, no React. Every function here is a pure transformation of the
//  payload returned by psyche_programme_health(), so the mathematics can be
//  reasoned about (and corrected) independently of how it is drawn.
//
//  MEASURED vs MODELLED — the governing distinction
//  ------------------------------------------------
//  Anything derived from `daily_session_capacity` is an ASSUMPTION the
//  counsellor self-reported, not an observation. Those functions are grouped
//  under "modelled" below and their outputs must be labelled as such in the UI.
//  Everything under "measured" is true regardless of that setting — so a wrong
//  capacity value can mislabel headroom but can never corrupt the allocation
//  picture. See ARCH_technical-specs.md §9.
// =============================================================================

export interface StudentRollup {
  student_uuid: string;
  student_id: string | null;
  full_name: string | null;
  course: string | null;
  risk_level: string | null;
  sessions_completed: number;
  sessions_no_show: number;
  last_session_date: string | null;
  first_session_date: string | null;
  days_since_contact: number | null;
  composite_score: number | null;
  composite_confidence: number | null;
  engine_status: string | null;
}

export interface ProgrammeHealthPayload {
  generated_at: string;
  window_days: number;
  daily_session_capacity: number | null;
  students: StudentRollup[];
  daily_throughput: { day: string; completed: number }[];
  integrity: {
    draft_logs: number;
    open_scheduled: number;
    overdue_scheduled: number;
    total_logs: number;
    followups_open: number;
    followups_overdue: number;
    phantom_pending: number;
    distinct_counsellor_names: number;
  };
}

// ---------------------------------------------------------------------------
//  Planning assumptions. These are NOT stored in the database (no new columns),
//  so they live here as named constants and must be shown in the UI wherever
//  they influence a figure. Confirmed with the school 2026-07-29.
// ---------------------------------------------------------------------------

/** 200 working days/year across 2 terms. */
export const WORKING_DAYS_PER_TERM = 100;
/** Minimum acceptable standard: every student seen at least once per term. */
export const TARGET_CONTACTS_PER_TERM = 1;
/** Planned population at full rollout (pilot is far smaller). */
export const PLANNED_ENROLMENT = 400;
/** Used only when there is not yet enough data to observe real depth. */
export const FALLBACK_DEPTH = 4.7;
/**
 * Minimum pairs before a need–service rank correlation is reported at all.
 * Matches the RSI cohort floor for the same reason: below this, the statistic
 * is noise that reads like a finding.
 */
export const MIN_ALIGNMENT_N = 8;

// ===========================================================================
//  MEASURED — independent of daily_session_capacity
// ===========================================================================

/**
 * Gini coefficient of a non-negative distribution.
 * 0 = perfectly equal, →1 = one member holds everything.
 * Returns null when there is nothing to measure (no members, or zero total).
 */
export function gini(values: number[]): number | null {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  const total = v.reduce((a, b) => a + b, 0);
  if (n === 0 || total === 0) return null;
  let weighted = 0;
  for (let i = 0; i < n; i++) weighted += (2 * (i + 1) - n - 1) * v[i];
  return weighted / (n * total);
}

/** Lorenz curve points, cumulative population share → cumulative resource share. */
export function lorenzCurve(values: number[]): { pop: number; share: number }[] {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  const total = v.reduce((a, b) => a + b, 0);
  if (n === 0 || total === 0) return [{ pop: 0, share: 0 }, { pop: 100, share: 100 }];
  const pts = [{ pop: 0, share: 0 }];
  let cum = 0;
  v.forEach((x, i) => {
    cum += x;
    pts.push({ pop: ((i + 1) / n) * 100, share: (cum / total) * 100 });
  });
  return pts;
}

export interface AllocationSummary {
  totalSessions: number;
  studentCount: number;
  everSeen: number;
  neverSeen: number;
  /** Reach inequality — includes never-seen students as zeros. */
  giniAll: number | null;
  /** Depth inequality — only among students who have been seen at least once. */
  giniSeen: number | null;
  topStudentSharePct: number | null;
  /** Share of all sessions consumed by the busiest decile of students. */
  topDecileSharePct: number | null;
  meanSessionsPerSeen: number | null;
  lorenzAll: { pop: number; share: number }[];
}

export function allocationSummary(students: StudentRollup[]): AllocationSummary {
  const counts = students.map(s => s.sessions_completed ?? 0);
  const seen = counts.filter(c => c > 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const sorted = [...counts].sort((a, b) => b - a);
  const decileN = Math.max(1, Math.round(counts.length * 0.1));
  const topDecile = sorted.slice(0, decileN).reduce((a, b) => a + b, 0);
  return {
    totalSessions: total,
    studentCount: counts.length,
    everSeen: seen.length,
    neverSeen: counts.length - seen.length,
    giniAll: gini(counts),
    giniSeen: gini(seen),
    topStudentSharePct: total > 0 ? (sorted[0] / total) * 100 : null,
    topDecileSharePct: total > 0 ? (topDecile / total) * 100 : null,
    meanSessionsPerSeen: seen.length ? total / seen.length : null,
    lorenzAll: lorenzCurve(counts)
  };
}

/** Recency of contact, bucketed. `never` is kept distinct from "a long time ago". */
export function recencyBuckets(students: StudentRollup[]) {
  const b = { never: 0, within30: 0, d31to60: 0, d61to90: 0, over90: 0 };
  for (const s of students) {
    const d = s.days_since_contact;
    if (d == null) b.never++;
    else if (d <= 30) b.within30++;
    else if (d <= 60) b.d31to60++;
    else if (d <= 90) b.d61to90++;
    else b.over90++;
  }
  return b;
}

/**
 * Spearman rank correlation between measured need and sessions received.
 *
 * ⚠ CONFOUNDED BY REVERSE CAUSALITY. Effective counselling lowers composite,
 * so a student who was helped looks low-need now. A weak or negative value is
 * therefore NOT evidence of poor triage on its own. Anchoring properly needs
 * need-at-referral (first assessment), which requires assessment volume the
 * school does not yet have. Report with that caveat attached, always.
 *
 * Only students with a trustworthy composite are included.
 */
export function needAlignment(
  students: StudentRollup[],
  minConfidence: number
): { rho: number | null; n: number; minRequired: number } {
  const pairs = students
    .filter(s => s.composite_score != null && (s.composite_confidence ?? 0) >= minConfidence)
    .map(s => ({ need: s.composite_score as number, sessions: s.sessions_completed ?? 0 }));
  const n = pairs.length;
  // A rank correlation over 3–4 points is noise that reads like a finding: a
  // spurious negative rho would tell an admin their triage is inverted. Same
  // n >= 8 floor the RSI cohort rule uses, for the same reason.
  if (n < MIN_ALIGNMENT_N) return { rho: null, n, minRequired: MIN_ALIGNMENT_N };

  const rank = (vals: number[]) => {
    const idx = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(vals.length);
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
      const avg = (i + j) / 2 + 1;              // average rank for ties
      for (let k = i; k <= j; k++) r[idx[k].i] = avg;
      i = j + 1;
    }
    return r;
  };

  const rn = rank(pairs.map(p => p.need));
  const rs = rank(pairs.map(p => p.sessions));
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const mn = mean(rn), ms = mean(rs);
  let num = 0, dn = 0, ds = 0;
  for (let i = 0; i < n; i++) {
    num += (rn[i] - mn) * (rs[i] - ms);
    dn += (rn[i] - mn) ** 2;
    ds += (rs[i] - ms) ** 2;
  }
  // Zero variance on either side (e.g. every student has identical session
  // counts) leaves the correlation undefined rather than zero.
  if (dn === 0 || ds === 0) return { rho: null, n, minRequired: MIN_ALIGNMENT_N };
  return { rho: num / Math.sqrt(dn * ds), n, minRequired: MIN_ALIGNMENT_N };
}

/**
 * Triage list: students carrying measured need who have not been seen recently.
 * Sorted by need descending, then by staleness. Never-contacted students with
 * a composite are included with days = null and sort first on staleness.
 */
export function underServed(students: StudentRollup[], minConfidence: number, minDays = 30) {
  return students
    .filter(s =>
      s.composite_score != null &&
      (s.composite_confidence ?? 0) >= minConfidence &&
      (s.days_since_contact == null || s.days_since_contact >= minDays))
    .sort((a, b) =>
      (b.composite_score as number) - (a.composite_score as number) ||
      (b.days_since_contact ?? 1e9) - (a.days_since_contact ?? 1e9));
}

/** Observed throughput. Days far above capacity indicate bulk entry, not clinical work. */
export function throughputSummary(
  daily: { day: string; completed: number }[],
  assumedCapacity: number | null
) {
  const counts = daily.map(d => d.completed);
  const total = counts.reduce((a, b) => a + b, 0);
  const activeDays = counts.length;
  const busiest = counts.length ? Math.max(...counts) : 0;
  return {
    total,
    activeDays,
    busiestDay: busiest,
    meanPerActiveDay: activeDays ? total / activeDays : null,
    /** True when a single day exceeds stated capacity — almost certainly backdated bulk entry. */
    suspectedBulkEntry: assumedCapacity != null && busiest > assumedCapacity,
    daysAboveCapacity: assumedCapacity != null ? counts.filter(c => c > assumedCapacity).length : 0
  };
}

// ===========================================================================
//  MODELLED — depends on the self-reported daily_session_capacity assumption.
//  Every output of this section must be rendered with the assumption visible.
// ===========================================================================

export interface FeasibilityInput {
  capacityPerDay: number;
  workingDaysPerTerm: number;
  studentCount: number;
  /** Target contacts per student per term (the universal baseline). */
  targetContactsPerTerm: number;
  /** Observed sessions consumed by an engaged student per term. */
  observedDepth: number;
}

export interface FeasibilityResult {
  capacityPerTerm: number;
  universalCost: number;
  universalFeasible: boolean;
  universalUtilisationPct: number;
  sessionsPerStudentPerTerm: number;
  /** Total sessions if EVERY student received the observed depth. */
  fullDepthDemand: number;
  fullDepthUtilisationPct: number;
  /** Students who can receive full depth once everyone has the baseline. */
  deepSupportCapacity: number;
  /** Population at which capacity begins to bind, at observed depth. */
  bindingPopulation: number;
  /** Capacity/day required to give every student the observed depth. */
  requiredCapacityForFullDepth: number;
}

export function feasibility(i: FeasibilityInput): FeasibilityResult {
  const capacityPerTerm = i.capacityPerDay * i.workingDaysPerTerm;
  const universalCost = i.studentCount * i.targetContactsPerTerm;
  const fullDepthDemand = i.studentCount * i.observedDepth;
  const extraPerDeepStudent = Math.max(0, i.observedDepth - i.targetContactsPerTerm);
  const surplus = capacityPerTerm - universalCost;

  return {
    capacityPerTerm,
    universalCost,
    universalFeasible: capacityPerTerm >= universalCost,
    universalUtilisationPct: capacityPerTerm > 0 ? (universalCost / capacityPerTerm) * 100 : 0,
    sessionsPerStudentPerTerm: i.studentCount > 0 ? capacityPerTerm / i.studentCount : 0,
    fullDepthDemand,
    fullDepthUtilisationPct: capacityPerTerm > 0 ? (fullDepthDemand / capacityPerTerm) * 100 : 0,
    deepSupportCapacity: extraPerDeepStudent > 0
      ? Math.max(0, Math.floor(surplus / extraPerDeepStudent))
      : i.studentCount,
    bindingPopulation: i.observedDepth > 0 ? Math.floor(capacityPerTerm / i.observedDepth) : Infinity,
    requiredCapacityForFullDepth: i.workingDaysPerTerm > 0
      ? fullDepthDemand / i.workingDaysPerTerm
      : 0
  };
}

/** Frontier: how many students can get depth `s`, once everyone has the baseline. */
export function depthFrontier(
  capacityPerTerm: number, studentCount: number, baseline: number, depths: number[]
) {
  const surplus = capacityPerTerm - studentCount * baseline;
  return depths.map(s => ({
    depth: s,
    students: s > baseline
      ? Math.max(0, Math.min(studentCount, Math.floor(surplus / (s - baseline))))
      : studentCount
  }));
}
