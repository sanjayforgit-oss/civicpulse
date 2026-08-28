import React, { useState } from 'react';
import { Play, CheckCircle2, RefreshCw, X, Sparkles, ShieldCheck } from 'lucide-react';

export default function DemoRunnerModal({ isOpen, onClose, onExecuteStep }) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const steps = [
    "1. Citizen Registration (Aadhaar & Email)",
    "2. OTP Verification",
    "3. Demo Identity Verification",
    "4. Select Preferred Language (Tamil)",
    "5. Login to Citizen Portal",
    "6. Open 'Report a Civic Issue' Intake Wizard",
    "7. Attach Photo Evidence",
    "8. Add GPS Location Coordinates (Anna Nagar)",
    "9. Record Tamil Voice Note ('அண்ணா நகர் சாலையில் பெரிய சாக்கடை அடைப்பு')",
    "10. Simulate Offline Draft Queueing",
    "11. Restore Network Connection & Trigger Auto-Sync Engine",
    "12. Execute Sarvam AI Speech-to-Text & Translation",
    "13. Execute Gemini 2.5 Flash Multimodal AI Categorization",
    "14. Execute 4-Signal Multi-Factor Duplicate Detection",
    "15. Verify Complaint Displayed in 'My Civic Hub'",
    "16. Render OpenStreetMap Density Heatmap Cluster",
    "17. Inspect Visual 9-Step Status Timeline",
    "18. Simulate Officer Resolution Proof (Before vs After Photos)",
    "19. Citizen Confirms Resolution -> Moved to CLOSED",
    "20. Test Citizen Reopen Workflow with Mandatory Proof Photo"
  ];

  const handleNextStep = () => {
    if (onExecuteStep) onExecuteStep(currentStepIdx + 1);
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 4000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ maxWidth: '560px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={22} color="#0ea5e9" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                CivicPulse Complete 20-Step Demo Journey
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Interactive End-to-End Walkthrough Runner (Modules 1–10 Integrated)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="glass-btn" style={{ padding: '4px 10px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Current Step Progress Card */}
        <div style={{ padding: '16px', background: 'rgba(14, 165, 233, 0.12)', borderRadius: '12px', border: '1px solid #0ea5e9', marginBottom: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
            STEP {currentStepIdx + 1} OF 20:
          </div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
            {steps[currentStepIdx]}
          </h4>
        </div>

        {/* 20-Step Checklist Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', paddingRight: '6px', marginBottom: '20px' }}>
          {steps.map((stepText, idx) => (
            <div
              key={idx}
              onClick={() => { setCurrentStepIdx(idx); if (onExecuteStep) onExecuteStep(idx + 1); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: idx === currentStepIdx ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                border: idx === currentStepIdx ? '1px solid #0ea5e9' : '1px solid var(--border-color)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                color: idx <= currentStepIdx ? '#fff' : 'var(--text-muted)'
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: idx < currentStepIdx ? '#10b981' : idx === currentStepIdx ? '#0ea5e9' : 'transparent',
                border: idx <= currentStepIdx ? 'none' : '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700
              }}>
                {idx < currentStepIdx ? '✓' : idx + 1}
              </div>
              <span>{stepText}</span>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setCurrentStepIdx(0)}
            className="glass-btn"
            style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} />
            <span>Reset Demo</span>
          </button>

          <button
            onClick={handleNextStep}
            className="glass-btn glass-btn-primary"
            style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: '0.85rem' }}
          >
            <Play size={15} />
            <span>{currentStepIdx === steps.length - 1 ? 'Finish Demo' : 'Execute Next Step'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
