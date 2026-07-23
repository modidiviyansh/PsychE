import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getAvailableCapacityForDateRange } from '../lib/capacity';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const AddLog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledStudentId = searchParams.get('student');
  const scheduleId = searchParams.get('schedule_id');

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [studentUuid, setStudentUuid] = useState(prefilledStudentId || '');
  const [counselorName, setCounselorName] = useState('Dr. Sarah Smith'); // Default for now
  const [reason, setReason] = useState('');
  const [studentResponse, setStudentResponse] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [fileUpdated, setFileUpdated] = useState(true);
  const [notificationSent, setNotificationSent] = useState(false);
  const [interactionType, setInteractionType] = useState('Session');
  const [followUpDate, setFollowUpDate] = useState('');

  const [capacityData, setCapacityData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase.from('PsychE_Students').select('id, full_name, student_id');
      if (data) setStudents(data);
    }
    async function fetchScheduledLog() {
      if (!scheduleId) return;
      const { data } = await supabase.from('PsychE_Counseling_Logs').select('*').eq('id', scheduleId).single();
      if (data) {
        setStudentUuid(data.student_uuid);
        setReason(data.reason);
        setCounselorName(data.counselor_name || 'Dr. Sarah Smith');
      }
    }
    async function fetchCapacity() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cap = await getAvailableCapacityForDateRange(today, 7);
      
      const arr = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        arr.push({
          dateStr: dStr,
          label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          capacity: cap[dStr]
        });
      }
      setCapacityData(arr);
    }
    fetchStudents();
    fetchScheduledLog();
    fetchCapacity();
  }, [scheduleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (scheduleId) {
        // Update the existing scheduled session
        const { error } = await supabase.from('PsychE_Counseling_Logs')
          .update({
            session_status: 'Completed',
            session_date: new Date().toISOString(),
            counselor_name: counselorName,
            reason: reason,
            student_response: studentResponse,
            recommended_action: recommendedAction,
            file_updated: fileUpdated,
            notification_sent: notificationSent,
            interaction_type: interactionType,
            follow_up_date: followUpDate || null,
            follow_up_status: followUpDate ? 'Pending' : null
          })
          .eq('id', scheduleId);
        
        if (error) throw error;
      } else {
        // Insert a new log
        const { error } = await supabase.from('PsychE_Counseling_Logs').insert([
          {
            student_uuid: studentUuid,
            counselor_name: counselorName,
            session_date: new Date().toISOString(),
            reason,
            student_response: studentResponse,
            recommended_action: recommendedAction,
            file_updated: fileUpdated,
            notification_sent: notificationSent,
            interaction_type: interactionType,
            follow_up_date: followUpDate || null,
            follow_up_status: followUpDate ? 'Pending' : null,
            session_status: 'Completed',
            scheduled_date: new Date().toISOString().split('T')[0]
          }
        ]);
        if (error) throw error;
      }
      
      // Schedule the next touchpoint if followUpDate is set
      if (followUpDate) {
        const followUpIso = new Date(followUpDate).toISOString();
        await supabase.from('PsychE_Counseling_Logs').insert([
          {
            student_uuid: studentUuid,
            counselor_name: counselorName,
            session_date: followUpIso,
            scheduled_date: followUpDate,
            reason: 'Follow-up for: ' + reason,
            session_status: 'Scheduled',
            interaction_type: 'Session'
          }
        ]);
      }
      
      // Success - navigate back to the student profile or dashboard
      navigate(studentUuid ? `/student/${studentUuid}` : '/');
    } catch (error) {
      console.error('Error saving log:', error);
      alert('Failed to save log. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0', maxWidth: '800px', margin: '0 auto' }}>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-h1">{scheduleId ? 'Complete Scheduled Session' : 'Log a Counseling Session'}</h1>
          <p className="text-muted">{scheduleId ? 'Add your notes and mark this scheduled session as complete.' : 'Record details of the session for the student\'s file.'}</p>
        </div>
      </div>

      <motion.div className="bento-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} className="flex" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Select Student *</label>
              <select 
                required
                className="input"
                value={studentUuid}
                onChange={(e) => setStudentUuid(e.target.value)}
                style={{ appearance: 'auto' }}
                disabled={!!scheduleId}
              >
                <option value="">-- Select a Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Counselor Name *</label>
              <input 
                required
                type="text" 
                className="input" 
                value={counselorName}
                onChange={(e) => setCounselorName(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Interaction Type</label>
              <select 
                className="input"
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value)}
                style={{ appearance: 'auto' }}
              >
                <option value="Session">Session</option>
                <option value="Quick Note">Quick Note</option>
                <option value="Parent Contact">Parent Contact</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Primary Reason / Topic *</label>
            <input 
              required
              type="text" 
              className="input" 
              placeholder="e.g. Academic Stress, Career Guidance, Peer Conflict"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div>
            <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Session Notes & Student Response</label>
            <textarea 
              className="input" 
              rows={4}
              placeholder="Detail the discussion and the student's reaction..."
              value={studentResponse}
              onChange={(e) => setStudentResponse(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Recommended Action</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Discussed study habits, Notified parents"
                value={recommendedAction}
                onChange={(e) => setRecommendedAction(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Schedule Next Touchpoint (Optional)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {capacityData.map((day) => {
                const isFull = day.capacity.booked >= day.capacity.total;
                const isSelected = followUpDate === day.dateStr;
                
                return (
                  <div 
                    key={day.dateStr}
                    onClick={() => {
                      if (isSelected) {
                        setFollowUpDate('');
                      } else {
                        // Allow overriding by still clicking it, but warn
                        if (isFull && !window.confirm(`This day is at full capacity (${day.capacity.booked}/${day.capacity.total}). Are you sure you want to overbook?`)) {
                          return;
                        }
                        setFollowUpDate(day.dateStr);
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? 'var(--color-primary)' : isFull ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                      backgroundColor: isSelected ? 'rgba(94, 106, 210, 0.2)' : isFull ? 'rgba(239, 68, 68, 0.05)' : 'rgba(24, 27, 33, 0.5)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '90px'
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: isSelected ? 600 : 400, color: isFull && !isSelected ? 'var(--color-danger)' : 'inherit' }}>{day.label}</span>
                    <span style={{ fontSize: '0.75rem', color: isFull && !isSelected ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{day.capacity.booked}/{day.capacity.total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-4 items-center mt-2">
            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={fileUpdated}
                onChange={(e) => setFileUpdated(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span className="text-body" style={{ fontSize: '0.875rem' }}>Physical File Updated</span>
            </label>

            <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={notificationSent}
                onChange={(e) => setNotificationSent(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span className="text-body" style={{ fontSize: '0.875rem' }}>Notification Sent to Guardian</span>
            </label>
          </div>

          <div className="flex justify-end mt-4">
            <motion.button 
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none', padding: '0.75rem 2rem' }}
            >
              {loading ? 'Saving...' : <><Save size={18} /> Save Record</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
