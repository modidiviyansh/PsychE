import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const AddLog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledStudentId = searchParams.get('student');

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

  useEffect(() => {
    async function fetchStudents() {
      const { data } = await supabase.from('PsychE_Students').select('id, full_name, student_id');
      if (data) setStudents(data);
    }
    fetchStudents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('PsychE_Counseling_Logs').insert([
        {
          student_uuid: studentUuid,
          counselor_name: counselorName,
          session_date: new Date().toISOString(),
          reason,
          student_response: studentResponse,
          recommended_action: recommendedAction,
          file_updated: fileUpdated,
          notification_sent: notificationSent
        }
      ]);

      if (error) throw error;
      
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
          <h1 className="text-h1">Log a Counseling Session</h1>
          <p className="text-muted">Record details of the session for the student's file.</p>
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

          <div>
            <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Recommended Action / Follow-up</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Scheduled follow-up next week, Notified parents"
              value={recommendedAction}
              onChange={(e) => setRecommendedAction(e.target.value)}
            />
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
