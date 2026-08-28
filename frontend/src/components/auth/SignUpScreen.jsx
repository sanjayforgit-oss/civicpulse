import React, { useState } from 'react';
import { Mail, Lock, UserPlus, AlertCircle, ArrowRight } from 'lucide-react';
import { apiService } from '../../utils/apiService';

export default function SignUpScreen({ selectedLang, onOtpRequested, onNavigateLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiService.requestOtp(email);
      onOtpRequested({ email, password, demoOtp: res.data?.demo_otp });
    } catch (err) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '440px',
      margin: '20px auto',
      padding: '28px 24px'
    }} className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '14px' }}>
        <UserPlus size={24} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Citizen Registration</h2>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Step 1 of 3: Enter your email to receive a verification OTP.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
            Email Address:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              required
              className="glass-input"
              placeholder="citizen@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
            Password (Optional for passwordless OTP login):
          </label>
          <input
            type="password"
            className="glass-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="glass-btn glass-btn-primary"
          style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1rem', marginTop: '8px' }}
        >
          <span>{loading ? 'Sending OTP...' : 'Send Verification OTP'}</span>
          <ArrowRight size={18} />
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <button onClick={onNavigateLogin} style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>
          Log In
        </button>
      </div>
    </div>
  );
}
