import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Camera, AlertCircle, Sparkles, X, ShieldCheck } from 'lucide-react';
import { apiService } from '../../utils/apiService';

export default function ResolutionVerificationModal({ issue, isOpen, onClose, onUpdate }) {
  const [viewMode, setViewMode] = useState('INSPECT'); // 'INSPECT' | 'REOPEN_FORM'
  const [reopenReason, setReopenReason] = useState('');
  const [reopenPhoto, setReopenPhoto] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen || !issue) return null;

  const beforePhoto = issue.media_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80';
  const afterPhoto = issue.resolution_after_photo || 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80';
  const resolutionNotes = issue.resolution_notes || 'Road pothole repaired with hot mix asphalt. Pavement leveled & inspected by Ward Engineer.';
  const resolvedAt = issue.resolved_at ? new Date(issue.resolved_at).toLocaleString() : new Date().toLocaleString();

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const updated = await apiService.confirmResolution(issue.id);
      if (onUpdate) onUpdate(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to confirm resolution.');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reopenReason || reopenReason.trim().length < 5) {
      setErrorMsg('Please enter a valid reason for reopening (min 5 characters).');
      return;
    }

    if (!reopenPhoto) {
      setErrorMsg('Please attach or take a proof photo showing the unresolved defect.');
      return;
    }

    try {
      setLoading(true);
      const updated = await apiService.reopenIssue(issue.id, {
        reason: reopenReason.trim(),
        proof_photo: reopenPhoto
      });
      if (onUpdate) onUpdate(updated);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit reopen request.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="glass-panel" style={{ maxWidth: '620px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
              {issue.id} • Resolution Verification
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
              Your issue has been marked as resolved.
            </h3>
          </div>
          <button onClick={onClose} className="glass-btn" style={{ padding: '4px 10px' }}>
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="glass-panel" style={{ padding: '12px', borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', marginBottom: '16px', fontSize: '0.85rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} color="#ef4444" />
            <span>{errorMsg}</span>
          </div>
        )}

        {viewMode === 'INSPECT' ? (
          <>
            {/* Side-by-Side Before vs After Resolution Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  📷 BEFORE (Original Report Photo):
                </div>
                <img
                  src={beforePhoto}
                  alt="Before"
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '6px' }}>
                  📸 AFTER (Officer Proof Photo):
                </div>
                <img
                  src={afterPhoto}
                  alt="After Resolution"
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #10b981' }}
                />
              </div>
            </div>

            {/* Officer Notes & Timestamp */}
            <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>
                📝 Officer Resolution Notes:
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                "{resolutionNotes}"
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                🗓️ Resolved at: {resolvedAt}
              </div>
            </div>

            {/* Question & Primary Action Buttons */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
                Has this issue actually been resolved?
              </h4>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading}
                  className="glass-btn glass-btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#10b981' }}
                >
                  <CheckCircle2 size={18} />
                  <span>YES, CONFIRM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('REOPEN_FORM')}
                  disabled={loading}
                  className="glass-btn"
                  style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: '0.9rem', borderColor: '#ef4444', color: '#fca5a5' }}
                >
                  <RotateCcw size={18} color="#ef4444" />
                  <span>NO, REOPEN</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Reopen Request Form (Mandatory Reason & Proof Upload) */
          <form onSubmit={handleReopenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.8rem', color: '#fca5a5' }}>
              ⚠️ Reopening requires mandatory citizen proof. AI will evaluate proof evidence for supervisor review.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>
                Reason for Reopening (Mandatory): *
              </label>
              <textarea
                className="glass-input"
                rows={3}
                required
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Explain why the issue is not fixed (e.g. pothole still present, pipe still leaking)..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#fca5a5', marginBottom: '6px' }}>
                Reopen Proof Image (Mandatory): *
              </label>
              
              {reopenPhoto ? (
                <div style={{ position: 'relative' }}>
                  <img src={reopenPhoto} alt="Reopen Proof" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px' }} />
                  <button type="button" onClick={() => setReopenPhoto('')} className="glass-btn" style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 8px' }}>
                    Replace Image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setReopenPhoto('data:image/jpeg;base64,reopen_proof_photo_valid_sample_evidence')}
                  className="glass-btn"
                  style={{ width: '100%', padding: '20px', justifyContent: 'center', borderStyle: 'dashed' }}
                >
                  <Camera size={20} color="#ef4444" />
                  <span>Attach / Take Reopen Proof Photo</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setViewMode('INSPECT')}
                className="glass-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
              >
                Back to Inspection
              </button>

              <button
                type="submit"
                disabled={loading}
                className="glass-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '12px', background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
              >
                {loading ? 'Verifying AI...' : 'Submit Reopen Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
