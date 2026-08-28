import React, { useState } from 'react';
import { Fingerprint, ShieldAlert, AlertCircle, CheckCircle2, UserCheck, Eye, EyeOff } from 'lucide-react';
import { apiService } from '../../utils/apiService';

export default function DemoIdentityScreen({ email, password, preferredLang, onRegistrationSuccess }) {
  const [demoAadhaar, setDemoAadhaar] = useState('900100001234');
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const seedOptions = [
    { num: '900100001234', status: 'Unused Seed' },
    { num: '900100001235', status: 'Unused Seed' },
    { num: '900100001236', status: 'Unused Seed' },
    { num: '900100001237', status: 'Unused Seed' }
  ];

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const cleanNum = demoAadhaar.replace(/\s/g, '');
    if (cleanNum.length !== 12) {
      setError('Please enter a valid 12-digit synthetic demo identity number.');
      return;
    }

    try {
      setLoading(true);
      
      // 1. Check identity availability
      const checkRes = await apiService.checkDemoIdentity(cleanNum);
      if (!checkRes.valid) {
        setError(checkRes.message);
        setLoading(false);
        return;
      }

      // 2. Submit citizen registration
      const regRes = await apiService.registerCitizen({
        email,
        demo_aadhaar_number: cleanNum,
        preferred_language: preferredLang,
        password
      });

      onRegistrationSuccess(regRes);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '460px',
      margin: '20px auto',
      padding: '28px 24px'
    }} className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '12px' }}>
        <Fingerprint size={26} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Demo Identity Verification</h2>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Step 3 of 3: Enter a synthetic demo Aadhaar number to complete registration.
      </p>

      {/* MANDATORY HACKATHON DISCLAIMER BANNER */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(245, 158, 11, 0.15)',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        borderRadius: '10px',
        marginBottom: '20px',
        fontSize: '0.8rem',
        color: '#fcd34d',
        lineHeight: '1.4'
      }}>
        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <ShieldAlert size={16} />
          <span>Demo Identity Verification Disclaimer</span>
        </div>
        This hackathon prototype uses synthetic identity data and does not connect to UIDAI.
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Seed helper selection buttons */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          Select a synthetic demo Aadhaar seed value for testing:
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {seedOptions.map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => setDemoAadhaar(item.num)}
              className="glass-btn"
              style={{
                fontSize: '0.8rem',
                justify: 'center',
                borderColor: demoAadhaar === item.num ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
                background: demoAadhaar === item.num ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.04)'
              }}
            >
              {item.num}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
            Synthetic Demo Aadhaar Number:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showAadhaar ? 'text' : 'password'}
              required
              maxLength={12}
              className="glass-input"
              style={{ fontSize: '1.1rem', letterSpacing: '2px', fontWeight: 600 }}
              placeholder="900100001234"
              value={demoAadhaar}
              onChange={(e) => setDemoAadhaar(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowAadhaar(!showAadhaar)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              {showAadhaar ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6ee7b7', marginTop: '4px', fontStyle: 'italic' }}>
            🔒 Hashed & verified against mock_identity table. Identity never exposed in APIs.
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="glass-btn glass-btn-primary"
          style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1rem', marginTop: '6px' }}
        >
          <UserCheck size={18} />
          <span>{loading ? 'Verifying & Registering...' : 'Verify Demo Identity & Create Account'}</span>
        </button>
      </form>
    </div>
  );
}
