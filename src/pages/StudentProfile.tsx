import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, Edit2, Calendar, Phone, Mail, BookOpen, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const StudentProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudentProfile() {
      if (!id) return;
      try {
        // Fetch Student Data
        const { data: studentData, error: studentError } = await supabase
          .from('PsychE_Students')
          .select('*')
          .eq('id', id)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

        // Fetch Student's Counseling Logs
        const { data: logsData, error: logsError } = await supabase
          .from('PsychE_Counseling_Logs')
          .select('*')
          .eq('student_uuid', id)
          .order('session_date', { ascending: false });

        if (logsError) throw logsError;
        setLogs(logsData || []);

      } catch (error) {
        console.error('Error fetching student profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentProfile();
  }, [id]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading student profile...</div>;
  }

  if (!student) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Student not found.</div>;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0' }}>
      
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-h1 flex items-center gap-3">
            {student.full_name}
            <span style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(94, 106, 210, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)' }}>Active</span>
          </h1>
          <p className="text-muted">{student.course} • ID: {student.student_id}</p>
        </div>
        <div className="flex gap-4">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print Record
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none' }}>
            <Edit2 size={18} /> Edit Profile
          </motion.button>
        </div>
      </div>

      {/* Print Only Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>GCM Convent School</h1>
        <h2 style={{ fontSize: '18px', textAlign: 'center', marginBottom: '24px' }}>Student Counseling Record</h2>
        <div style={{ marginBottom: '24px', borderBottom: '1px solid #ccc', paddingBottom: '12px' }}>
          <p><strong>Name:</strong> {student.full_name}</p>
          <p><strong>Student ID:</strong> {student.student_id}</p>
          <p><strong>Course:</strong> {student.course}</p>
        </div>
      </div>

      <div className="bento-grid">
        {/* Personal Details */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 4' }}>
          <h3 className="text-h3 mb-4">Personal Details</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}><Phone size={16} className="text-muted"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Phone</p><p style={{ fontWeight: 500 }}>{student.mobile || 'N/A'}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}><Mail size={16} className="text-muted"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Email</p><p style={{ fontWeight: 500 }}>{student.email || 'N/A'}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}><BookOpen size={16} className="text-muted"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Guardian (Father/Mother)</p><p style={{ fontWeight: 500 }}>{student.fathers_name || student.mothers_name || 'N/A'}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}><Calendar size={16} className="text-muted"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Enrolled</p><p style={{ fontWeight: 500 }}>{student.enrolled_date ? new Date(student.enrolled_date).toLocaleDateString() : 'N/A'}</p></div>
            </div>
          </div>
        </motion.div>

        {/* History Timeline */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 8' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-h3">Counseling History</h3>
            <button onClick={() => navigate(`/add-log?student=${student.id}`)} className="btn btn-secondary no-print" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>+ Log Session</button>
          </div>
          
          <div style={{ position: 'relative', paddingLeft: '1rem' }}>
            {/* Timeline Line */}
            <div className="no-print" style={{ position: 'absolute', left: 0, top: '1rem', bottom: 0, width: '2px', backgroundColor: 'var(--color-border)' }}></div>

            <div className="flex" style={{ flexDirection: 'column', gap: '2rem' }}>
              {logs.length === 0 ? (
                <p className="text-muted py-4">No counseling logs found for this student.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} style={{ position: 'relative', paddingLeft: '2rem' }}>
                    {/* Timeline Dot */}
                    <div className="no-print" style={{ position: 'absolute', left: '-21px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', border: '2px solid var(--color-surface)' }}></div>
                    
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-h3" style={{ fontSize: '1.1rem' }}>{log.reason}</h4>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>{log.counselor_name} • {new Date(log.session_date).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div style={{ backgroundColor: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem', border: '1px solid var(--color-border)' }}>
                      <div className="mb-4">
                        <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Notes / Student Response</p>
                        <p className="text-body" style={{ whiteSpace: 'pre-line' }}>{log.student_response}</p>
                      </div>
                      
                      <div style={{ display: 'inline-block', backgroundColor: 'rgba(74, 222, 128, 0.1)', color: 'var(--color-success)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500 }}>
                        <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8, marginBottom: '2px' }}>RECOMMENDED ACTION</span>
                        {log.recommended_action || 'None'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
