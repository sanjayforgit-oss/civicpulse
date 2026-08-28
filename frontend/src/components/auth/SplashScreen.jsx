import React from 'react';
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';

export default function SplashScreen({ onStart }) {
  return (
    <div style={{
      maxWidth: '460px',
      margin: '40px auto',
      padding: '36px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }} className="glass-panel">
      {/* Brand Icon */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '20px',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: '0 0 30px rgba(14, 165, 233, 0.5)'
      }}>
        <Sparkles size={40} color="#ffffff" />
      </div>

      <h1 style={{
        fontSize: '2rem',
        fontWeight: 800,
        marginBottom: '8px',
        background: 'linear-gradient(90deg, #f8fafc, #38bdf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        CivicPulse
      </h1>

      <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
        An AI-Powered Civic Issue Reporting, Resolution & Accountability Ecosystem for Responsive Cities.
      </p>

      {/* Security badge */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '10px',
        fontSize: '0.8rem',
        color: '#6ee7b7',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '32px'
      }}>
        <ShieldCheck size={18} />
        <span>Privacy-Preserving Demo Identity Architecture</span>
      </div>

      <button
        onClick={onStart}
        className="glass-btn glass-btn-primary"
        style={{ width: '100%', padding: '16px', justifyContent: 'center', fontSize: '1.05rem' }}
      >
        <span>Get Started</span>
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
