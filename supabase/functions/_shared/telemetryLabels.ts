// =============================================================================
//  Shared telemetry banding — turns raw PsychE_Student_Telemetry numbers into
//  the qualitative labels that are actually safe to hand an LLM. Used by
//  generate-ai-report only. formalize-sessions (V12) never imports this file —
//  no telemetry of any kind enters that function's prompt; the printable
//  telemetry export (src/components/print/PrintTelemetryBlock.tsx) is a
//  separate, frontend-only rendering of the raw numbers, built after this
//  banding was ruled out of scope for the Formal Timeline.
//
//  Nothing past buildTelemetrySummary should read metrics_payload again — if a
//  number is needed in a prompt, it should have been banded here first.
// =============================================================================

export const DOMAIN_LABELS: Record<string, string> = {
  BHV: 'Behavioural Regulation',
  SOC: 'Peer & Social Connection',
  COG: 'Cognitive Problem Solving',
  EMH: 'Emotional Stability Baseline',
  FAM: 'Family Dynamics Index',
  CAR: 'Career Direction',
  SEL: 'Self & Identity',
};

export function domainBand(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'No data yet';
  if (v >= 0.75) return 'Strong';
  if (v >= 0.55) return 'Adequate';
  if (v >= 0.35) return 'Strained';
  return 'Concerning';
}

export function tensionBand(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Not measurable yet';
  const mag = Math.abs(v);
  if (mag < 0.15) return 'Balanced';
  if (mag < 0.3) return 'Mild imbalance';
  if (mag < 0.5) return 'Moderate imbalance';
  return 'Pronounced imbalance';
}

export function etiBand(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Not enough session history';
  if (v >= 75) return 'Highly engaged';
  if (v >= 50) return 'Engaged';
  if (v >= 25) return 'Inconsistent engagement';
  return 'Disengaging';
}

export function concernBand(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Not enough data';
  if (v < 30) return 'Low concern';
  if (v < 50) return 'Watch';
  if (v < 70) return 'Elevated concern';
  return 'High concern';
}

export function confidenceBand(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Unknown';
  if (v >= 0.75) return 'High';
  if (v >= 0.4) return 'Moderate';
  return 'Low';
}

export interface TelemetrySummary {
  archetype: string;
  risk_level: string;
  course_type: string | null;
  engine_status: string;
  session_count: number;
  domain_bands: Record<string, string>;
  dominant_tension: { domains: string; band: string } | null;
  engagement_band: string;
  avoidance_flag: boolean;
  concern_band: string;
  concern_confidence: string;
}

export function buildTelemetrySummary(
  student: { risk_level: string | null; course: string | null },
  metricsPayload: Record<string, any> | null,
  etiData: Record<string, any> | null,
  compositeData: Record<string, any> | null,
  engineStatus: string
): TelemetrySummary {
  const domainScores = metricsPayload?.domain_scores ?? {};
  const domainBands: Record<string, string> = {};
  for (const code of Object.keys(DOMAIN_LABELS)) {
    domainBands[DOMAIN_LABELS[code]] = domainBand(domainScores[code]);
  }

  const dominant = metricsPayload?.tensions?.dominant_tension;
  let dominantTension: TelemetrySummary['dominant_tension'] = null;
  if (dominant?.pair) {
    const [a, b] = String(dominant.pair).split('_');
    const labelA = DOMAIN_LABELS[a] ?? a;
    const labelB = DOMAIN_LABELS[b] ?? b;
    dominantTension = { domains: `${labelA} vs ${labelB}`, band: tensionBand(dominant.value) };
  }

  return {
    archetype: metricsPayload?.archetype ?? 'Pending Baseline Assessment',
    risk_level: student.risk_level ?? 'Low',
    course_type: student.course ?? null,
    engine_status: engineStatus,
    session_count: metricsPayload?.session_count ?? 0,
    domain_bands: domainBands,
    dominant_tension: dominantTension,
    engagement_band: etiBand(etiData?.eti),
    avoidance_flag: Boolean(etiData?.avoidance_flag),
    concern_band: concernBand(compositeData?.composite_score),
    concern_confidence: confidenceBand(compositeData?.composite_confidence),
  };
}

/** Plain-text rendering of a TelemetrySummary, for embedding in a prompt. */
export function renderTelemetrySummary(summary: TelemetrySummary): string {
  return `Data maturity: ${summary.engine_status} (${summary.session_count} sessions with recorded assessment data)
Recorded risk level: ${summary.risk_level}
Archetype (existing system classification): ${summary.archetype}

Domain bands (higher = stronger footing in that domain):
${Object.entries(summary.domain_bands).map(([label, band]) => `- ${label}: ${band}`).join('\n')}

Dominant tension: ${summary.dominant_tension ? `${summary.dominant_tension.domains} — ${summary.dominant_tension.band}` : 'None strong enough to register'}

Engagement: ${summary.engagement_band}${summary.avoidance_flag ? ' (avoidance pattern flagged — frequent no-shows relative to completed sessions)' : ''}

Overall concern level: ${summary.concern_band} (confidence in this read: ${summary.concern_confidence})`;
}
