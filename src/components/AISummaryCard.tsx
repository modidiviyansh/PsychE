// =============================================================================
//  PsychE V11 — AI Summary (presentational)
//
//  The "AI Summary" tab, per Task 3.1/3.2 of the V11 spec. Deliberately NOT a
//  separate LLM call: the spec offered that as an option, but deriving it by
//  truncating the already-fetched AIReportContent is strictly better here —
//  zero extra cost, zero extra latency, and it can never drift out of sync
//  with the full "AI Technical Suggestions" tab, since it's the same data.
//  The Model Choice Router's 'summary' branch exists for if that ever changes.
// =============================================================================

import React from 'react';
import type { AIReport } from '../types';
import { age } from './MiniNotes';

/** Coarse, not a real sentence tokenizer — good enough for "first N sentences of model prose". */
function truncateSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

export interface AISummaryCardProps {
  report: AIReport | null;
  loading?: boolean;
  loadError?: string | null;
}

export const AISummaryCard: React.FC<AISummaryCardProps> = ({ report, loading = false, loadError = null }) => {
  if (loading) return <p className="mini-note-empty">Loading summary…</p>;
  if (loadError) return <p className="mini-note-error">Could not load summary: {loadError}</p>;
  if (!report) {
    return (
      <p className="mini-note-empty">
        No AI summary yet — generate a report on the "AI Technical Suggestions" tab first.
      </p>
    );
  }

  const crisp = truncateSentences(report.report.clinical_summary, 2);
  const keyConcern = truncateSentences(report.report.tension_narrative, 1);
  const immediateAction = report.report.ground_level_suggestions[0]?.action_item ?? null;

  return (
    <div className="ai-summary-card no-print">
      <div className="ai-summary-head">
        <h4 className="ai-summary-theme">{report.report.dominant_theme}</h4>
        <span className="ai-summary-age">
          {report.generation_source === 'cron' ? 'Nightly batch' : 'On demand'} · {age(report.generated_at)}
        </span>
      </div>

      <p className="ai-summary-crisp">{crisp}</p>

      <ul className="ai-summary-bullets">
        <li><strong>Key concern:</strong> {keyConcern}</li>
        {immediateAction && <li><strong>Immediate action:</strong> {immediateAction}</li>}
      </ul>
    </div>
  );
};
