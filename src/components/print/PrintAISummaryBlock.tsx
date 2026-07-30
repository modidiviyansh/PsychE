// =============================================================================
//  PsychE V12 — PrintAISummaryBlock
//
//  Same derivation AISummaryCard.tsx already does (crisp theme + 2-sentence
//  summary + key concern + immediate action from the cached PsychE_AI_Reports
//  row) — just plain print styling instead of the dark `.ai-summary-card`
//  CSS, and placed at the TOP of an export per the source instruction: "pick
//  up the quick AI summary and put it at the top of the report".
// =============================================================================

import React from 'react';
import type { AIReportContent } from '../../types';

function truncateSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return sentences.slice(0, maxSentences).join(' ').trim();
}

export interface PrintAISummaryBlockProps {
  report: AIReportContent;
}

export const PrintAISummaryBlock: React.FC<PrintAISummaryBlockProps> = ({ report }) => {
  const crisp = truncateSentences(report.clinical_summary, 2);
  const keyConcern = truncateSentences(report.tension_narrative, 1);
  const immediateAction = report.ground_level_suggestions[0]?.action_item ?? null;

  return (
    <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#f9f9f9', border: '1px solid #ddd', pageBreakInside: 'avoid' }}>
      <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>AI Summary — {report.dominant_theme}</h2>
      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', lineHeight: '1.5' }}>{crisp}</p>
      <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem' }}><strong>Key concern:</strong> {keyConcern}</p>
      {immediateAction && (
        <p style={{ margin: 0, fontSize: '0.85rem' }}><strong>Immediate action:</strong> {immediateAction}</p>
      )}
    </div>
  );
};
