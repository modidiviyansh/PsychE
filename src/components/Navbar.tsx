import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Activity, LogOut, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const { data, error } = await supabase
        .from('PsychE_Students')
        .select('id, full_name, student_id')
        .or(`full_name.ilike.%${searchQuery}%,student_id.ilike.%${searchQuery}%,mobile.ilike.%${searchQuery}%`)
        .limit(5);

      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    };

    const debounceTimer = setTimeout(fetchSearchResults, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSelectStudent = (id: string) => {
    setSearchQuery('');
    setSearchResults([]);
    navigate(`/student/${id}`);
  };

  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="navbar no-print" 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        backgroundColor: 'rgba(24, 27, 33, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(94, 106, 210, 0.3)'
            }}
          >
            <BookOpen size={20} />
          </motion.div>
          <div className="flex" style={{ flexDirection: 'column' }}>
            <span className="text-h3" style={{ letterSpacing: '-0.02em', lineHeight: '1.2' }}>PsychE CRM</span>
            <span className="text-muted" style={{ fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>GCM Convent School</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-center" style={{ flex: 1, maxWidth: '500px', margin: '0 2rem' }} ref={searchRef}>
        <motion.div 
          whileFocus={{ scale: 1.02 }}
          style={{ position: 'relative', width: '100%' }}
        >
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} size={18} />
          <input 
            type="text" 
            placeholder="Search students by Name, ID, or Phone..." 
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              paddingLeft: '48px', 
              borderRadius: 'var(--radius-full)', 
              backgroundColor: 'rgba(15, 17, 21, 0.5)',
              border: '1px solid var(--color-border)',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
          />
          
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden',
                  zIndex: 100
                }}
              >
                {searchResults.map((student) => (
                  <div 
                    key={student.id}
                    onClick={() => handleSelectStudent(student.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ fontWeight: 500 }}>{student.full_name}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{student.student_id}</div>
                  </div>
                ))}
              </motion.div>
            )}
            
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-lg)'
                }}
              >
                <p className="text-muted">No students found.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="flex items-center gap-4">
        <motion.button 
          onClick={() => navigate('/add-student')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none', boxShadow: '0 4px 12px rgba(94, 106, 210, 0.3)' }}
        >
          <UserPlus size={16} />
          Add Student
        </motion.button>
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-border)' }}></div>
        <motion.button 
          whileHover={{ scale: 1.1, color: 'var(--color-primary)' }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-secondary" style={{ padding: '0.5rem', background: 'transparent', border: 'none' }} title="Activity Logs"
        >
          <Activity size={20} />
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, color: 'var(--color-danger)' }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-secondary" style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--color-text-muted)' }} title="Logout"
        >
          <LogOut size={20} />
        </motion.button>
      </div>
    </motion.nav>
  );
};
