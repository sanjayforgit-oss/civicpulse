import React, { useState } from 'react';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiService } from '../../utils/apiService';

export default function RecoveryScreen({ onBackToLogin }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestRecovery = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await apiService.requestOtp(email);
      setSubmitted(true);
      setDemoOtp(res.data?.demo_otp);
    } catch (err) {
      setError(err.message || 'Failed to send recovery OTP');
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
      <button onClick={onBackToLogin} className="glass-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: '16px' }}>
        <ArrowLeft size={14} />
        Back to Login
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '12px' }}>
        <KeyRound size={24} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Account Recovery</h2>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Enter your registered email address to receive an account recovery access OTP.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', textAlign: 'center' }}>
          <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
          <h4 style={{ color: '#6ee7b7', marginBottom: '4px' }}>Recovery OTP Sent!</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            A demo recovery code has been dispatched for <strong>{email}</strong>.
          </p>
          <div style={{ padding: '8px 12px', background: 'rgba(14, 165, 233, 0.15)', borderRadius: '6px', fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
            💡 Demo Recovery OTP: {demoOtp}
          </div>
        </div>
      ) : (
        <form onSubmit={handleRequestRecovery} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Registered Email Address:
            </label>
            <input
              type="email"
              required
              className="glass-input"
              placeholder="citizen@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-btn glass-btn-primary"
            style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1rem' }}
          >
            <span>{loading ? 'Sending Code...' : 'Send Recovery Code'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
