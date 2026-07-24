import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Settings as SettingsIcon, BookOpen, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getDailyCapacity } from '../lib/capacity';
import { LibraryManager } from '../components/LibraryManager';
import { GlobalTagManager } from '../components/GlobalTagManager';

const SystemSettingsTab: React.FC = () => {
  const [capacity, setCapacity] = useState<number>(7);
  const [allowedPins, setAllowedPins] = useState<string>('2001, 0987, 0999, 2580');
  const [appVersion, setAppVersion] = useState<string>('2.0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('PsychE_Settings').select('*').single();
      if (data) {
        setCapacity(data.daily_session_capacity || 7);
        if (data.allowed_pins) setAllowedPins(data.allowed_pins);
        if (data.app_version) setAppVersion(data.app_version);
      } else {
        const currentCapacity = await getDailyCapacity();
        setCapacity(currentCapacity);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('PsychE_Settings')
        .upsert({ 
          id: 1, 
          daily_session_capacity: capacity,
          allowed_pins: allowedPins,
          app_version: appVersion
        });
        
      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div className="bento-card" style={{ padding: '2rem' }}>
      {loading ? (
        <p className="text-muted">Loading settings...</p>
      ) : (
        <form onSubmit={handleSave} className="flex" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          
          <div>
            <label className="text-h3" style={{ fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Daily Session Capacity</label>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Maximum number of counseling sessions a counselor can take in a single day. The scheduling system will enforce this limit.</p>
            <input 
              required
              type="number" 
              min="1"
              max="50"
              className="input" 
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              style={{ maxWidth: '200px' }}
            />
          </div>

          <hr style={{ borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />

          <div>
            <label className="text-h3" style={{ fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>Allowed Security PINs</label>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Comma-separated list of 4-digit PINs authorized to unlock the application.</p>
            <input 
              required
              type="text" 
              className="input" 
              value={allowedPins}
              onChange={(e) => setAllowedPins(e.target.value)}
              placeholder="2001, 0987, 0999, 2580"
              style={{ maxWidth: '400px' }}
            />
          </div>

          <hr style={{ borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />

          <div>
            <label className="text-h3" style={{ fontSize: '1rem', display: 'block', marginBottom: '0.5rem' }}>App Version</label>
            <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Track the current version of the PsychE CRM application.</p>
            <input 
              required
              type="text" 
              className="input" 
              value={appVersion}
              onChange={(e) => setAppVersion(e.target.value)}
              placeholder="2.0"
              style={{ maxWidth: '200px' }}
            />
          </div>

          <div className="flex justify-start mt-4">
            <motion.button 
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)', border: 'none', padding: '0.75rem 2rem' }}
            >
              {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
            </motion.button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'system' | 'library' | 'tags'>('system');

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ padding: '1rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="btn btn-secondary mb-4" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', backgroundColor: 'transparent', border: 'none' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-h1 flex items-center gap-3"><SettingsIcon size={28} /> Configuration</h1>
          <p className="text-muted">Manage global settings, test libraries, and system tags.</p>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '2rem',
        paddingBottom: '0',
      }}>
        {([
          { id: 'system',  label: 'System Settings',  Icon: SettingsIcon },
          { id: 'library', label: 'Question Library',  Icon: BookOpen },
          { id: 'tags',    label: 'Global Tags',       Icon: Tag },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '0.625rem 1.125rem',
              fontSize: '0.8125rem',
              fontWeight: activeTab === id ? 600 : 500,
              color: activeTab === id ? '#f0f0f5' : '#6b7280',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === id ? '2px solid #5e6ad2' : '2px solid transparent',
              marginBottom: '-1px',
              cursor: 'pointer',
              transition: 'color 0.15s ease, border-color 0.15s ease',
              borderRadius: '0',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'system' && <SystemSettingsTab />}
      {activeTab === 'library' && <LibraryManager />}
      {activeTab === 'tags' && <GlobalTagManager />}

    </motion.div>
  );
};
