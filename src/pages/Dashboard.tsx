import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Download, Plus, FileText, ChevronRight, Calendar, Search, ShieldCheck, Trash, Check, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Papa from 'papaparse';
import { formatDisplayDate, isOverdue } from '../utils/dateFormatter';
import { toSentenceCase } from '../utils/stringFormatter';

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
  
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    document.title = "UPsych : GCM Edition | Dashboard";
  }, []);

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

      // Fetch recent logs (Exclude future logs using Timeline Query Guard BUG-004)
      const { data: logsData } = await supabase
        .from('PsychE_Counseling_Logs')
        .select(`
          id,
          reason,
          session_date,
          student_uuid,
          PsychE_Students (full_name, student_id)
        `)
        .lte('session_date', new Date().toISOString())
        .order('session_date', { ascending: false })
        .limit(4);

      if (logsData) {
        const formattedLogs = logsData.map((log: any) => ({
          id: log.id,
          student_uuid: log.student_uuid,
          student_sid: log.PsychE_Students?.student_id,
          student: log.PsychE_Students?.full_name || 'Unknown Student',
          reason: toSentenceCase(log.reason),
          date: formatDisplayDate(log.session_date),
          color: getColorForReason(log.reason)
        }));
        setRecentLogs(formattedLogs);
      }

      // Fetch Scheduled Sessions (All) and explicitly filter using Date Utility
      const { data: scheduledData } = await supabase
        .from('PsychE_Counseling_Logs')
        .select(`
          id, reason, scheduled_date, student_uuid,
          PsychE_Students (full_name, student_id)
        `)
        .eq('session_status', 'Scheduled');

      if (scheduledData) {
        // OVERDUE logic fix (BUG-003 & BUG-005)
        const overdue = scheduledData.filter(fu => isOverdue(fu.scheduled_date)).sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
        const upcoming = scheduledData.filter(fu => !isOverdue(fu.scheduled_date)).sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
        
        setOverdueFollowUps(overdue.slice(0, 3));
        setUpcomingFollowUps(upcoming.slice(0, 3));
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
    if (reason.toLowerCase().includes('stress')) return '#3b82f6'; // Neutral blue, reserved red for high risk
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

            // Strict Regex Validation (BUG-001 & BUG-002)
            const idRegex = /^STU-\d{4}$/;
            if (!idRegex.test(studentId)) {
              throw new Error(`Invalid Student ID format: ${studentId}. Must be STU-XXXX.`);
            }

            const course = row.course || 'Unknown';
            if (course !== 'Unknown') {
              const courseRegex = /^[a-zA-Z0-9\s\-_]+$/;
              if (!courseRegex.test(course)) {
                throw new Error(`Invalid Course format: ${course}. Must be alphanumeric.`);
              }
            }

            // 1. Prepare Student Data
            if (!studentsMap.has(studentId)) {
              studentsMap.set(studentId, {
                student_id: studentId,
                full_name: row.full_name || row.name || 'Unknown',
                course: course,
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
    link.setAttribute('download', 'UPsych_Student_Import_Template.csv');
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
          'Date': new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(log.session_date)),
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
      link.setAttribute('download', `monthly_report_${new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date()).replace(' ', '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error(error);
      alert('Failed to generate report.');
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this session? This action cannot be undone.")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('PsychE_Counseling_Logs').delete().eq('id', logId);
      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session.');
      setLoading(false);
    }
  };

  const handleReschedule = async (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    if (!newDate) {
      alert("Please select a new date.");
      return;
    }

    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      alert("You cannot reschedule a session to a past date.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('PsychE_Counseling_Logs').update({ scheduled_date: newDate }).eq('id', logId);
      if (error) throw error;
      setRescheduleId(null);
      setNewDate('');
      fetchDashboardData();
    } catch (error) {
      console.error('Error rescheduling session:', error);
      alert('Failed to reschedule session.');
      setLoading(false);
    }
  };

  const today = new Date();


  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      style={{ padding: '1rem 0' }}
    >
      <div className="flex justify-between items-center mb-6 mobile-stack mobile-stack-start" style={{ gap: '1rem' }}>
        <div>
          <h1 className="text-h1 break-words">Welcome back, Counselor</h1>
          <p className="text-muted">Here's what's happening at GCM Convent School today.</p>
        </div>
        <div className="text-right mobile-text-left">
          <p className="text-h2 break-words">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(today)}</p>
          <p className="text-muted">{new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(today)}</p>
        </div>
      </div>

      <div className="bento-grid">
        {/* Quick Add Log - Main Action */}
        <motion.div variants={item} className="bento-card col-span-8" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(94, 106, 210, 0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
          
          <h2 className="text-h2 mb-4">Log a New Session</h2>
          <p className="text-muted mb-6" style={{ maxWidth: '80%' }}>Quickly record a counseling session. Search for an existing student or add a new one inline to keep your records updated effortlessly.</p>
          
          <div className="flex gap-4 flex-wrap">
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
              onClick={() => navigate('/directory')}
            >
              <Search size={20} />
              Find Student
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Summary */}
        <motion.div variants={item} className="bento-card col-span-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
          <div 
            onClick={() => navigate('/directory')}
            style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '1rem', borderRadius: 'var(--radius-md)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div className="flex items-center gap-2 mb-2 text-muted">
              <Users size={18} />
              <span style={{ fontWeight: 500 }}>Total Students <ChevronRight size={14} style={{ display: 'inline' }}/></span>
            </div>
            <p style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>{loading ? '...' : totalStudents}</p>
          </div>
          <div 
            onClick={() => navigate('/logs')}
            style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '1rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div className="flex items-center gap-2 mb-2 text-muted">
              <FileText size={18} />
              <span style={{ fontWeight: 500 }}>Sessions This Month <ChevronRight size={14} style={{ display: 'inline' }}/></span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--color-primary)' }}>{loading ? '...' : sessionsThisMonth}</p>
          </div>
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div variants={item} className="bento-card col-span-7">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-h3 flex items-center gap-2"><Clock size={20} className="text-muted"/> Recent Logs</h3>
            <button onClick={() => navigate('/logs')} className="text-muted" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>View all <ChevronRight size={16} /></button>
          </div>
          
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
            {loading ? (
              <p className="text-muted text-center py-4">Loading recent logs...</p>
            ) : recentLogs.length === 0 ? (
              <p className="text-muted text-center py-4">No recent counseling logs found.</p>
            ) : (
              recentLogs.map((log) => (
                <motion.div 
                  key={log.id}
                  onClick={() => navigate(`/student/${log.student_sid || log.student_uuid}`)}
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
                  <div className="flex items-center gap-4" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: log.color, flexShrink: 0 }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.student}</p>
                      <p className="text-muted" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.reason}</p>
                    </div>
                  </div>
                  <div className="text-right text-muted" style={{ fontSize: '0.875rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                    {log.date}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Quick Actions / Shortcuts */}
        <motion.div variants={item} className="bento-card col-span-5" style={{ background: 'linear-gradient(to bottom right, var(--color-surface), rgba(94, 106, 210, 0.05))' }}>
          <h3 className="text-h3 mb-4">Quick Links</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '0.75rem' }}>
            
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleBulkUpload}
            />
            
            <div className="flex gap-2 w-full mobile-stack">
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
              onClick={() => navigate('/directory')}
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
        <motion.div variants={item} className="bento-card col-span-7">
          <h3 className="text-h3 mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--color-primary)' }} /> Scheduled Sessions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>

            {overdueFollowUps.length === 0 && upcomingFollowUps.length === 0 ? (
              <p className="text-muted" style={{ padding: '1rem 0' }}>No pending sessions scheduled.</p>
            ) : (
              [...overdueFollowUps.map(fu => ({ ...fu, _isOverdue: true })), ...upcomingFollowUps.map(fu => ({ ...fu, _isOverdue: false }))].map(fu => (
                <div key={fu.id}>
                  {/* ── Main Session Row ── */}
                  <div
                    onClick={() => navigate(`/add-log?schedule_id=${fu.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '0.875rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: fu._isOverdue ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${fu._isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = fu._isOverdue ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = fu._isOverdue ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)'; }}
                  >
                    {/* Left: Identity */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fu.PsychE_Students?.full_name || 'Unknown Student'}
                      </p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {toSentenceCase(fu.reason)}
                      </p>
                    </div>

                    {/* Right: Status + Date + Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexShrink: 0 }}>
                      {fu._isOverdue && (
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', whiteSpace: 'nowrap' }}>
                          Overdue
                        </span>
                      )}
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: fu._isOverdue ? '#f87171' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDisplayDate(fu.scheduled_date)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRescheduleId(fu.id === rescheduleId ? null : fu.id); setNewDate(''); }}
                          title="Reschedule"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', padding: '0.375rem', borderRadius: '6px', transition: 'color 0.15s, background-color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Calendar size={15} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(e, fu.id)}
                          title="Delete"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', padding: '0.375rem', borderRadius: '6px', transition: 'color 0.15s, background-color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Inline Reschedule Row ── */}
                  {rescheduleId === fu.id && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 1rem 0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '0 0 var(--radius-md) var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)', borderTop: 'none', marginTop: '-4px' }}>
                      <input
                        type="date"
                        className="input"
                        style={{ flex: 1, padding: '0.375rem 0.625rem', fontSize: '0.875rem' }}
                        value={newDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setNewDate(e.target.value)}
                      />
                      <button onClick={(e) => handleReschedule(e, fu.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', display: 'flex', padding: '0.375rem' }}>
                        <Check size={18} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setRescheduleId(null); setNewDate(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: '0.375rem' }}>
                        <XCircle size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* High Risk Watchlist */}
        <motion.div variants={item} className="bento-card col-span-5" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 className="text-h3 mb-4 flex items-center gap-2" style={{ color: '#ef4444' }}><Users size={20} /> High Risk Watchlist</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {highRiskStudents.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '250px' }}>
                <ShieldCheck size={48} className="text-muted mb-4" />
                <p className="text-muted">No high-risk students at this time.</p>
              </div>
            ) : (
              highRiskStudents.map(student => (
                <div key={student.id} onClick={() => navigate(`/student/${student.student_id || student.id}`)} className="flex justify-between items-center p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
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
