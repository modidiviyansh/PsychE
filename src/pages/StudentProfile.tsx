import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Calendar, Phone, Mail, BookOpen, ArrowLeft, Eye, EyeOff, User, BrainCircuit, ChevronDown, ChevronUp, FileDown, X, Tag, Plus } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AssessmentWizard } from '../components/AssessmentWizard';

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
  
  // Assessment Selection & Wizard States

  
  // Active Wizard State
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [activeDraftLogId, setActiveDraftLogId] = useState<string | undefined>(undefined);
  const [activeDraftData, setActiveDraftData] = useState<Record<string, any>>({});

  // Tags States
  const [allTags, setAllTags] = useState<any[]>([]);
  const [studentTags, setStudentTags] = useState<any[]>([]);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  
  // Timeline States
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Date Range Report States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('custom');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  useEffect(() => {
    document.title = "PsychE | Student Profile";
  }, []);

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

        // Fetch Tags
        const { data: sysTags } = await supabase.from('PsychE_System_Tags').select('*');
        if (sysTags) setAllTags(sysTags);

        const { data: stTags } = await supabase
          .from('PsychE_Student_Tags')
          .select('tag_id, PsychE_System_Tags(*)')
          .eq('student_uuid', id);
        
        if (stTags) {
          setStudentTags(stTags.map((st: any) => st.PsychE_System_Tags).filter(Boolean));
        }

      } catch (error) {
        console.error('Error fetching student profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentProfile();
  }, [id]);

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const maskPhone = (phone: string | null) => {
    if (!phone) return 'N/A';
    if (showPhone) return phone;
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

  const handleGenerateReport = () => {
    if (reportType === 'allTime') {
      navigate(`/report?studentId=${id}&allTime=true`);
    } else {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
      }
      navigate(`/report?studentId=${id}&start=${startDate}&end=${endDate}`);
    }
  };

  const handleToggleTag = async (tag: any) => {
    const hasTag = studentTags.some(t => t.id === tag.id);
    if (hasTag) {
      await supabase.from('PsychE_Student_Tags').delete().eq('student_uuid', id).eq('tag_id', tag.id);
      setStudentTags(studentTags.filter(t => t.id !== tag.id));
    } else {
      await supabase.from('PsychE_Student_Tags').insert([{ student_uuid: id, tag_id: tag.id }]);
      setStudentTags([...studentTags, tag]);
    }
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

  if (!student) return <div style={{ padding: '2rem', textAlign: 'center' }}>Student not found.</div>;

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
          
          {/* Display Awarded Tags */}
          {studentTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {studentTags.map(tag => (
                <span 
                  key={tag.id} 
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${tag.color_hex}20`, color: tag.color_hex, border: `1px solid ${tag.color_hex}40` }}
                >
                  <Tag size={12} /> {tag.tag_name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-4 relative">
          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            className="btn btn-secondary no-print" 
            onClick={() => setIsManageTagsOpen(!isManageTagsOpen)}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
          >
            <Plus size={18} /> Add Tag
          </motion.button>
          
          {/* Tags Dropdown */}
          <AnimatePresence>
            {isManageTagsOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-12 left-0 z-50 p-4 rounded-xl shadow-xl"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', width: '280px' }}
              >
                <h4 className="text-sm font-semibold mb-3">System Tags</h4>
                <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {Object.entries(
                    allTags.reduce((acc, tag) => {
                      const cat = tag.tag_category || 'General';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(tag);
                      return acc;
                    }, {} as Record<string, any[]>)
                  ).map(([cat, catTags]) => (
                    <div key={cat}>
                      <h5 className="text-xs font-semibold text-muted mb-2 uppercase">{cat}</h5>
                      <div className="flex flex-col gap-1">
                        {(catTags as any[]).map(tag => {
                          const isAssigned = studentTags.some(t => t.id === tag.id);
                          return (
                            <button 
                              key={tag.id}
                              onClick={() => handleToggleTag(tag)}
                              className={`text-left text-sm p-2 rounded flex items-center justify-between ${isAssigned ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            >
                              <span style={{ color: tag.color_hex }}>{tag.tag_name}</span>
                              {isAssigned && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tag.color_hex }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {allTags.length === 0 && <p className="text-xs text-muted">No system tags created yet.</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            className="btn btn-secondary" 
            onClick={() => setIsReportModalOpen(true)}
            style={{ backgroundColor: 'rgba(94, 106, 210, 0.1)', color: 'var(--color-primary)', borderColor: 'transparent' }}
          >
            <FileDown size={18} /> Generate Report
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            className="btn btn-secondary no-print" 
            onClick={() => {
              setActiveAssessmentId('daily_mix');
              setActiveDraftLogId(undefined);
              setActiveDraftData({});
            }}
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'transparent' }}
          >
            <BrainCircuit size={18} /> Live Assessment
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
            <div className="no-print" style={{ position: 'absolute', left: 0, top: '1rem', bottom: 0, width: '2px', backgroundColor: 'var(--color-border)' }}></div>

            <AnimatePresence>
              <div className="flex" style={{ flexDirection: 'column', gap: '2rem' }}>
                {logs.length === 0 ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted py-4">No counseling logs found for this student.</motion.p>
                ) : (
                  logs.map((item, index) => {
                    const isDraft = item.session_status === 'Draft';
                    const hasAssessments = item.assessment_data && item.assessment_data.length > 0;
                    const isExpanded = expandedLogs.has(item.id);

                    return (
                      <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1, type: 'spring', stiffness: 300 }}
                        className="print-timeline-item"
                        style={{ position: 'relative', paddingLeft: '2rem' }}
                      >
                        {/* Timeline Dot */}
                        <div className="no-print" style={{ 
                          position: 'absolute', left: '-21px', top: '5px', width: '12px', height: '12px', borderRadius: '50%', 
                          backgroundColor: isDraft ? '#f59e0b' : hasAssessments ? '#10b981' : 'var(--color-primary)', 
                          border: '2px solid var(--color-surface)' 
                        }}></div>
                        
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {isDraft && (
                                <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '4px', color: '#f59e0b' }}>
                                  Draft
                                </span>
                              )}
                              <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-primary)' }}>
                                {item.interaction_type || 'Session'}
                              </span>
                              {hasAssessments && !isDraft && (
                                <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '4px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <BrainCircuit size={10} /> Assessment
                                </span>
                              )}
                            </div>
                            <h4 className="text-h3" style={{ fontSize: '1.25rem' }}>{item.reason}</h4>
                            <p className="text-muted" style={{ fontSize: '0.875rem' }}>{item.counselor_name} • {new Date(item.session_date).toLocaleString()}</p>
                          </div>

                          {/* Action Button: Resume Draft or Expand Assessments */}
                          {isDraft ? (
                            <button 
                              onClick={() => {
                                if (item.interaction_type === 'Session' && (!item.student_response || item.student_response === 'Draft Assessment')) {
                                  // Navigate to /add-log to resume an embedded draft to ensure clinical notes are filled
                                  navigate(`/add-log?schedule_id=${item.id}&student=${student.id}`);
                                } else {
                                  setActiveAssessmentId('draft'); // Dummy ID to trigger wizard mount
                                  setActiveDraftLogId(item.id);
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', color: '#f59e0b', borderColor: 'transparent', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                            >
                              Resume Draft
                            </button>
                          ) : hasAssessments ? (
                            <button 
                              onClick={() => toggleExpand(item.id)}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: '1px solid var(--color-border)' }}
                            >
                              {isExpanded ? <><ChevronUp size={14} /> Collapse</> : <><ChevronDown size={14} /> Expand</>}
                            </button>
                          ) : null}
                        </div>
                        
                        {/* Collapsed Assessment View */}
                        {!isDraft && hasAssessments && !isExpanded && (
                          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                            {item.assessment_data.map((a: any, i: number) => {
                              const rawScoreValues = Object.values(a.responses) as number[];
                              const totalScore = rawScoreValues.reduce((sum, val) => sum + (val || 0), 0);
                              const maxPossible = a.type === 'COMPE' ? Object.keys(a.responses).length * 4 : 'N/A';
                              return (
                                <span key={i} style={{ fontSize: '0.875rem', fontWeight: 500, color: '#10b981' }}>
                                  {a.title}: {totalScore}{maxPossible !== 'N/A' ? `/${maxPossible}` : ''}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Expanded Notes and Receipt */}
                        {(!hasAssessments || isExpanded) && !isDraft && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            className="print-notes" 
                            style={{ backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginTop: '0.5rem', border: '1px solid var(--color-border)', overflow: 'hidden' }}
                          >
                            <div className="mb-4">
                              <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Session Notes & Student Response</p>
                              <p className="text-body" style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{item.student_response || 'No notes provided.'}</p>
                            </div>
                            
                            {hasAssessments && (
                              <div className="mb-4">
                                <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Full Assessment Receipt</p>
                                {item.assessment_data.map((a: any, i: number) => (
                                  <div key={i} style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem' }}>
                                    <h5 style={{ fontSize: '0.875rem', color: 'var(--color-primary)', marginBottom: '0.75rem' }}>{a.title}</h5>
                                    {Object.entries(a.responses).map(([q, ans]: any, j) => (
                                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '0.875rem', marginBottom: '2px' }}>
                                        <span style={{ color: 'var(--color-text-muted)', flex: 1, paddingRight: '1rem' }}>{q}</span>
                                        <strong style={{ color: '#10b981', minWidth: '30px', textAlign: 'right' }}>{ans}</strong>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-4 flex-wrap">
                              <div className="print-action" style={{ flex: 1, backgroundColor: 'rgba(74, 222, 128, 0.1)', color: 'var(--color-success)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, minWidth: '200px' }}>
                                <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8, marginBottom: '4px', letterSpacing: '0.05em' }}>RECOMMENDED ACTION</span>
                                {item.recommended_action || 'None'}
                              </div>
                              {item.follow_up_date && (
                                <div className="print-action" style={{ flex: 1, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, minWidth: '200px' }}>
                                  <span style={{ fontSize: '0.75rem', display: 'block', opacity: 0.8, marginBottom: '4px', letterSpacing: '0.05em' }}>FOLLOW-UP ({item.follow_up_status || 'Pending'})</span>
                                  {new Date(item.follow_up_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )
                  })
                )}
              </div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Date Range Report Modal */}
      {isReportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bento-card"
            style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', position: 'relative' }}
          >
            <button onClick={() => setIsReportModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
              <X size={20} />
            </button>
            <h3 className="text-h2 mb-4" style={{ fontSize: '1.25rem' }}>Generate Statement</h3>
            <p className="text-muted mb-6" style={{ fontSize: '0.875rem' }}>Select your export preferences.</p>
            
            <div className="mb-6" style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="radio" name="reportType" value="custom" checked={reportType === 'custom'} onChange={() => setReportType('custom')} />
                Custom Date Range
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input type="radio" name="reportType" value="allTime" checked={reportType === 'allTime'} onChange={() => setReportType('allTime')} />
                Full Profile (All Time)
              </label>
            </div>

            {reportType === 'custom' && (
              <>
                <div className="mb-4">
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Start Date</label>
                  <input type="date" className="input" style={{ width: '100%' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="mb-6">
                  <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>End Date</label>
                  <input type="date" className="input" style={{ width: '100%' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </>
            )}

            <button onClick={handleGenerateReport} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              Compile Report
            </button>
          </motion.div>
        </div>
      )}

      {/* Universal Wizard */}
      {activeAssessmentId && (
        <AssessmentWizard
          moduleId={activeAssessmentId === 'draft' || activeAssessmentId === 'daily_mix' ? undefined : activeAssessmentId}
          studentUuid={student.id}
          counselorName="Counselor" // Ideally from auth context
          isQuickAssessment={!activeDraftLogId}
          existingLogId={activeDraftLogId}
          existingData={activeDraftData}
          onComplete={() => {
            setActiveAssessmentId(null);
            setActiveDraftLogId(undefined);
            setActiveDraftData({});
            window.location.reload();
          }}
          onClose={() => {
            setActiveAssessmentId(null);
            window.location.reload(); // Refresh to show draft in timeline
          }}
        />
      )}
    </motion.div>
  );
};
