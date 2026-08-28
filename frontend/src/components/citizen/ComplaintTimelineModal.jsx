import React from 'react';
import { CheckCircle2, Clock, MapPin, Building, ShieldCheck, AlertCircle, X } from 'lucide-react';

export default function ComplaintTimelineModal({ issueDetail, isOpen, onClose }) {
  if (!isOpen || !issueDetail) return null;

  const steps = issueDetail.timeline_steps || [
    { step_key: "SUBMITTED", title: "Submitted", description: "Citizen intake created & uploaded", is_completed: true, is_current: false },
    { step_key: "PROCESSED", title: "Processed", description: "Audio/Voice STT & regional text processed by Sarvam AI", is_completed: true, is_current: false },
    { step_key: "CATEGORIZED", title: "Categorized", description: "Defect classified as ROADS/POTHOLE by Gemini AI", is_completed: true, is_current: false },
    { step_key: "DEDUPLICATED", title: "Duplicate Checked", description: "Multi-signal spatial/text deduplication verified", is_completed: true, is_current: false },
    { step_key: "ROUTED", title: "Routed", description: "Auto-routed to Greater Chennai Highways Division", is_completed: true, is_current: false },
    { step_key: "ASSIGNED", title: "Assigned", description: "Assigned to Ward Engineer Er. R. Murugan", is_completed: true, is_current: true },
    { step_key: "IN_PROGRESS", title: "In Progress", description: "Road repair patch crew dispatched to site", is_completed: false, is_current: false },
    { step_key: "RESOLVED", title: "Resolved", description: "Defect repaired with photo proof verification", is_completed: false, is_current: false },
    { step_key: "VERIFIED", title: "Citizen Verification", description: "Citizen confirmation OTP & rating check", is_completed: false, is_current: false }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ maxWidth: '580px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {issueDetail.id} • {issueDetail.department || 'Highways & Infrastructure'}
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
              {issueDetail.processed_description || issueDetail.original_description || 'Civic Issue'}
            </h3>
          </div>
          <button onClick={onClose} className="glass-btn" style={{ padding: '4px 10px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Location & SLA meta */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div>📍 <strong>Location:</strong> {issueDetail.location_ward}</div>
          <div>⏱️ <strong>SLA Remaining:</strong> <span style={{ color: '#6ee7b7', fontWeight: 700 }}>{issueDetail.sla_days_remaining || 3} Days</span></div>
        </div>

        {/* 9-Step Vertical Timeline Visualizer */}
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '14px', color: 'var(--primary)' }}>
          Official Resolution Progress (9-Step Workflow)
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '8px' }}>
          {/* Vertical Connecting Line */}
          <div style={{
            position: 'absolute',
            left: '19px',
            top: '12px',
            bottom: '12px',
            width: '2px',
            background: 'var(--border-color)',
            zIndex: 1
          }} />

          {steps.map((step, idx) => {
            const isDone = step.is_completed;
            const isCurrent = step.is_current;

            return (
              <div key={step.step_key} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', zIndex: 2, position: 'relative' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isCurrent
                    ? '#0ea5e9'
                    : isDone
                    ? '#10b981'
                    : 'rgba(30, 41, 59, 0.9)',
                  border: isCurrent
                    ? '3px solid #38bdf8'
                    : isDone
                    ? '2px solid #6ee7b7'
                    : '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  boxShadow: isCurrent ? '0 0 10px rgba(14, 165, 233, 0.8)' : undefined
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>

                <div style={{ flex: 1, padding: '10px 14px', background: isCurrent ? 'rgba(14, 165, 233, 0.12)' : 'rgba(15, 23, 42, 0.5)', borderRadius: '10px', border: isCurrent ? '1px solid #0ea5e9' : '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isCurrent ? '#38bdf8' : isDone ? '#6ee7b7' : 'var(--text-muted)' }}>
                      {step.title}
                    </span>
                    {isCurrent && <span className="badge badge-medium">Current Phase</span>}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="glass-btn glass-btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '24px', padding: '12px' }}
        >
          Close Status Timeline
        </button>
      </div>
    </div>
  );
}
