import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Printer, ArrowLeft } from 'lucide-react';

export const ReportExport: React.FC = () => {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  const allTime = searchParams.get('allTime') === 'true';
  const navigate = useNavigate();

  const [student, setStudent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReportData() {
      if (!studentId) return;
      if (!allTime && (!startDate || !endDate)) return;
      
      try {
        const { data: sData } = await supabase.from('PsychE_Students').select('*').eq('id', studentId).single();
        if (sData) setStudent(sData);

        let query = supabase
          .from('PsychE_Counseling_Logs')
          .select('*')
          .eq('student_uuid', studentId)
          .eq('session_status', 'Completed')
          .order('session_date', { ascending: true }); // Chronological for statement

        if (!allTime && startDate && endDate) {
          const startIso = new Date(startDate).toISOString();
          const endD = new Date(endDate);
          endD.setHours(23, 59, 59, 999);
          const endIso = endD.toISOString();
          
          query = query.gte('session_date', startIso).lte('session_date', endIso);
        }

        const { data: lData } = await query;
        
        if (lData) setLogs(lData);
      } catch (error) {
        console.error("Failed to fetch report data", error);
      } finally {
        setLoading(false);
        // Auto print after a small delay to allow rendering
        setTimeout(() => window.print(), 500);
      }
    }
    fetchReportData();
  }, [studentId, startDate, endDate]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Generating Report...</div>;
  if (!student) return <div style={{ padding: '2rem', textAlign: 'center' }}>Student not found or invalid parameters.</div>;

  return (
    <div style={{ backgroundColor: '#fff', color: '#000', minHeight: '100vh', padding: '2rem' }}>
      
      <div className="no-print" style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> Back
        </button>
        <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
          <Printer size={16} style={{ display: 'inline', marginRight: '0.5rem' }} /> Print Statement
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'serif' }}>
        {/* Header */}
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>PsychE Official Transcript</h1>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: '#555' }}>Counseling & Assessment Statement</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
            <p style={{ margin: 0 }}><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
            <p style={{ margin: '0.25rem 0 0 0' }}>
              <strong>Period:</strong> {allTime ? 'Full History (All Time)' : `${new Date(startDate!).toLocaleDateString()} - ${new Date(endDate!).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        {/* Student Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Student Name:</strong> {student.full_name}</p>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Student ID:</strong> {student.student_id}</p>
            <p style={{ margin: 0 }}><strong>Course/Grade:</strong> {student.course}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Risk Level:</strong> {student.risk_level}</p>
            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Contact:</strong> {student.mobile || 'N/A'}</p>
            <p style={{ margin: 0 }}><strong>Parent/Guardian:</strong> {student.fathers_name || student.mothers_name || 'N/A'}</p>
          </div>
        </div>

        {/* Logs / Transactions */}
        <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Session History</h2>

        {logs.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#666' }}>No completed sessions found in this date range.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {logs.map((log) => {
              const hasAssessments = log.assessment_data && log.assessment_data.length > 0;
              
              return (
                <div key={log.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', display: 'block' }}>{new Date(log.session_date).toLocaleDateString()} - {log.interaction_type}</span>
                      <span style={{ fontSize: '0.875rem', color: '#555' }}>Counselor: {log.counselor_name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 'bold', display: 'block' }}>Ref: {log.id.split('-')[0].toUpperCase()}</span>
                    </div>
                  </div>

                  <div style={{ paddingLeft: '1rem', borderLeft: '3px solid #eee' }}>
                    <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold' }}>Reason: {log.reason}</p>
                    
                    {log.student_response && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>Synthesis Notes:</strong>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-line' }}>{log.student_response}</p>
                      </div>
                    )}

                    {hasAssessments && (
                      <div style={{ marginTop: '1.5rem' }}>
                        <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>Assessment Receipts</strong>
                        
                        {log.assessment_data.map((a: any, i: number) => {
                          const rawScoreValues = Object.values(a.responses) as number[];
                          const totalScore = rawScoreValues.reduce((sum, val) => sum + (val || 0), 0);
                          const maxPossible = a.type === 'COMPE' ? Object.keys(a.responses).length * 4 : 'N/A';
                          
                          return (
                            <div key={i} style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fdfdfd', border: '1px solid #eee' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <strong style={{ fontSize: '1rem' }}>{a.title}</strong>
                                <strong>Score: {totalScore}{maxPossible !== 'N/A' ? `/${maxPossible}` : ''}</strong>
                              </div>
                              
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <tbody>
                                  {Object.entries(a.responses).map(([q, ans]: any, j) => (
                                    <tr key={j} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                      <td style={{ padding: '0.4rem 0', color: '#444' }}>{q}</td>
                                      <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 'bold', width: '50px' }}>{ans}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(log.recommended_action || log.follow_up_date) && (
                      <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', fontSize: '0.875rem', backgroundColor: '#f9f9f9', padding: '0.75rem', borderLeft: '2px solid #ccc' }}>
                        {log.recommended_action && <div><strong>Action:</strong> {log.recommended_action}</div>}
                        {log.follow_up_date && <div><strong>Scheduled Follow-up:</strong> {new Date(log.follow_up_date).toLocaleDateString()}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '2px solid #000', textAlign: 'center', fontSize: '0.875rem', color: '#777' }}>
          <p style={{ margin: 0 }}>End of Statement</p>
          <p style={{ margin: '0.25rem 0 0 0' }}>PsychE CRM • Confidential Record</p>
        </div>
      </div>
    </div>
  );
};
