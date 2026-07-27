import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Calendar, Phone, Mail, BookOpen, ArrowLeft, Eye, EyeOff, User, BrainCircuit, ChevronDown, ChevronUp, FileDown, X, Tag, Plus, Activity, Sparkles, AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { AssessmentWizard } from '../components/AssessmentWizard';
import type { TelemetryPayload } from '../types';
import type { EngineStatus } from '../analytics/ColdStart';
import { calculateConfidenceMultiplier } from '../analytics/ColdStart';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const StudentProfile: React.FC = () => {
  const { studentId } = useParams();
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
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  
  // Timeline States
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Telemetry State
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'telemetry'>('profile');

  // Date Range Report States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('custom');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  useEffect(() => {
    document.title = "UPsych : GCM Edition | Student Profile";
  }, []);

  useEffect(() => {
    async function fetchStudentProfile() {
      if (!studentId) return;
      try {
        const { data: studentData, error: studentError } = await supabase
          .from('PsychE_Students')
          .select('*')
          .eq('student_id', studentId)
          .single();

        if (studentError) throw studentError;
        setStudent(studentData);

        const { data: logsData, error: logsError } = await supabase
          .from('PsychE_Counseling_Logs')
          .select('*')
          .eq('student_uuid', studentData.id)
          .order('session_date', { ascending: false });

        if (logsError) throw logsError;
        
        setLogs(logsData || []);

        // Fetch Telemetry
        const { data: telemetryRow } = await supabase
          .from('PsychE_Student_Telemetry')
          .select('*')
          .eq('student_uuid', studentData.id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (telemetryRow) {
          const payload = {
            ...(telemetryRow.metrics_payload || {}),
            engine_status: telemetryRow.engine_status,
            confidence_multiplier: telemetryRow.confidence_multiplier,
            eti_score: telemetryRow.eti_score,
            eti_data: telemetryRow.eti_data
          };
          setTelemetry(payload as TelemetryPayload);
        }

        const { data: engineStatusStr, error: engineError } = await supabase
          .rpc('psyche_get_engine_status', { p_student_uuid: studentData.id });
        if (!engineError && engineStatusStr) {
          setEngineStatus(engineStatusStr as EngineStatus);
        }

        // Fetch Tags
        const { data: sysTags } = await supabase.from('PsychE_System_Tags').select('*');
        if (sysTags) setAllTags(sysTags);

        const { data: stTags } = await supabase
          .from('PsychE_Student_Tags')
          .select('tag_id, PsychE_System_Tags(*)')
          .eq('student_uuid', studentData.id);
        
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
  }, [studentId]);

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
      navigate(`/report?studentId=${student.id}&allTime=true`);
    } else {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates.");
        return;
      }
      navigate(`/report?studentId=${student.id}&start=${startDate}&end=${endDate}`);
    }
  };

  const handleToggleTag = async (tag: any) => {
    const hasTag = studentTags.some(t => t.id === tag.id);
    if (hasTag) {
      await supabase.from('PsychE_Student_Tags').delete().eq('student_uuid', student.id).eq('tag_id', tag.id);
      setStudentTags(studentTags.filter(t => t.id !== tag.id));
    } else {
      await supabase.from('PsychE_Student_Tags').insert([{ student_uuid: student.id, tag_id: tag.id }]);
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
      <motion.div variants={item} className="flex justify-between items-center mb-6 no-print mobile-stack mobile-stack-start" style={{ gap: '1rem' }}>
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

      {/* Tabs */}
      <div className="flex gap-4 mb-6" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('profile')} 
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem',
            fontWeight: 600, color: activeTab === 'profile' ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'profile' ? '2px solid var(--color-primary)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Profile & History
        </button>
        <button 
          onClick={() => setActiveTab('telemetry')} 
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem',
            fontWeight: 600, color: activeTab === 'telemetry' ? 'var(--color-text)' : 'var(--color-text-muted)',
            borderBottom: activeTab === 'telemetry' ? '2px solid var(--color-primary)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          <Sparkles size={16} style={{ display: 'inline', marginRight: '0.5rem', marginBottom: '2px' }} />
          Telemetry Analytics
        </button>
      </div>

      <div className="bento-grid">
        {activeTab === 'profile' && (
          <>
            {/* Personal Details */}
            <motion.div variants={item} className="bento-card col-span-12">
          <h3 className="text-h3 mb-4">Personal Details</h3>
          <div className="flex" style={{ flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Phone with Privacy Toggle — hidden if no data */}
            {student.mobile && (
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
            )}

            {/* Email with Privacy Toggle — hidden if no data */}
            {student.email && (
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
            )}

            {/* Father — hidden if no data */}
            {student.fathers_name && (
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><User size={16} className="text-primary"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Father's Name</p><p style={{ fontWeight: 500 }}>{student.fathers_name}</p></div>
            </div>
            )}

            {/* Mother — hidden if no data */}
            {student.mothers_name && (
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><User size={16} className="text-primary"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Mother's Name</p><p style={{ fontWeight: 500 }}>{student.mothers_name}</p></div>
            </div>
            )}


            {/* Enrolled — hidden if no data */}
            {student.enrolled_date && (
            <div className="flex items-center gap-3">
              <div style={{ padding: '0.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}><Calendar size={16} className="text-primary"/></div>
              <div><p className="text-muted" style={{ fontSize: '0.75rem' }}>Enrolled</p><p style={{ fontWeight: 500 }}>{new Date(student.enrolled_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
            </div>
            )}

          </div>


          {/* ── Tags Section (inside left card) ── */}
          <div className="no-print" style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                <Tag size={12} /> Tags
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setIsTagModalOpen(true); setTagSearchQuery(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.6rem', fontSize: '0.6875rem', fontWeight: 600, borderRadius: 'var(--radius-full)', backgroundColor: 'rgba(94,106,210,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(94,106,210,0.25)', cursor: 'pointer' }}
              >
                <Plus size={10} /> Manage
              </motion.button>
            </div>

            {studentTags.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No tags assigned yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {Object.entries(
                  studentTags.reduce((acc: Record<string, any[]>, tag: any) => {
                    const cat = tag.tag_category || 'General';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(tag);
                    return acc;
                  }, {})
                ).map(([cat, catTags]) => (
                  <div key={cat}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>{cat}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(catTags as any[]).map((tag: any) => (
                        <span
                          key={tag.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.55rem', fontSize: '0.71875rem', fontWeight: 600, borderRadius: 'var(--radius-full)', backgroundColor: `${tag.color_hex}18`, color: tag.color_hex, border: `1px solid ${tag.color_hex}30` }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: tag.color_hex, flexShrink: 0 }} />
                          {tag.tag_name}
                          <button
                            onClick={() => handleToggleTag(tag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: tag.color_hex, opacity: 0.55, display: 'flex', alignItems: 'center', padding: 0, marginLeft: '0.05rem' }}
                            title="Remove tag"
                          >
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
        {/* End of Personal Details for profile tab. We DO NOT close the fragment here because History Timeline is also in this tab! */}

        {/* ── Clinical Telemetry & Radar Cockpit Card ── */}
        {/* This block is only shown in the telemetry tab! */}
        </>
        )}
        {activeTab === 'telemetry' && (
        <>
        <motion.div variants={item} className="bento-card col-span-12">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="text-h3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={20} color="var(--color-primary)" />
                Clinical Telemetry Profile
              </h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                90-Day Rolling Multi-Domain Diagnostic Assessment
              </p>
            </div>

            {telemetry && telemetry.data_completeness > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#818cf8',
                fontSize: '0.8125rem',
                fontWeight: 600
              }}>
                <Sparkles size={14} />
                {telemetry.archetype}
              </div>
            )}
          </div>

          {(() => {
            if (engineStatus === 'cold_start' || !engineStatus) {
              return (
                <div style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)'
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                      No assessments yet. Schedule first session to begin tracking.
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.8125rem' }}
                    onClick={() => navigate(`/add-log?student=${student.id}`)}
                  >
                    + Schedule Baseline Assessment
                  </button>
                </div>
              );
            }

            if (engineStatus === 'assessment_only') {
              return (
                <div style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)'
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                    <Activity size={24} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                      No formal assessment completed — scores unavailable.
                    </p>
                  </div>
                </div>
              );
            }

            const isWarming = engineStatus === 'warming';
            const isStale = engineStatus === 'stale';

            let confidenceMultiplier = 1;
            if (isWarming) {
              const completedLogs = logs.filter(l => l.session_status === 'Completed');
              const completedSessionsCount = completedLogs.length;
              let daysSinceFirst = 0;
              if (completedLogs.length > 0) {
                const firstLogDate = new Date(completedLogs[completedLogs.length - 1].session_date);
                daysSinceFirst = Math.max(0, Math.floor((Date.now() - firstLogDate.getTime()) / (1000 * 3600 * 24)));
              }
              confidenceMultiplier = calculateConfidenceMultiplier(daysSinceFirst, completedSessionsCount);
            }

            const domainLabelMap: Record<string, string> = {
              BHV: 'Behavioural (BHV)',
              SOC: 'Social (SOC)',
              COG: 'Cognitive (COG)',
              EMH: 'Emotional (EMH)',
              FAM: 'Family (FAM)',
              CAR: 'Career (CAR)',
              SEL: 'Self & Identity (SEL)'
            };

            const radarData = Object.entries(telemetry?.domain_scores || {}).map(([code, val]) => ({
              domain: domainLabelMap[code] || code,
              score: val !== null ? Math.round((val as number) * 100) : 0,
              fullMark: 100,
              isEmpty: val === null || val === 0
            }));

            const CustomTick = ({ payload, x, y, textAnchor, stroke, radius }: any) => {
              const dataPoint = radarData.find(d => d.domain === payload.value);
              const isGrey = isWarming && dataPoint?.isEmpty;
              return (
                <text radius={radius} stroke={stroke} x={x} y={y} className="recharts-text recharts-polar-angle-axis-tick-value" textAnchor={textAnchor}>
                  <tspan x={x} dy="0em" fill={isGrey ? 'rgba(255,255,255,0.2)' : 'var(--color-text-muted)'} fontSize={11} fontWeight={500}>{payload.value}</tspan>
                </text>
              );
            };

            return (
              <div style={{ position: 'relative', width: '100%' }}>
                {isStale && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} /> Data is expired (90+ days old) — schedule a re-assessment.
                  </div>
                )}
                
                {isWarming && (
                  <div style={{ position: 'absolute', top: -10, right: 0, zIndex: 10, backgroundColor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={14} /> Building profile — {Math.round(confidenceMultiplier * 100)}% Confidence
                  </div>
                )}
                
                <div style={{ height: 260, width: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="rgba(255, 255, 255, 0.12)" />
                      <PolarAngleAxis dataKey="domain" tick={<CustomTick />} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255, 255, 255, 0.15)" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} />
                      <Radar name="Domain Score (%)" dataKey="score" stroke="#818cf8" fill="#6366f1" fillOpacity={0.35} />
                      <Tooltip contentStyle={{ backgroundColor: '#181b21', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(value: any) => [`${value}%`, 'Score']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* ETI Data Card */}
        {(() => {
          const etiData = typeof telemetry?.eti_data === 'string' 
            ? JSON.parse(telemetry.eti_data) 
            : telemetry?.eti_data || (telemetry as any)?.etiData;

          const etiScore = etiData?.eti ?? telemetry?.eti_score;

          if (engineStatus === 'cold_start' || etiScore == null) {
            return null;
          }

          const avoidanceFlag = etiData?.avoidance_flag ?? etiData?.avoidanceFlag ?? false;
          const attendanceRatio = etiData?.attendance_ratio ?? etiData?.attendanceRatio ?? 0;
          const followThroughRatio = etiData?.follow_through_ratio ?? etiData?.followThroughRatio ?? 0;
          const recencyFactor = etiData?.recency_factor ?? etiData?.recencyFactor ?? 0;
          const avoidanceRatio = etiData?.avoidance_ratio ?? etiData?.avoidanceRatio ?? 0;

          return (
            <motion.div variants={item} className="bento-card col-span-12">
              <h3 className="text-h3 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Engagement Trajectory Index (ETI)
              </h3>
              
              {avoidanceFlag && (
                <div style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1.25rem'
                }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>Chronic No-Show Pattern ({avoidanceRatio}% avoidance)</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Attendance Ratio</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{attendanceRatio}%</p>
                </div>
                <div style={{ backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Follow-Through</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{followThroughRatio}%</p>
                </div>
                <div style={{ backgroundColor: 'var(--color-bg)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <p className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Recency Factor</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{recencyFactor}%</p>
                </div>
              </div>
              
              <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99, 102, 241, 0.3)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#818cf8', marginBottom: '0.5rem' }}>Master ETI Score</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
                  {etiScore !== null ? etiScore : 'N/A'}<span style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', fontWeight: 500 }}> / 100</span>
                </p>
              </div>
            </motion.div>
          );
        })()}

        {/* Tension Alerts (Full-Width Card in Telemetry Tab) */}
        {telemetry && telemetry.data_completeness > 0 && (() => {
          const tensionWarnings: string[] = [];
          if (telemetry.tensions) {
            if (Math.abs(telemetry.tensions.T_cognitive_emotional ?? 0) > 0.3) {
              tensionWarnings.push('High Cognitive / Emotional Tension Detected');
            }
            if (Math.abs(telemetry.tensions.T_social_home ?? 0) > 0.3) {
              tensionWarnings.push('High Social / Home Dynamics Tension Detected');
            }
            if (Math.abs(telemetry.tensions.T_internal_external ?? 0) > 0.3) {
              tensionWarnings.push('High Internal / External Tension Detected');
            }
          }

          if (tensionWarnings.length === 0) return null;

          return (
            <motion.div variants={item} className="bento-card col-span-12">
              <h3 className="text-h3 mb-4 flex items-center gap-2" style={{ color: '#f59e0b' }}>
                <AlertTriangle size={18} /> Cross-Domain Tension Warnings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tensionWarnings.map((warn, idx) => (
                  <div key={idx} style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{warn}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
        {/* End of Telemetry tab */}
        </>
        )}
        
        {/* History Timeline */}
        {activeTab === 'profile' && (
        <motion.div variants={item} className="bento-card col-span-12">
          <div className="flex justify-between items-center mb-6 mobile-stack mobile-stack-start" style={{ gap: '1rem' }}>
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
                            {(item.assessment_data as any[]).map((a: any, i: number) => {
                              const rawScoreValues = Object.values(a.responses) as number[];
                              const totalScore = rawScoreValues.reduce((sum, val) => sum + (val || 0), 0);
                              const totalQs = a.total_questions || 8;
                              const maxPossible = (a.type === 'COMPE' || a.type === 'MIX') ? totalQs * 4 : 'N/A';
                              const percentage = maxPossible !== 'N/A' && maxPossible > 0 ? Math.round((totalScore / (maxPossible as number)) * 100) : null;
                              return (
                                <span key={i} style={{ fontSize: '0.875rem', fontWeight: 500, color: '#10b981' }}>
                                  {a.title}: {percentage !== null ? `${percentage}%` : totalScore}
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
                                {(item.assessment_data as any[]).map((a: any, i: number) => (
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
        )}
      </div>

      {/* ── Tag Assignment Modal ── */}
      <AnimatePresence>
        {isTagModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsTagModalOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
            >
              {/* Modal Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Tag size={16} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Manage Tags</h3>
                </div>
                <button onClick={() => setIsTagModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: '0.875rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  style={{ fontSize: '0.875rem', padding: '0.5rem 0.875rem' }}
                  autoFocus
                />
              </div>

              {/* Scrollable Tag List */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {(() => {
                  const filtered = allTags.filter(t =>
                    t.tag_name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
                    (t.tag_category || '').toLowerCase().includes(tagSearchQuery.toLowerCase())
                  );
                  const grouped = filtered.reduce((acc: Record<string, any[]>, tag: any) => {
                    const cat = tag.tag_category || 'General';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(tag);
                    return acc;
                  }, {});
                  if (Object.keys(grouped).length === 0) return (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>No tags found.</p>
                  );
                  return Object.entries(grouped).map(([cat, catTags]) => (
                    <div key={cat}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>{cat}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {(catTags as any[]).map((tag: any) => {
                          const isAssigned = studentTags.some(t => t.id === tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => handleToggleTag(tag)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', backgroundColor: isAssigned ? `${tag.color_hex}15` : 'transparent', transition: 'background-color 0.15s ease' }}
                              onMouseEnter={e => { if (!isAssigned) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = isAssigned ? `${tag.color_hex}15` : 'transparent'; }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: tag.color_hex, flexShrink: 0 }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: isAssigned ? tag.color_hex : 'var(--color-text)' }}>{tag.tag_name}</span>
                              </span>
                              {isAssigned && (
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: `${tag.color_hex}25`, color: tag.color_hex }}>ASSIGNED</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
                {allTags.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0' }}>No system tags have been created yet.</p>}
              </div>

              {/* Footer */}
              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{studentTags.length} tag{studentTags.length !== 1 ? 's' : ''} assigned</span>
                <button onClick={() => setIsTagModalOpen(false)} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
