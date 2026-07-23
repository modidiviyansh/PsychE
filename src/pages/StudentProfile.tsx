import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Edit2, Calendar, Phone, Mail, BookOpen, ArrowLeft, Eye, EyeOff, User } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const StudentProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Privacy States
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    async function fetchStudentProfile() {
      if (!id) return;
      try {
        const { data: studentData, error: studentError } = await supabase
          .from('PsychE_Students')
          .select('*')
          .eq('id', id)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

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

  const maskPhone = (phone: string | null) => {
    if (!phone) return 'N/A';
    if (showPhone) return phone;
    // Keep first 4 chars (e.g. +91 ) and last 4
    if (phone.length <= 8) return '****';
    return phone.substring(0, 4) + '******' + phone.substring(phone.length - 4);
  };

  const maskEmail = (email: string | null) => {
    if (!email) return 'N/A';
    if (showEmail) return email;
    const parts = email.split('@');
    if (parts.length !== 2) return '****';
    const name = parts[0];
    const maskedName = name.length > 2 ? name.substring(0, 2) + '****' : '****';
    return `${maskedName}@${parts[1]}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <BookOpen size={32} color="var(--color-primary)" />
        </motion.div>
      </div>
    );
  }

  if (!student) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Student not found.</div>;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0' }}>
      
      {/* Header Actions */}
      <motion.div variants={item} className="flex justify-between items-center mb-6 no-print">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-h1 flex items-center gap-3">
            {student.profile_image ? (
              <img src={student.profile_image} alt={student.full_name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} /></div>
            )}
            {student.full_name}
            <span style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem', backgroundColor: 'rgba(94, 106, 210, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)' }}>Active</span>
            <span style={{ 
              fontSize: '0.875rem', 
              padding: '0.25rem 0.75rem', 
              backgroundColor: student.risk_level === 'High' ? 'rgba(239, 68, 68, 0.1)' : student.risk_level === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(74, 222, 128, 0.1)',
              color: student.risk_level === 'High' ? '#ef4444' : student.risk_level === 'Medium' ? '#f59e0b' : '#4ade80',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600
            }}>Risk: {student.risk_level || 'Low'}</span>
          </h1>
          <p className="text-muted">{student.course} • ID: {student.student_id}</p>
        </div>
        <div className="flex gap-4">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={18} /> Print Record
          </motion.button>
          <motion.button 
            onClick={() => navigate(`/edit-student/${student.id}`)}
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            className="btn btn-primary" 
            style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none', boxShadow: '0 4px 12px rgba(94, 106, 210, 0.3)' }}
          >
            <Edit2 size={18} /> Edit Profile
          </motion.button>
        </div>
      </motion.div>

      {/* Official Print Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1>GCM Convent School</h1>
        <h2>Confidential Counseling Record</h2>
        <div className="print-meta">
          <span><strong>Student:</strong> {student.full_name}</span>
          <span><strong>ID:</strong> {student.student_id}</span>
          <span><strong>Course:</strong> {student.course}</span>
          <span><strong>Printed:</strong> {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bento-grid">
        {/* Personal Details */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 4' }}>
          <h3 className="text-h3 mb-4">Personal Details</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Phone with Privacy Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><Phone size={16} className="text-primary"/></div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Phone</p>
                  <p style={{ fontWeight: 500, fontFamily: showPhone ? 'inherit' : 'monospace' }}>{maskPhone(student.mobile)}</p>
                </div>
              </div>
              <button onClick={() => setShowPhone(!showPhone)} className="btn btn-secondary no-print" style={{ padding: '0.25rem', border: 'none', background: 'transparent' }}>
                {showPhone ? <EyeOff size={16} className="text-muted" /> : <Eye size={16} className="text-muted" />}
              </button>
            </div>

            {/* Email with Privacy Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><Mail size={16} className="text-primary"/></div>
                <div>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>Email</p>
                  <p style={{ fontWeight: 500 }}>{maskEmail(student.email)}</p>
                </div>
              </div>
              <button onClick={() => setShowEmail(!showEmail)} className="btn btn-secondary no-print" style={{ padding: '0.25rem', border: 'none', background: 'transparent' }}>
                {showEmail ? <EyeOff size={16} className="text-muted" /> : <Eye size={16} className="text-muted" />}
              </button>
            </div>

            {/* Father */}
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><User size={16} className="text-primary"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Father's Name</p><p style={{ fontWeight: 500 }}>{student.fathers_name || 'N/A'}</p></div>
            </div>

            {/* Mother */}
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><User size={16} className="text-primary"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Mother's Name</p><p style={{ fontWeight: 500 }}>{student.mothers_name || 'N/A'}</p></div>
            </div>

            {/* Enrolled */}
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><Calendar size={16} className="text-primary"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Enrolled</p><p style={{ fontWeight: 500 }}>{student.enrolled_date ? new Date(student.enrolled_date).toLocaleDateString() : 'N/A'}</p></div>
            </div>
          </div>
        </motion.div>

        {/* History Timeline */}
        <motion.div variants={item} className="bento-card" style={{ gridColumn: 'span 8' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-h3">Counseling History</h3>
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/add-log?student=${student.id}`)} 
              className="btn btn-secondary no-print" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
            >
              + Log Session
            </motion.button>
          </div>
          
          <div style={{ position: 'relative', paddingLeft: '1rem' }}>
            {/* Vertical Timeline Line */}
            <div className="no-print" style={{ position: 'absolute', left: 0, top: '1rem', bottom: 0, width: '2px', backgroundColor: 'var(--color-border)' }}></div>

            <AnimatePresence>
              <div className="flex" style={{ flexDirection: 'column', gap: '2rem' }}>
                {logs.length === 0 ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted py-4">No counseling logs found for this student.</motion.p>
                ) : (
                  logs.map((log, index) => (
                    <motion.div 
                      key={log.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
                      className="print-timeline-item"
                      style={{ position: 'relative', paddingLeft: '2rem' }}
                    >
                      {/* Timeline Dot */}
                      <div className="no-print" style={{ position: 'absolute', left: '-21px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', border: '2px solid var(--color-surface)' }}></div>
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-primary)' }}>
                              {log.interaction_type || 'Session'}
                            </span>
                          </div>
                          <h4 className="text-h3" style={{ fontSize: '1.25rem' }}>{log.reason}</h4>
                          <p className="text-muted" style={{ fontSize: '0.875rem' }}>{log.counselor_name} • {new Date(log.session_date).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="print-notes" style={{ backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem', border: '1px solid var(--color-border)' }}>
                        <div className="mb-4">
                          <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Session Notes & Student Response</p>
                          <p className="text-body" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{log.student_response || 'No notes provided.'}</p>
                        </div>
                        
                        <div className="flex gap-4 flex-wrap">
                          <div className="print-action" style={{ flex: 1, backgroundColor: 'rgba(74, 222, 128, 0.1)', color: 'var(--color-success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, minWidth: '200px' }}>
                            <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8, marginBottom: '4px', letterSpacing: '0.05em' }}>RECOMMENDED ACTION</span>
                            {log.recommended_action || 'None'}
                          </div>
                          {log.follow_up_date && (
                            <div className="print-action" style={{ flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, minWidth: '200px' }}>
                              <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8, marginBottom: '4px', letterSpacing: '0.05em' }}>FOLLOW-UP ({log.follow_up_status || 'Pending'})</span>
                              {new Date(log.follow_up_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
