import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const AddStudent: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [fathersName, setFathersName] = useState('');
  const [mothersName, setMothersName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [enrolledDate, setEnrolledDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.from('PsychE_Students').insert([
        {
          student_id: studentId,
          full_name: fullName,
          fathers_name: fathersName,
          mothers_name: mothersName,
          mobile,
          email,
          course,
          enrolled_date: enrolledDate
        }
      ]).select('id').single();

      if (error) throw error;
      
      // Success - navigate to the new student's profile
      if (data?.id) {
        navigate(`/student/${data.id}`);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Error adding student:', error);
      alert(`Failed to add student. ${error.message}`);
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
          <h1 className="text-h1 flex items-center gap-2"><User size={28} /> Add New Student</h1>
          <p className="text-muted">Register a new student in the GCM Convent School database.</p>
        </div>
      </div>

      <motion.div className="bento-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} className="flex" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Student ID *</label>
              <input 
                required
                type="text" 
                className="input" 
                placeholder="e.g. STU-2026-105"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Full Name *</label>
              <input 
                required
                type="text" 
                className="input" 
                placeholder="Student's full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Father's Name</label>
              <input 
                type="text" 
                className="input" 
                value={fathersName}
                onChange={(e) => setFathersName(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Mother's Name</label>
              <input 
                type="text" 
                className="input" 
                value={mothersName}
                onChange={(e) => setMothersName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Mobile Number</label>
              <input 
                type="text" 
                className="input" 
                placeholder="+91..."
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
              <input 
                type="email" 
                className="input" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Course / Class *</label>
              <input 
                required
                type="text" 
                className="input" 
                placeholder="e.g. 10th Grade, Section A"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-h3" style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.5rem' }}>Enrollment Date</label>
              <input 
                type="date" 
                className="input" 
                value={enrolledDate}
                onChange={(e) => setEnrolledDate(e.target.value)}
              />
            </div>
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
              {loading ? 'Saving...' : <><Save size={18} /> Add Student</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
