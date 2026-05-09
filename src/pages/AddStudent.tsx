import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowLeft, Save, User, Edit2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const AddStudent: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  // Form State
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [fathersName, setFathersName] = useState('');
  const [mothersName, setMothersName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [enrolledDate, setEnrolledDate] = useState(new Date().toISOString().split('T')[0]);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setIsEdit(true);
      fetchStudentData(id);
    }
  }, [id]);

  const fetchStudentData = async (studentUuid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('PsychE_Students')
        .select('*')
        .eq('id', studentUuid)
        .single();
        
      if (error) throw error;
      if (data) {
        setStudentId(data.student_id || '');
        setFullName(data.full_name || '');
        setFathersName(data.fathers_name || '');
        setMothersName(data.mothers_name || '');
        setMobile(data.mobile || '');
        setEmail(data.email || '');
        setCourse(data.course || '');
        setEnrolledDate(data.enrolled_date ? data.enrolled_date.split('T')[0] : '');
        setProfileImage(data.profile_image || null);
      }
    } catch (error) {
      console.error("Error fetching student:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      alert("Image must be smaller than 100KB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        student_id: studentId,
        full_name: fullName,
        fathers_name: fathersName,
        mothers_name: mothersName,
        mobile,
        email,
        course,
        enrolled_date: enrolledDate,
        profile_image: profileImage
      };

      let result;
      if (isEdit) {
        result = await supabase.from('PsychE_Students').update(payload).eq('id', id).select('id').single();
      } else {
        result = await supabase.from('PsychE_Students').insert([payload]).select('id').single();
      }

      if (result.error) throw result.error;
      
      // Success - navigate to the new student's profile
      if (result.data?.id) {
        navigate(`/student/${result.data.id}`);
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
          <h1 className="text-h1 flex items-center gap-2">
            {isEdit ? <Edit2 size={28} /> : <User size={28} />} 
            {isEdit ? 'Edit Student Profile' : 'Add New Student'}
          </h1>
          <p className="text-muted">
            {isEdit ? 'Update student details and profile picture.' : 'Register a new student in the GCM Convent School database.'}
          </p>
        </div>
      </div>

      <motion.div className="bento-card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit} className="flex" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="flex justify-center mb-2">
            <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px dashed rgba(255,255,255,0.2)', transition: 'all 0.2s ease' }}>
              {profileImage ? (
                <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={32} color="rgba(255,255,255,0.3)" />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </div>
          </div>
          <p className="text-center text-muted" style={{ marginTop: '-1rem', fontSize: '0.75rem' }}>Upload Photo (Max 100kb)</p>

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
              {loading ? 'Saving...' : <><Save size={18} /> {isEdit ? 'Save Changes' : 'Add Student'}</>}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
