import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Printer, ArrowLeft, CheckSquare, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const StudentDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Print State
  const [isPrinting, setIsPrinting] = useState(false);
  const [printData, setPrintData] = useState<any[]>([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('PsychE_Students')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.course && s.course.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkPrint = async () => {
    if (selectedIds.size === 0) return;
    setIsPrinting(true);

    try {
      // Fetch selected students and their logs
      const selectedStudents = students.filter(s => selectedIds.has(s.id));
      
      const { data: logsData, error: logsError } = await supabase
        .from('PsychE_Counseling_Logs')
        .select('*')
        .in('student_uuid', Array.from(selectedIds))
        .order('session_date', { ascending: false });

      if (logsError) throw logsError;

      // Group logs by student
      const logsByStudent: Record<string, any[]> = {};
      (logsData || []).forEach(log => {
        if (!logsByStudent[log.student_uuid]) {
          logsByStudent[log.student_uuid] = [];
        }
        logsByStudent[log.student_uuid].push(log);
      });

      // Build print array
      const fullPrintData = selectedStudents.map(student => ({
        student,
        logs: logsByStudent[student.id] || []
      }));

      setPrintData(fullPrintData);

      // Wait for React to render the hidden print divs, then print
      setTimeout(() => {
        window.print();
        setIsPrinting(false);
      }, 500);

    } catch (error) {
      console.error('Error preparing print data:', error);
      alert('Failed to prepare print documents.');
      setIsPrinting(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0' }}>
      
      {/* --- UI View --- */}
      <div className="no-print">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none' }}>
              <ArrowLeft size={16} /> Back
            </button>
            <h1 className="text-h1 flex items-center gap-3">
              <Users size={28} /> Student Directory
            </h1>
            <p className="text-muted">Manage and bulk-print student records.</p>
          </div>
          <div className="flex gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="btn btn-primary" 
              disabled={selectedIds.size === 0 || isPrinting}
              onClick={handleBulkPrint}
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none' }}
            >
              <Printer size={18} /> {isPrinting ? 'Preparing...' : `Print Selected (${selectedIds.size})`}
            </motion.button>
          </div>
        </div>

        <motion.div className="bento-card mb-6">
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={18} />
            <input 
              type="text" 
              placeholder="Filter by Name, ID, or Course..." 
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '48px', width: '100%', maxWidth: '500px' }}
            />
          </div>
        </motion.div>

        <motion.div className="bento-card">
          {loading ? (
            <p className="text-center py-8 text-muted">Loading directory...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '1rem', width: '50px' }}>
                      <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
                        {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} />}
                      </button>
                    </th>
                    <th style={{ padding: '1rem' }}>Student Name</th>
                    <th style={{ padding: '1rem' }}>ID</th>
                    <th style={{ padding: '1rem' }}>Course</th>
                    <th style={{ padding: '1rem' }}>Risk Level</th>
                    <th style={{ padding: '1rem' }}>Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '1rem' }}>
                        <button onClick={() => toggleSelect(student.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}>
                          {selectedIds.has(student.id) ? <CheckSquare size={20} className="text-primary" /> : <Square size={20} />}
                        </button>
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 500 }}>
                        <span onClick={() => navigate(`/student/${student.id}`)} style={{ cursor: 'pointer' }} className="hover:text-primary">
                          {student.full_name}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{student.student_id}</td>
                      <td style={{ padding: '1rem' }}>{student.course}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.2rem 0.5rem',
                          backgroundColor: student.risk_level === 'High' ? 'rgba(239, 68, 68, 0.1)' : student.risk_level === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                          color: student.risk_level === 'High' ? '#ef4444' : student.risk_level === 'Medium' ? '#f59e0b' : '#4ade80',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {student.risk_level || 'Low'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{student.enrolled_date ? new Date(student.enrolled_date).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No students match your filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* --- Print View --- */}
      {isPrinting && (
        <div className="print-only">
          {printData.map((data) => (
            <div key={data.student.id} className="page-break" style={{ display: 'block' }}>
              
              <div className="print-header">
                <h1>GCM Convent School</h1>
                <h2>Confidential Counseling Record</h2>
                <div className="print-meta">
                  <span><strong>Student:</strong> {data.student.full_name}</span>
                  <span><strong>ID:</strong> {data.student.student_id}</span>
                  <span><strong>Course:</strong> {data.student.course}</span>
                  <span><strong>Printed:</strong> {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bento-card">
                <h3>Counseling History</h3>
                {data.logs.length === 0 ? (
                  <p className="text-muted">No counseling logs found for this student.</p>
                ) : (
                  data.logs.map((log: any) => (
                    <div key={log.id} className="print-timeline-item">
                      <h4 className="text-h3">{log.reason}</h4>
                      <p className="text-muted">{log.counselor_name} • {new Date(log.session_date).toLocaleString()}</p>
                      
                      <div className="print-notes">
                        <p className="text-body" style={{ whiteSpace: 'pre-line' }}>{log.student_response || 'No notes provided.'}</p>
                      </div>
                      
                      <div className="print-action">
                        <strong>Action:</strong> {log.recommended_action || 'None'}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
            </div>
          ))}
        </div>
      )}
      
    </motion.div>
  );
};
