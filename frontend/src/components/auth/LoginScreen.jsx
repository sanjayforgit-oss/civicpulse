import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Key, UserCheck, Shield, User, Send } from 'lucide-react';
import { apiService } from '../../utils/apiService';

export default function LoginScreen({ onLoginSuccess, onNavigateSignUp, onNavigateForgot }) {
  const [role, setRole] = useState('CITIZEN'); // 'CITIZEN' | 'OFFICER'
  
  // Citizen Form State
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' | 'password'
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');

  // Officer Form State
  const [officerId, setOfficerId] = useState('OFF001');
  const [officerPassword, setOfficerPassword] = useState('Demo@123');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestLoginOtp = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const res = await apiService.requestOtp(email);
      setOtpSent(true);
      setDemoOtp(res.data?.demo_otp);
    } catch (err) {
      setError(err.message || 'Failed to request login OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCitizenSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await apiService.login({
        email,
        password: loginMethod === 'password' ? password : null,
        otp_code: loginMethod === 'otp' ? otpCode : null
      });

      onLoginSuccess(res);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('not found')) {
        setError('Account not found with this email. Please click "Create Account" below to register.');
      } else {
        setError(err.message || 'Citizen login failed. Please check your credentials or register if new.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleOfficerSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await apiService.officerLogin({
        officer_id: officerId,
        password: officerPassword
      });

      onLoginSuccess(res);
    } catch (err) {
      setError(err.message || 'Officer login failed. Check Officer ID and password.');
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
      
      {/* Role Selection Dropdown */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Select Role:
        </label>
        <div style={{ position: 'relative' }}>
          <select
            className="glass-input"
            style={{ fontSize: '0.95rem', fontWeight: 700, paddingLeft: '38px', background: '#090d16', color: '#f8fafc', height: '44px' }}
            value={role}
            onChange={(e) => { setRole(e.target.value); setError(''); }}
          >
            <option value="CITIZEN" style={{ background: '#131c2e' }}>Citizen</option>
            <option value="OFFICER" style={{ background: '#131c2e' }}>Officer / Administration</option>
          </select>
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            {role === 'CITIZEN' ? <UserCheck size={18} color="var(--primary)" /> : <Shield size={18} color="#f59e0b" />}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '6px' }}>
        <LogIn size={22} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
          {role === 'CITIZEN' ? 'Citizen Authentication' : 'Municipal Officer Portal'}
        </h2>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
        {role === 'CITIZEN' 
          ? 'Log in to track your raised tickets and access civic services.' 
          : 'Official government portal access for department officers & supervisors.'}
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#fda4af', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* CITIZEN LOGIN FORM */}
      {role === 'CITIZEN' ? (
        <div>
          {/* Method Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', background: '#090d16', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              type="button"
              onClick={() => setLoginMethod('otp')}
              className={`glass-btn ${loginMethod === 'otp' ? 'glass-btn-primary' : ''}`}
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', border: 'none' }}
            >
              Email OTP Login
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`glass-btn ${loginMethod === 'password' ? 'glass-btn-primary' : ''}`}
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', border: 'none' }}
            >
              Password Login
            </button>
          </div>

          {demoOtp && (
            <div style={{ padding: '10px 14px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.8rem', color: '#a5b4fc' }}>
              💡 <strong>Demo Login OTP:</strong> Use <strong>{demoOtp}</strong> to log in.
            </div>
          )}

          <form onSubmit={handleCitizenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Email Address:
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  className="glass-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="citizen@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {loginMethod === 'password' ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Password:</label>
                  <button type="button" onClick={onNavigateForgot} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer' }}>
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    required
                    className="glass-input"
                    style={{ paddingLeft: '36px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Enter 6-Digit OTP:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Key size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      maxLength={6}
                      className="glass-input"
                      style={{ paddingLeft: '36px', letterSpacing: '4px', fontWeight: 700 }}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestLoginOtp}
                    disabled={loading}
                    className="glass-btn"
                    style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  >
                    <Send size={13} />
                    <span>{otpSent ? 'Resend' : 'Send OTP'}</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glass-btn glass-btn-primary"
              style={{ padding: '12px', justifyContent: 'center', fontSize: '0.95rem', marginTop: '6px' }}
            >
              <span>{loading ? 'Authenticating...' : 'Log In to Citizen Hub'}</span>
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            First time citizen?{' '}
            <button onClick={onNavigateSignUp} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
              Create Account & Verify Identity
            </button>
          </div>
        </div>
      ) : (
        /* OFFICER LOGIN FORM */
        <div>
          <div style={{ padding: '10px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.78rem', color: '#fde047' }}>
            🔑 <strong>Demo Officer Credentials:</strong><br/>
            ID: <strong>OFF001</strong> | Password: <strong>Demo@123</strong>
          </div>

          <form onSubmit={handleOfficerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Officer ID / Username:
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  className="glass-input"
                  style={{ paddingLeft: '36px', textTransform: 'uppercase', fontWeight: 700 }}
                  placeholder="e.g. OFF001"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Officer Password:
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  required
                  className="glass-input"
                  style={{ paddingLeft: '36px' }}
                  placeholder="••••••••"
                  value={officerPassword}
                  onChange={(e) => setOfficerPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-btn glass-btn-primary"
              style={{ padding: '12px', justifyContent: 'center', fontSize: '0.95rem', marginTop: '6px', background: '#f59e0b', borderColor: '#d97706' }}
            >
              <Shield size={16} />
              <span>{loading ? 'Authenticating Officer...' : 'Log In to Officer Portal'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
