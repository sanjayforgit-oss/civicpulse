import React, { useState } from 'react';
import { MailCheck, Key, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { apiService } from '../../utils/apiService';

export default function EmailOtpScreen({ email, password, demoOtp, onOtpVerified, onBack }) {
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendMsg, setResendMsg] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (otpCode.length < 4) {
      setError('Please enter the verification OTP code.');
      return;
    }

    try {
      setLoading(true);
      await apiService.verifyOtp(email, otpCode);
      onOtpVerified({ email, password });
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setError('');
      setResendMsg('');
      const res = await apiService.requestOtp(email);
      setResendMsg(`New OTP sent! Demo OTP: ${res.data?.demo_otp}`);
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    }
  };

  return (
    <div style={{
      maxWidth: '440px',
      margin: '20px auto',
      padding: '28px 24px'
    }} className="glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '14px' }}>
        <MailCheck size={24} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Email Verification</h2>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
        Step 2 of 3: Enter the 6-digit OTP code sent to <strong>{email}</strong>.
      </p>

      {/* Demo helper banner */}
      {demoOtp && (
        <div style={{ padding: '10px 14px', background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(14, 165, 233, 0.3)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#38bdf8' }}>
          💡 <strong>Demo Mode OTP:</strong> Use <strong>{demoOtp}</strong> to verify.
        </div>
      )}

      {resendMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#6ee7b7' }}>
          {resendMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
            Verification OTP Code:
          </label>
          <input
            type="text"
            required
            maxLength={6}
            className="glass-input"
            style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '4px', fontWeight: 700 }}
            placeholder="123456"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="glass-btn glass-btn-primary"
          style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '1rem' }}
        >
          <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Continue'}</span>
          <ArrowRight size={18} />
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '0.8rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          ← Back to Email
        </button>

        <button onClick={handleResendOtp} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RefreshCw size={14} />
          Resend OTP
        </button>
      </div>
    </div>
  );
}
