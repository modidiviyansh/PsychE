import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const AllLogs: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAllLogs() {
      try {
        const { data, error } = await supabase
          .from('PsychE_Counseling_Logs')
          .select(`
            id,
            reason,
            session_date,
            student_uuid,
            PsychE_Students (full_name)
          `)
          .order('session_date', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error('Error fetching all logs:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAllLogs();
  }, []);

  const getColorForReason = (reason: string) => {
    if (reason.toLowerCase().includes('stress')) return '#e25b5b';
    if (reason.toLowerCase().includes('career')) return '#5e6ad2';
    if (reason.toLowerCase().includes('conflict')) return '#f59e0b';
    return '#4ade80';
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-h1 flex items-center gap-3">
            <Clock size={28} /> All Counseling Records
          </h1>
          <p className="text-muted">Viewing all documented counseling sessions.</p>
        </div>
      </div>

      <motion.div className="bento-card">
        {loading ? (
          <p className="text-muted text-center py-4">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-muted text-center py-4">No records found.</p>
        ) : (
          <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
            {logs.map((log) => (
              <motion.div 
                key={log.id}
                onClick={() => navigate(`/student/${log.student_uuid}`)}
                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.03)' }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getColorForReason(log.reason) }}></div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{log.PsychE_Students?.full_name}</p>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>{log.reason}</p>
                  </div>
                </div>
                <div className="text-right text-muted" style={{ fontSize: '0.875rem' }}>
                  {new Date(log.session_date).toLocaleString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
