// =============================================================================
//  PsychE V11 — Formal Reports (presentational)
//
//  Lists past PsychE_Sanitized_Session_Reports for a student. Generation
//  itself is NOT triggered here — it's part of the existing "Generate Report"
//  modal on the profile header (Raw vs Formal), so there's one place a
//  counsellor learns, not a second composer duplicating that flow. This tab
//  is purely history: browse what's already been written, open one to print.
// =============================================================================

import React from 'react';
import { Printer, FileText } from 'lucide-react';
import type { SanitizedSessionReport } from '../types';

export interface FormalReportsPanelProps {
  reports: SanitizedSessionReport[];
  loading?: boolean;
  error?: string | null;
  onOpenReport: (report: SanitizedSessionReport) => void;
}

export const FormalReportsPanel: React.FC<FormalReportsPanelProps> = ({
  reports, loading = false, error = null, onOpenReport
}) => {
  if (loading) return <p className="mini-note-empty">Loading formal reports…</p>;
  if (error) return <p className="mini-note-error">Could not load formal reports: {error}</p>;

  if (reports.length === 0) {
    return (
      <p className="mini-note-empty">
        No formal reports yet. Use "Generate Report" above and choose Formal to create one.
      </p>
    );
  }

  return (
    <div className="formal-reports-list no-print">
      {reports.map((r) => (
        <button
          key={r.id}
          type="button"
          className="formal-report-row"
          onClick={() => onOpenReport(r)}
        >
          <div className="formal-report-row-head">
            <span className="formal-report-row-date">
              <FileText size={13} />
              {new Date(r.generated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="formal-report-row-meta">
              {r.session_ids.length} session{r.session_ids.length === 1 ? '' : 's'}
              {r.included_telemetry ? ' · telemetry' : ''}
              {r.included_summary ? ' · AI summary' : ''}
            </span>
          </div>
          <p className="formal-report-row-preview">
            {r.report_text.length > 180 ? `${r.report_text.slice(0, 180)}…` : r.report_text}
          </p>
          <span className="formal-report-row-action"><Printer size={12} /> Open &amp; print</span>
        </button>
      ))}
    </div>
  );
};
