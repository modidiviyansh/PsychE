// =============================================================================
//  PsychE V10 — AI Technical Report (presentational)
//
//  Pure props-in component, same contract as MiniNotes.tsx: no Supabase calls
//  live here — StudentProfile.tsx owns fetching and invoking the Edge
//  Function. This file only renders whatever it's handed.
//
//  The report itself is written by an LLM from structured telemetry bands
//  only (see supabase/functions/generate-ai-report) — never from raw session
//  notes or logs. trajectory_delta is always "insufficient_data" in this
//  version: longitudinal drift is a deliberately separate, not-yet-built
//  phase, so the chip here stays neutral rather than borrowing the app's
//  red/amber/green risk colours for something that isn't actually computed.
// =============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Copy, Check, AlertTriangle, Clock, GraduationCap, UserCog } from 'lucide-react';
import type { AIReport, GroundLevelSuggestion } from '../types';
import { age } from './MiniNotes';

const CATEGORY_META: Record<GroundLevelSuggestion['category'], { label: string; pill: string; Icon: typeof GraduationCap }> = {
  'Classroom & Academic': { label: 'Classroom & Academic', pill: 'pill--blue', Icon: GraduationCap },
  'Counselor Intervention': { label: 'Counsellor Intervention', pill: 'pill--purple', Icon: UserCog },
};

export interface AIReportPanelProps {
  report: AIReport | null;
  loading?: boolean;
  loadError?: string | null;
  generating?: boolean;
  generateError?: string | null;
  insufficientData?: boolean;
  cooldownActive?: boolean;
  cooldownEndsAt?: string | null;
  onGenerate: () => void;
}

export const AIReportPanel: React.FC<AIReportPanelProps> = ({
  report, loading = false, loadError = null, generating = false, generateError = null,
  insufficientData = false, cooldownActive = false, cooldownEndsAt = null, onGenerate
}) => {
  const [copied, setCopied] = useState(false);

  const copyQuestions = async () => {
    if (!report) return;
    const text = report.report.next_session_questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied or unavailable — nothing to recover into,
      // the questions are still visible on screen to copy by hand.
    }
  };

  return (
    <div className="no-print">
      <div className="flex justify-between items-center mb-3 mobile-stack mobile-stack-start" style={{ gap: '0.5rem' }}>
        <h3 className="text-h3 flex items-center gap-2" style={{ fontSize: '1rem' }}>
          <Sparkles size={16} className="text-muted" /> AI Technical Report
        </h3>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.78rem' }}
          disabled={generating}
          onClick={onGenerate}
        >
          <Sparkles size={13} />
          {generating ? 'Generating…' : report ? 'Regenerate' : 'Generate Report'}
        </button>
      </div>

      <p className="text-muted mb-4" style={{ fontSize: '0.78rem' }}>
        Synthesised from this student's assessment scores and engagement pattern only — never
        from session notes or log text.
      </p>

      {loadError && <p className="mini-note-error mb-4">Could not load the report: {loadError}</p>}
      {generateError && <p className="mini-note-error mb-4">{generateError}</p>}

      {insufficientData && (
        <div className="ai-report-notice">
          <AlertTriangle size={14} />
          Not enough session history yet to write a meaningful report. This becomes available once
          there are at least two completed sessions with recorded assessment responses.
        </div>
      )}

      {cooldownActive && (
        <div className="ai-report-notice">
          <Clock size={14} />
          Already regenerated recently
          {cooldownEndsAt ? ` — next regeneration available ${new Date(cooldownEndsAt).toLocaleString()}` : ''}.
        </div>
      )}

      {loading ? (
        <p className="mini-note-empty">Loading report…</p>
      ) : !report && !insufficientData ? (
        <p className="mini-note-empty">
          No AI report yet. Generate one once there's enough session history for it to draw on.
        </p>
      ) : report ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ai-report">
          <div className="ai-report-head">
            <h4 className="ai-report-theme">{report.report.dominant_theme}</h4>
            <span className="ai-report-generated">
              {report.generation_source === 'cron' ? 'Nightly batch' : 'On demand'} · {age(report.generated_at)}
            </span>
          </div>

          <p className="ai-report-summary">{report.report.clinical_summary}</p>

          <div className="ai-report-block">
            <span className="ai-report-block-label">Tension</span>
            <p>{report.report.tension_narrative}</p>
          </div>

          <div className="ai-report-block">
            <span className="ai-report-block-label">Engagement</span>
            <p>{report.report.engagement_narrative}</p>
          </div>

          <div className="ai-report-trajectory">
            <span className="pill pill--muted">Trend: not yet available</span>
            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
              {report.report.trajectory_delta.change_narrative}
            </span>
          </div>

          <div className="ai-report-questions">
            <div className="flex justify-between items-center mb-2">
              <span className="ai-report-block-label">Next session questions</span>
              <button type="button" className="ai-report-copy" onClick={copyQuestions}>
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy all</>}
              </button>
            </div>
            <ol>
              {report.report.next_session_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>

          <div className="ai-report-suggestions">
            {report.report.ground_level_suggestions.map((s, i) => {
              const meta = CATEGORY_META[s.category] ?? CATEGORY_META['Counselor Intervention'];
              const { Icon } = meta;
              return (
                <div key={i} className="ai-report-suggestion">
                  <span className={`pill ${meta.pill} mb-2`} style={{ display: 'inline-flex' }}>
                    <Icon size={12} /> {meta.label}
                  </span>
                  <p className="ai-report-suggestion-action">{s.action_item}</p>
                  <p className="ai-report-suggestion-rationale">{s.rationale}</p>
                  <p className="ai-report-suggestion-term">{s.clinical_term}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
};
