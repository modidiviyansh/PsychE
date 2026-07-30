// =============================================================================
//  PsychE V12 — PrintTelemetryBlock
//
//  A plain, print-styled rendering of the SAME numbers the in-app Telemetry
//  tab shows — NOT a reuse of TelemetryPanel.tsx's chart components, which
//  are recharts/CSS built for the dark in-app theme and render illegibly on
//  white paper. This is a fresh, simple representation: a table + CSS div
//  bars, matching ReportExport.tsx's own plain-inline-style print
//  conventions (which already print raw assessment percentages, so
//  quantitative values are an accepted pattern in this specific document
//  type — unlike the AI-prompt-facing rule, which forbids them).
// =============================================================================

import React from 'react';

const DOMAIN_LABELS: Record<string, string> = {
  BHV: 'Behavioural Regulation',
  SOC: 'Peer & Social Connection',
  COG: 'Cognitive Problem Solving',
  EMH: 'Emotional Stability Baseline',
  FAM: 'Family Dynamics Index',
  CAR: 'Career Direction',
  SEL: 'Self & Identity',
};

function Bar({ pct }: { pct: number }) {
  return (
    <div style={{ background: '#eee', borderRadius: '3px', height: '8px', width: '100%', overflow: 'hidden' }}>
      <div style={{ background: '#000', height: '100%', width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export interface PrintTelemetryBlockProps {
  metricsPayload: Record<string, any> | null;
  etiScore?: number | null;
  etiData?: Record<string, any> | null;
  compositeScore?: number | null;
  compositeConfidence?: number | null;
  rsiScore?: number | null;
  engineStatus?: string | null;
}

export const PrintTelemetryBlock: React.FC<PrintTelemetryBlockProps> = ({
  metricsPayload, etiScore, etiData, compositeScore, compositeConfidence, rsiScore, engineStatus,
}) => {
  const domainScores: Record<string, number | null> = metricsPayload?.domain_scores ?? {};
  const dominantTension = metricsPayload?.tensions?.dominant_tension;

  return (
    <div style={{ marginBottom: '2rem', pageBreakInside: 'avoid' }}>
      <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        Assessment Telemetry
      </h2>

      {metricsPayload?.archetype && (
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
          <strong>Archetype:</strong> {metricsPayload.archetype}
          {engineStatus && <span style={{ color: '#777' }}> · data maturity: {engineStatus}</span>}
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        <tbody>
          {Object.entries(DOMAIN_LABELS).map(([code, label]) => {
            const v = domainScores[code];
            const pct = v == null ? null : Math.round(v * 100);
            return (
              <tr key={code}>
                <td style={{ padding: '0.35rem 0.5rem 0.35rem 0', width: '40%', color: '#333' }}>{label}</td>
                <td style={{ padding: '0.35rem 0.5rem' }}>{pct == null ? <span style={{ color: '#999' }}>No data</span> : <Bar pct={pct} />}</td>
                <td style={{ padding: '0.35rem 0 0.35rem 0.5rem', textAlign: 'right', width: '50px' }}>{pct == null ? '—' : `${pct}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {dominantTension?.pair && (
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
          <strong>Dominant tension:</strong> {String(dominantTension.pair).replace('_', ' vs ')} ({dominantTension.value > 0 ? '+' : ''}{dominantTension.value?.toFixed(2)})
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <tbody>
          <tr>
            <td style={{ padding: '0.3rem 0.5rem 0.3rem 0', color: '#333' }}>Engagement (ETI)</td>
            <td style={{ padding: '0.3rem 0', textAlign: 'right' }}>{etiScore != null ? etiScore.toFixed(0) : '—'}</td>
          </tr>
          {etiData && (
            <tr>
              <td style={{ padding: '0.3rem 0.5rem 0.3rem 1rem', color: '#666', fontSize: '0.8rem' }}>
                Attendance {etiData.attendance_ratio ?? '—'}% · Follow-through {etiData.follow_through_ratio ?? '—'}% · Recency {etiData.recency_factor ?? '—'}%
                {etiData.avoidance_flag ? ' · Avoidance pattern flagged' : ''}
              </td>
              <td></td>
            </tr>
          )}
          <tr>
            <td style={{ padding: '0.3rem 0.5rem 0.3rem 0', color: '#333' }}>Composite Score</td>
            <td style={{ padding: '0.3rem 0', textAlign: 'right' }}>
              {compositeScore != null ? compositeScore.toFixed(0) : '—'}
              {compositeConfidence != null && <span style={{ color: '#777', fontSize: '0.8rem' }}> (confidence {(compositeConfidence * 100).toFixed(0)}%)</span>}
            </td>
          </tr>
          {rsiScore != null && (
            <tr>
              <td style={{ padding: '0.3rem 0.5rem 0.3rem 0', color: '#333' }}>Relative Scoring Index</td>
              <td style={{ padding: '0.3rem 0', textAlign: 'right' }}>{rsiScore.toFixed(0)}th percentile among peers</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
