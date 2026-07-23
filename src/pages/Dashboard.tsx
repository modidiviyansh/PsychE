import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Clock, FileText, ChevronRight, Search, Download, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [sessionsThisMonth, setSessionsThisMonth] = useState<number>(0);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<any[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<any[]>([]);
  const [highRiskStudents, setHighRiskStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch total students
      const { count: studentCount } = await supabase
        .from('PsychE_Students')
        .select('*', { count: 'exact', head: true });
      
      if (studentCount !== null) setTotalStudents(studentCount);

      // Fetch sessions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: sessionCount } = await supabase
        .from('PsychE_Counseling_Logs')
        .select('*', { count: 'exact', head: true })
        .gte('session_date', startOfMonth.toISOString());
      
      if (sessionCount !== null) setSessionsThisMonth(sessionCount);

      // Fetch recent logs
      const { data: logsData } = await supabase
        .from('PsychE_Counseling_Logs')
        .select(`
          id,
          reason,
          session_date,
          student_uuid,
          PsychE_Students (full_name)
        `)
        .order('session_date', { ascending: false })
        .limit(4);

      if (logsData) {
        const formattedLogs = logsData.map((log: any) => ({
          id: log.id,
          student_uuid: log.student_uuid,
          student: log.PsychE_Students?.full_name || 'Unknown Student',
          reason: log.reason,
          date: new Date(log.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          color: getColorForReason(log.reason)
        }));
        setRecentLogs(formattedLogs);
      }

      // Fetch Upcoming Scheduled Sessions (Today and Future)
      const todayIsoStr = new Date().toISOString().split('T')[0];
      const { data: followUpData } = await supabase
        .from('PsychE_Counseling_Logs')
        .select(`
          id, reason, scheduled_date, student_uuid,
          PsychE_Students (full_name)
        `)
        .eq('session_status', 'Scheduled')
        .gte('scheduled_date', todayIsoStr)
        .order('scheduled_date', { ascending: true })
        .limit(3);

      if (followUpData) {
        setUpcomingFollowUps(followUpData);
      }

      // Fetch Overdue Scheduled Sessions (Past dates)
      const { data: overdueData } = await supabase
        .from('PsychE_Counseling_Logs')
        .select(`
          id, reason, scheduled_date, student_uuid,
          PsychE_Students (full_name)
        `)
        .eq('session_status', 'Scheduled')
        .lt('scheduled_date', todayIsoStr)
        .order('scheduled_date', { ascending: true })
        .limit(3);

      if (overdueData) {
        setOverdueFollowUps(overdueData);
      }

      // Fetch High Risk Students
      const { data: riskData } = await supabase
        .from('PsychE_Students')
        .select('id, full_name, student_id, course')
        .eq('risk_level', 'High')
        .limit(3);

      if (riskData) {
        setHighRiskStudents(riskData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getColorForReason = (reason: string) => {
    if (reason.toLowerCase().includes('stress')) return '#e25b5b';
    if (reason.toLowerCase().includes('career')) return '#5e6ad2';
    if (reason.toLowerCase().includes('conflict')) return '#f59e0b';
    return '#4ade80';
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          alert('Uploading data... Please wait.');
          const studentsMap = new Map();
          const logsToCreate: any[] = [];

          results.data.forEach((row: any) => {
            const studentId = row.student_id || row.id;
            if (!studentId) return;

            // 1. Prepare Student Data
            if (!studentsMap.has(studentId)) {
              studentsMap.set(studentId, {
                student_id: studentId,
                full_name: row.full_name || row.name || 'Unknown',
                course: row.course || 'Unknown',
                email: row.email || null,
                mobile: row.mobile || row.phone || null,
                fathers_name: row.fathers_name || null,
                mothers_name: row.mothers_name || null,
                enrolled_date: row.enrolled_date || null
              });
            }

            // 2. Prepare Log Data if present
            if (row.reason || row.counselor_name || row.student_response) {
              logsToCreate.push({
                _temp_student_id: studentId,
                counselor_name: row.counselor_name || 'System Import',
                session_date: row.session_date || new Date().toISOString(),
                reason: row.reason || 'Imported Log',
                student_response: row.student_response || '',
                recommended_action: row.recommended_action || ''
              });
            }
          });

          const uniqueStudents = Array.from(studentsMap.values());
          if (uniqueStudents.length === 0) throw new Error('No valid data found in CSV.');

          // 3. Upsert Students
          const { data: upsertedStudents, error: studentError } = await supabase
            .from('PsychE_Students')
            .upsert(uniqueStudents, { onConflict: 'student_id' })
            .select('id, student_id');
            
          if (studentError) throw studentError;

          // 4. Map UUIDs and Insert Logs
          if (logsToCreate.length > 0 && upsertedStudents) {
            const idMap: Record<string, string> = {};
            upsertedStudents.forEach(s => { idMap[s.student_id] = s.id; });

            const finalLogs = logsToCreate
              .filter(log => idMap[log._temp_student_id])
              .map(log => ({
                student_uuid: idMap[log._temp_student_id],
                counselor_name: log.counselor_name,
                session_date: log.session_date,
                reason: log.reason,
                student_response: log.student_response,
                recommended_action: log.recommended_action
              }));

            if (finalLogs.length > 0) {
              const { error: logsError } = await supabase.from('PsychE_Counseling_Logs').insert(finalLogs);
              if (logsError) throw logsError;
            }
          }

          alert(`Success! Imported ${uniqueStudents.length} students and ${logsToCreate.length} counseling records.`);
          fetchDashboardData(); // Refresh stats
        } catch (error: any) {
          console.error(error);
          alert(`Error uploading CSV: ${error.message}`);
        }
      }
    });
  };

  const downloadCsvTemplate = () => {
    const templateData = [
      {
        student_id: 'STU-101',
        full_name: 'John Doe',
        course: '10th Grade Section A',
        email: 'john@student.gcm.edu',
        mobile: '+91 9876543210',
        fathers_name: 'Robert Doe',
        mothers_name: 'Jane Doe',
        enrolled_date: '2026-01-01',
        counselor_name: 'Dr. Sarah Smith',
        session_date: '2026-05-09T10:00:00Z',
        reason: 'Academic Stress',
        student_response: 'Student felt overwhelmed with upcoming exams.',
        recommended_action: 'Scheduled a follow-up session next week.'
      }
    ];
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'PsychE_Student_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateMonthlyReport = async () => {
    try {
      alert('Generating report...');
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('PsychE_Counseling_Logs')
        .select(`
          id,
          session_date,
          counselor_name,
          reason,
          student_response,
          recommended_action,
          PsychE_Students (full_name, student_id)
        `)
        .gte('session_date', startOfMonth.toISOString())
        .order('session_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        alert('No sessions found for this month.');
        return;
      }

      const csvData = data.map((log: any) => {
        const student = log.PsychE_Students;
        return {
          'Date': new Date(log.session_date).toLocaleString(),
          'Student Name': student?.full_name || 'Unknown',
          'Student ID': student?.student_id || 'Unknown',
          'Counselor': log.counselor_name,
          'Reason': log.reason,
          'Notes': log.student_response,
          'Action Taken': log.recommended_action
        };
      });

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monthly_report_${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error(error);
      alert('Failed to generate report.');
    }
  };

  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: '1rem 0' }}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-h1">Welcome back, Counselor</h1>
          <p className="text-muted">Here's what's happening at GCM Convent School today.</p>
        </div>
        <div className="text-right">
          <p className="text-h2">{today.toLocaleDateString('en-US', options)}</p>
          <p className="text-muted">{today.toLocaleDateString('en-US', { weekday: 'long' })}</p>
        </div>
      </div>

      <div className="bento-grid">
        {/* Quick Add Log - Main Action */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 8', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(94, 106, 210, 0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
          
          <h2 className="text-h2 mb-4">Log a New Session</h2>
          <p className="text-muted mb-6" style={{ maxWidth: '80%' }}>Quickly record a counseling session. Search for an existing student or add a new one inline to keep your records updated effortlessly.</p>
          
          <div className="flex gap-4">
            <motion.button 
              onClick={() => navigate('/add-log')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary" 
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none', padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              <Plus size={20} />
              Add New Log
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
              onClick={() => {
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
              }}
            >
              <Search size={20} />
              Find Student
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Summary */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div 
            onClick={() => navigate('/directory')}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div className="flex items-center gap-2 mb-2 text-muted">
              <Users size={18} />
              <span style={{ fontWeight: 500 }}>Total Students <ChevronRight size={14} style={{ display: 'inline' }}/></span>
            </div>
            <p style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>{loading ? '...' : totalStudents}</p>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2 text-muted">
              <FileText size={18} />
              <span style={{ fontWeight: 500 }}>Sessions This Month</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--color-primary)' }}>{loading ? '...' : sessionsThisMonth}</p>
          </div>
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 7' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-h3 flex items-center gap-2"><Clock size={20} className="text-muted"/> Recent Logs</h3>
            <button onClick={() => navigate('/logs')} className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>View all <ChevronRight size={16} /></button>
          </div>
          
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <p className="text-muted text-center py-4">Loading recent logs...</p>
            ) : recentLogs.length === 0 ? (
              <p className="text-muted text-center py-4">No recent counseling logs found.</p>
            ) : (
              recentLogs.map((log) => (
                <motion.div 
                  key={log.id}
                  onClick={() => navigate(`/student/${log.student_uuid}`)}
                  whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.03)' }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer',
                    border: '1px solid transparent'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: log.color }}></div>
                    <div>
                      <p style={{ fontWeight: 600 }}>{log.student}</p>
                      <p className="text-muted" style={{ fontSize: '0.875rem' }}>{log.reason}</p>
                    </div>
                  </div>
                  <div className="text-right text-muted" style={{ fontSize: '0.875rem' }}>
                    {log.date}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions / Shortcuts */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 5', background: 'linear-gradient(to bottom right, var(--color-surface), rgba(94, 106, 210, 0.05))' }}>
          <h3 className="text-h3 mb-4">Quick Links</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleBulkUpload}
            />
            
            <div className="flex gap-2 w-full">
              <motion.button 
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.02 }} 
                className="btn btn-secondary" 
                style={{ flex: 1, justifyContent: 'flex-start', padding: '1rem', border: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                <div style={{ background: 'rgba(94, 106, 210, 0.1)', padding: '0.5rem', borderRadius: '8px', marginRight: '0.5rem' }}>
                  <Users size={20} color="var(--color-primary)" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600 }}>Bulk Onboard</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Upload CSV</p>
                </div>
              </motion.button>
              
              <motion.button 
                onClick={downloadCsvTemplate}
                whileHover={{ scale: 1.02 }} 
                className="btn btn-secondary" 
                style={{ flex: 1, justifyContent: 'flex-start', padding: '1rem', border: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.5rem', borderRadius: '8px', marginRight: '0.5rem' }}>
                  <Download size={20} className="text-muted" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontWeight: 600 }}>Template</p>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Download CSV</p>
                </div>
              </motion.button>
            </div>
            
            <motion.button 
              onClick={generateMonthlyReport}
              whileHover={{ scale: 1.02 }} 
              className="btn btn-secondary mb-2" 
              style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '0.5rem', borderRadius: '8px', marginRight: '0.5rem' }}>
                <FileText size={20} color="var(--color-success)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontWeight: 600 }}>Generate Monthly Report</p>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>Export session analytics</p>
              </div>
            </motion.button>
            
            <motion.button 
              onClick={() => navigate('/bulk-schedule')}
              whileHover={{ scale: 1.02 }} 
              className="btn btn-secondary" 
              style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              <div style={{ background: 'rgba(94, 106, 210, 0.1)', padding: '0.5rem', borderRadius: '8px', marginRight: '0.5rem' }}>
                <Calendar size={20} color="var(--color-primary)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontWeight: 600 }}>Bulk Auto-Scheduler</p>
                <p className="text-muted" style={{ fontSize: '0.75rem' }}>Distribute new initial sessions</p>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Upcoming & Overdue Follow-ups */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 7' }}>
          <h3 className="text-h3 mb-4 flex items-center gap-2"><Calendar size={20} className="text-primary"/> Scheduled Sessions</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
            
            {/* Overdue Section */}
            {overdueFollowUps.length > 0 && overdueFollowUps.map(fu => (
              <div key={fu.id} onClick={() => navigate(`/add-log?schedule_id=${fu.id}`)} className="flex justify-between items-center p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p style={{ fontWeight: 600, color: '#ef4444' }}>{fu.PsychE_Students?.full_name}</p>
                    <span style={{ fontSize: '0.65rem', backgroundColor: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Overdue</span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>Reason: {fu.reason}</p>
                </div>
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600 }}>
                  {new Date(fu.scheduled_date).toLocaleDateString()}
                </div>
              </div>
            ))}

            {/* Upcoming Section */}
            {upcomingFollowUps.length === 0 && overdueFollowUps.length === 0 ? (
              <p className="text-muted py-2">No pending sessions scheduled.</p>
            ) : (
              upcomingFollowUps.map(fu => (
                <div key={fu.id} onClick={() => navigate(`/add-log?schedule_id=${fu.id}`)} className="flex justify-between items-center p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{fu.PsychE_Students?.full_name}</p>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>Reason: {fu.reason}</p>
                  </div>
                  <div style={{ backgroundColor: 'rgba(94, 106, 210, 0.1)', color: 'var(--color-primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {new Date(fu.scheduled_date).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* High Risk Watchlist */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 5', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 className="text-h3 mb-4 flex items-center gap-2" style={{ color: '#ef4444' }}><Users size={20} /> High Risk Watchlist</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
            {highRiskStudents.length === 0 ? (
              <p className="text-muted py-2">No students currently flagged as High Risk.</p>
            ) : (
              highRiskStudents.map(student => (
                <div key={student.id} onClick={() => navigate(`/student/${student.id}`)} className="flex justify-between items-center p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{student.full_name}</p>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>{student.course}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted" />
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
