import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getAvailableCapacityForDateRange } from '../lib/capacity';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Array of next 7 days info (date object, formatted string, capacity info, logs array)
  const [boardDays, setBoardDays] = useState<any[]>([]);

  // 1. Trigger refetch logic
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchBoardData() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6);
      
      const startStr = today.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // 1. Fetch Capacity Data
      const capacityData = await getAvailableCapacityForDateRange(today, 7);

      // 2. Fetch Logs (Overdue + Next 7 days)
      const { data: logsData, error: logsError } = await supabase
        .from('PsychE_Counseling_Logs')
        .select(`
          id, scheduled_date, reason, student_uuid,
          PsychE_Students (full_name, risk_level, engagement_modifier)
        `)
        .eq('session_status', 'Scheduled')
        .lte('scheduled_date', endStr)
        .order('scheduled_date', { ascending: true });

      if (logsError) {
        console.error('Error fetching logs:', logsError);
      }

      // 3. Assemble columns
      const daysArray = [];
      
      // -- OVERDUE COLUMN --
      const overdueLogs = (logsData || []).filter(log => log.scheduled_date < startStr);
      if (overdueLogs.length > 0) {
        daysArray.push({
          dateStr: 'overdue',
          label: 'Overdue',
          isOverdue: true,
          capacity: { booked: overdueLogs.length, total: overdueLogs.length }, // Not really applicable for capacity
          logs: overdueLogs
        });
      }

      // -- ROLLING 7 DAYS --
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dStr = d.toISOString().split('T')[0];
        
        const dayLogs = (logsData || []).filter(log => log.scheduled_date === dStr);
        
        daysArray.push({
          dateStr: dStr,
          label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          isOverdue: false,
          capacity: capacityData[dStr],
          logs: dayLogs
        });
      }

      setBoardDays(daysArray);
      setLoading(false);
    }
    
    fetchBoardData();
  }, [refreshKey]);

  const handleDragStart = (e: React.DragEvent, logId: string) => {
    e.dataTransfer.setData('text/plain', logId);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: make it slightly transparent while dragging
    setTimeout(() => {
      (e.target as HTMLElement).style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string, isOverdue: boolean, booked: number, total: number) => {
    e.preventDefault();
    const logId = e.dataTransfer.getData('text/plain');
    if (!logId) return;

    if (isOverdue) {
      alert("Cannot drop a session into the 'Overdue' column. Please select a specific date.");
      return;
    }

    if (booked >= total) {
      if (!window.confirm(`This day is at full capacity (${booked}/${total}). Are you sure you want to overbook?`)) {
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('PsychE_Counseling_Logs')
        .update({ scheduled_date: targetDateStr })
        .eq('id', logId);
        
      if (error) throw error;
      
      setRefreshKey(prev => prev + 1); // Trigger refresh
    } catch (error) {
      console.error('Error updating log date:', error);
      alert('Failed to move the session.');
      setLoading(false);
    }
  };

  const handleNoShow = async (e: React.MouseEvent, logId: string, studentUuid: string, currentEngagement: number = 0) => {
    e.stopPropagation();
    setLoading(true);

    try {
      // 1. Mark session as No_Show
      const { error: logError } = await supabase
        .from('PsychE_Counseling_Logs')
        .update({ session_status: 'No_Show' })
        .eq('id', logId);
        
      if (logError) throw logError;

      // 2. Decrement engagement modifier
      const { error: studentError } = await supabase
        .from('PsychE_Students')
        .update({ engagement_modifier: currentEngagement - 1 })
        .eq('id', studentUuid);

      if (studentError) throw studentError;

      // 3. Refresh board
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error marking no-show:', error);
      alert('Failed to mark session as No-Show.');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading Planner...</div>;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-h1 flex items-center gap-3"><LayoutDashboard size={28} /> 7-Day Planner</h1>
          <p className="text-muted">Manage your upcoming scheduled sessions.</p>
        </div>
      </div>

      {/* Horizontal Scroll Kanban Container */}
      <div style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        overflowX: 'auto', 
        paddingBottom: '1rem',
        minHeight: '60vh'
      }}>
        
        {boardDays.map((day) => {
          const isFull = day.capacity.booked >= day.capacity.total;
          
          return (
            <motion.div 
              key={day.dateStr}
              variants={item}
              style={{
                minWidth: '320px',
                width: '320px',
                flexShrink: 0,
                backgroundColor: 'rgba(24, 27, 33, 0.4)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '1.25rem',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: day.isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0,0,0,0.2)',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)'
              }}>
                <h3 className="text-h3" style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: day.isOverdue ? '#ef4444' : 'inherit' }}>{day.label}</h3>
                {!day.isOverdue && (
                  <div className="flex items-center gap-2">
                    <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(100, (day.capacity.booked / day.capacity.total) * 100)}%`,
                        backgroundColor: isFull ? 'var(--color-danger)' : 'var(--color-primary)',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, color: isFull ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {day.capacity.booked} / {day.capacity.total} Slots
                    </span>
                  </div>
                )}
                {day.isOverdue && (
                  <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444' }}>
                    {day.logs.length} Missed Session{day.logs.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Cards Container */}
              <div 
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day.dateStr, day.isOverdue, day.capacity?.booked || 0, day.capacity?.total || 0)}
              >
                {day.logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    No sessions scheduled.
                  </div>
                ) : (
                  day.logs.map((log: any) => {
                    const student = log.PsychE_Students;
                    const riskLevel = student?.risk_level || 'Low';
                    
                    return (
                      <div 
                        key={log.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, log.id)}
                        onDragEnd={handleDragEnd}
                        style={{
                          backgroundColor: day.isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'var(--color-surface)',
                          border: `1px solid ${day.isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          boxShadow: 'var(--shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                        }}
                      >
                        <div className="flex justify-between items-start mb-2" style={{ cursor: 'pointer' }} onClick={() => navigate(`/student/${log.student_uuid}`)}>
                          <h4 style={{ fontWeight: 600, fontSize: '1rem' }}>{student?.full_name}</h4>
                          {riskLevel !== 'Low' && (
                            <div style={{ 
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.7rem', fontWeight: 600,
                              backgroundColor: riskLevel === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: riskLevel === 'High' ? '#ef4444' : '#f59e0b',
                              padding: '2px 6px', borderRadius: '4px'
                            }}>
                              <AlertCircle size={12} /> {riskLevel}
                            </div>
                          )}
                        </div>
                        <p className="text-muted mb-3" style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>{log.reason}</p>
                        
                        <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/add-log?schedule_id=${log.id}`); }}
                            className="btn btn-secondary w-full"
                            style={{ 
                              padding: '0.4rem', fontSize: '0.75rem', 
                              backgroundColor: 'rgba(74, 222, 128, 0.1)', 
                              color: '#4ade80', 
                              border: '1px solid rgba(74, 222, 128, 0.2)',
                              display: 'flex', justifyContent: 'center', gap: '0.5rem'
                            }}
                          >
                            <CheckCircle2 size={14} /> Complete Session
                          </button>

                          {day.isOverdue && (
                            <button 
                              onClick={(e) => handleNoShow(e, log.id, log.student_uuid, student?.engagement_modifier)}
                              className="btn btn-secondary w-full"
                              style={{ 
                                padding: '0.4rem', fontSize: '0.75rem', 
                                backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                                color: 'rgba(239, 68, 68, 0.8)', 
                                border: '1px solid rgba(239, 68, 68, 0.1)',
                                display: 'flex', justifyContent: 'center', gap: '0.5rem'
                              }}
                            >
                              <XCircle size={14} /> Mark No-Show
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          );
        })}
        
      </div>
    </motion.div>
  );
};
