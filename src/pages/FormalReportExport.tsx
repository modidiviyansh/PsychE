// =============================================================================
//  PsychE V11 — Formal Report print view
//
//  Counterpart to ReportExport.tsx (the raw statement), same print
//  conventions (serif, black-on-white, auto-print). Renders an ALREADY
//  GENERATED PsychE_Sanitized_Session_Reports row by id — this page never
//  triggers generation itself, so re-opening a past report from the Formal
//  Reports tab and printing a freshly-generated one both go through the same
//  single code path.
//
//  Unlike the LLM payload, this page is allowed to show the student's real
//  name — it renders on the counsellor's own screen, the same as the raw
//  statement does. The no-PII rule applies to what left the building for the
//  LLM call, not to what a counsellor sees of their own student.
// =============================================================================

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Printer, ArrowLeft } from 'lucide-react';
import type { SanitizedSessionReport } from '../types';

export const FormalReportExport: React.FC = () => {
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('reportId');
  const studentId = searchParams.get('studentId');
  const navigate = useNavigate();

  const [student, setStudent] = useState<any>(null);
  const [report, setReport] = useState<SanitizedSessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!reportId || !studentId) { setLoading(false); return; }
      try {
        const [{ data: sData, error: sErr }, { data: rData, error: rErr }] = await Promise.all([
          supabase.from('PsychE_Students').select('*').eq('id', studentId).single(),
          supabase.from('PsychE_Sanitized_Session_Reports')
            .select('id, student_uuid, session_ids, report_text, report_jsonb, included_telemetry, included_summary, model_used, generated_at')
            .eq('id', reportId).single(),
        ]);
        if (sErr) throw sErr;
        if (rErr) throw rErr;
        setStudent(sData);
        setReport(rData as SanitizedSessionReport);
      } catch (err: any) {
        setError(err.message ?? 'Failed to load report');
      } finally {
        setLoading(false);
        setTimeout(() => window.print(), 500);
      }
    }
    fetchData();
  }, [reportId, studentId]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading report...</div>;
  if (error || !student || !report) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Report not found or invalid parameters.</div>;
  }

  const paragraphs = report.report_text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div style={{ backgroundColor: '#fff', color: '#000', minHeight: '100vh', padding: '2rem' }}>
      <div className="no-print" style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> Back
        </button>
        <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
          <Printer size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> Print Report
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'serif' }}>
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>UPsych : GCM Edition Formal Report</h1>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: '#555' }}>AI-Synthesised Session Summary</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
            <p style={{ margin: 0 }}><strong>Generated:</strong> {new Date(report.generated_at).toLocaleDateString()}</p>
            <p style={{ margin: '0.25rem 0 0 0' }}>
              <strong>Sessions covered:</strong> {report.session_ids.length}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Student Name:</strong> {student.full_name}</p>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Student ID:</strong> {student.student_id}</p>
            <p style={{ margin: 0 }}><strong>Course/Grade:</strong> {student.course}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              <strong>Includes telemetry context:</strong> {report.included_telemetry ? 'Yes' : 'No'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Includes AI summary context:</strong> {report.included_summary ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
          Session Report
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem', lineHeight: '1.7' }}>
          {paragraphs.map((p, i) => <p key={i} style={{ margin: 0 }}>{p}</p>)}
        </div>

        <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '2px solid #000', textAlign: 'center', fontSize: '0.875rem', color: '#777' }}>
          <p style={{ margin: 0 }}>
            This report was synthesised by AI from redacted session data. It supplements, and does not
            replace, the counsellor's own clinical judgement.
          </p>
          <p style={{ margin: '0.25rem 0 0 0' }}>UPsych : GCM Edition • Confidential Record</p>
        </div>
      </div>
    </div>
  );
};
