import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getAvailableCapacityForDateRange } from '../lib/capacity';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const BulkSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchData() {
      // Fetch students who don't have any logs (or just fetch all, but let's fetch all for simplicity, maybe ordered by enrollment)
      const { data, error } = await supabase
        .from('PsychE_Students')
        .select('id, full_name, student_id, course')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setStudents(data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length && students.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAutoSchedule = async () => {
    if (selectedIds.size === 0) return;
    setScheduling(true);

    try {
      const selectedStudents = students.filter(s => selectedIds.has(s.id));
      
      // We need enough capacity for all selected students. Let's fetch next 30 days.
      const start = new Date(startDate);
      const capacityData = await getAvailableCapacityForDateRange(start, 30);
      
      // Convert to array and sort by date ascending
      const availableDays = Object.keys(capacityData).sort().map(date => ({
        date,
        available: capacityData[date].available
      }));

      const logsToInsert: any[] = [];
      let dayIndex = 0;
      let studentsScheduled = 0;

      for (const student of selectedStudents) {
        // Find next day with available capacity
        while (dayIndex < availableDays.length && availableDays[dayIndex].available <= 0) {
          dayIndex++;
        }

        if (dayIndex >= availableDays.length) {
          alert(`Not enough capacity in the next 30 days to schedule all students. Scheduled ${studentsScheduled} students.`);
          break;
        }

        // Assign to this day
        const assignedDate = availableDays[dayIndex].date;
        availableDays[dayIndex].available--;
        studentsScheduled++;

        logsToInsert.push({
          student_uuid: student.id,
          counselor_name: 'System Auto-Scheduler',
          session_date: new Date(assignedDate).toISOString(), // Dummy time, it's just scheduled
          scheduled_date: assignedDate,
          session_status: 'Scheduled',
          reason: 'Initial Assessment',
          interaction_type: 'Session'
        });
      }

      if (logsToInsert.length > 0) {
        const { error } = await supabase.from('PsychE_Counseling_Logs').insert(logsToInsert);
        if (error) throw error;
        
        alert(`Successfully scheduled ${studentsScheduled} sessions!`);
        setSelectedIds(new Set());
        navigate('/kanban');
      }
    } catch (error: any) {
      console.error('Scheduling error:', error);
      alert('Failed to auto-schedule: ' + error.message);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-h1 flex items-center gap-3"><Calendar size={28} /> Bulk Auto-Scheduler</h1>
          <p className="text-muted">Select students to automatically distribute their initial sessions across available capacity.</p>
        </div>
      </div>

      <div className="bento-grid">
        <motion.div className="bento-card" style={{ gridColumn: 'span 4' }}>
          <h3 className="text-h3 mb-4">Configuration</h3>
          
          <div className="mb-6">
            <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Start Date</label>
            <input 
              type="date" 
              className="input" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>The system will start looking for available capacity on this date and cascade forward.</p>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontWeight: 600 }}>Students Selected:</span>
              <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{selectedIds.size}</span>
            </div>
          </div>

          <motion.button 
            disabled={selectedIds.size === 0 || scheduling}
            onClick={handleAutoSchedule}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none' }}
          >
            {scheduling ? 'Scheduling...' : 'Auto-Distribute Sessions'}
          </motion.button>
        </motion.div>

        <motion.div className="bento-card" style={{ gridColumn: 'span 8', padding: '0' }}>
          {loading ? (
            <div className="p-8 text-center text-muted">Loading students...</div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-surface)', zIndex: 10 }}>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '1rem', width: '50px' }}>
                      <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
                        {selectedIds.size === students.length && students.length > 0 ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} />}
                      </button>
                    </th>
                    <th style={{ padding: '1rem' }}>Student Name</th>
                    <th style={{ padding: '1rem' }}>ID</th>
                    <th style={{ padding: '1rem' }}>Course</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: selectedIds.has(student.id) ? 'rgba(94, 106, 210, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '1rem' }}>
                        <button onClick={() => toggleSelect(student.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
                          {selectedIds.has(student.id) ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} />}
                        </button>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>{student.full_name}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{student.student_id}</td>
                      <td style={{ padding: '1rem' }}>{student.course}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
      
    </motion.div>
  );
};
