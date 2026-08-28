import React from 'react';
import { UserCheck, ShieldCheck, Globe, LogOut, CheckCircle, Clock } from 'lucide-react';

export default function CitizenProfileScreen({ userProfile, onLogout }) {
  if (!userProfile) return null;

  return (
    <div style={{
      maxWidth: '520px',
      margin: '20px auto',
      padding: '28px 24px'
    }} className="glass-panel">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1.2rem',
            color: '#fff'
          }}>
            {userProfile.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              {userProfile.email.split('@')[0]}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{userProfile.email}</span>
          </div>
        </div>

        <span className="badge badge-low" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
          {userProfile.role || 'CITIZEN'}
        </span>
      </div>

      {/* Profile Details List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Civic User Identifier (ID):
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>
            {userProfile.civic_user_id}
          </div>
        </div>

        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Identity Verification Status:
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16} color="#10b981" />
              <span>Identity Verified (Demo Aadhaar)</span>
            </div>
          </div>

          <div style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', borderRadius: '6px' }}>
            Synthetic Seed Verified
          </div>
        </div>

        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Preferred App Language:
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={16} color="#0ea5e9" />
              <span>{userProfile.preferred_language || 'English'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout button */}
      <button
        onClick={onLogout}
        className="glass-btn glass-btn-danger"
        style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '0.95rem' }}
      >
        <LogOut size={18} />
        <span>Log Out of Session</span>
      </button>
    </div>
  );
}
