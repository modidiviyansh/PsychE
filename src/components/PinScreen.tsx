import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PinScreenProps {
  children: React.ReactNode;
}

export const PinScreen: React.FC<PinScreenProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [allowedPins, setAllowedPins] = useState<string[]>(['2001', '0987', '0999', '2580']);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      // Fetch allowed pins from settings
      const { data, error } = await supabase.from('PsychE_Settings').select('allowed_pins').single();
      if (data && data.allowed_pins) {
        setAllowedPins(data.allowed_pins.split(',').map((p: string) => p.trim()));
      }
      
      // Check if user is already authenticated in this session
      const authStatus = localStorage.getItem('psyche_auth_status');
      if (authStatus === 'verified') {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    }
    
    initAuth();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allowedPins.includes(pin)) {
      setIsAuthenticated(true);
      localStorage.setItem('psyche_auth_status', 'verified');
    } else {
      setError('Incorrect PIN. Access denied.');
      setPin('');
      
      // Clear error after 3 seconds
      setTimeout(() => {
        setError('');
      }, 3000);
    }
  };

  const handleKeyPress = (value: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + value);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-background)' }}><p className="text-muted">Loading...</p></div>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: 'var(--color-background)',
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(94, 106, 210, 0.15) 0%, transparent 50%)'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bento-card"
        style={{
          maxWidth: '400px',
          width: '100%',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary), #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          boxShadow: '0 8px 16px rgba(94, 106, 210, 0.4)'
        }}>
          <Lock size={28} color="white" />
        </div>
        
        <h2 className="text-h2 mb-2" style={{ textAlign: 'center' }}>Restricted Access</h2>
        <p className="text-muted mb-6" style={{ textAlign: 'center', fontSize: '0.875rem' }}>
          Please enter your counselor PIN to access the PsychE Dashboard.
        </p>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* PIN Display */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {[0, 1, 2, 3].map(index => (
              <div 
                key={index}
                style={{
                  width: '45px',
                  height: '55px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(24, 27, 33, 0.6)',
                  border: `2px solid ${pin.length > index ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  boxShadow: pin.length > index ? '0 0 10px rgba(94, 106, 210, 0.2)' : 'none'
                }}
              >
                {pin.length > index ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          {/* Number Pad */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num.toString())}
                className="btn btn-secondary"
                style={{ padding: '1rem', fontSize: '1.25rem', fontWeight: 600, border: 'none', backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                {num}
              </button>
            ))}
            <div></div>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="btn btn-secondary"
              style={{ padding: '1rem', fontSize: '1.25rem', fontWeight: 600, border: 'none', backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-secondary"
              style={{ padding: '1rem', fontSize: '1rem', fontWeight: 600, border: 'none', backgroundColor: 'transparent' }}
            >
              ⌫
            </button>
          </div>

          <button 
            type="submit" 
            disabled={pin.length < 4}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '1rem',
              background: pin.length === 4 ? 'linear-gradient(135deg, var(--color-primary), #8b5cf6)' : 'var(--color-surface)',
              color: pin.length === 4 ? 'white' : 'var(--color-text-muted)',
              border: 'none',
              opacity: pin.length === 4 ? 1 : 0.5,
              cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s'
            }}
          >
            Unlock Access
          </button>
        </form>
      </motion.div>
    </div>
  );
};
