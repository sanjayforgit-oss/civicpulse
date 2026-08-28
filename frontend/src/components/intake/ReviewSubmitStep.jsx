import React from 'react';
import { Send, Edit3, Camera, FileText, Mic, MapPin, Globe, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ReviewSubmitStep({
  photoUrl,
  description,
  voiceData,
  locationData,
  language,
  isSubmitting,
  onEditStep,
  onSubmit
}) {
  const hasPhoto = Boolean(photoUrl);
  const hasText = Boolean(description && (typeof description === 'string' ? description.trim() : ''));
  const hasVoice = Boolean(voiceData);

  const wardDisplay = typeof locationData.ward === 'string' 
    ? locationData.ward 
    : (locationData.ward?.name || 'General Ward');

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
        <CheckCircle2 size={24} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Step 5: Review & Submit Complaint</h3>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Review your complaint details before sending it to the CivicPulse intake system.
      </p>

      {/* Inputs Summary Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Photo Preview */}
        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} /> Photo Attachment:
            </span>
            <button type="button" onClick={() => onEditStep(1)} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.75rem', cursor: 'pointer' }}>
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {hasPhoto ? (
            <img src={photoUrl} alt="Review attachment" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px' }} />
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No photo attached</span>
          )}
        </div>

        {/* Text Description Preview */}
        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Spoken & Entered Description:
            </span>
            <button type="button" onClick={() => onEditStep(2)} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.75rem', cursor: 'pointer' }}>
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {hasText ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: 0, fontWeight: 500 }}>"{description}"</p>
              
              {voiceData?.translatedEnglish && voiceData.translatedEnglish !== description && (
                <div style={{ padding: '8px 12px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '8px', fontSize: '0.8rem', color: '#38bdf8' }}>
                  <span style={{ fontWeight: 700 }}>🌐 AI Translated (English for Officers): </span>
                  <span>"{voiceData.translatedEnglish}"</span>
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No text description provided</span>
          )}
        </div>


        {/* Voice Note Preview */}
        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mic size={16} /> Voice Recording:
            </span>
            <button type="button" onClick={() => onEditStep(3)} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.75rem', cursor: 'pointer' }}>
              <Edit3 size={13} /> Edit
            </button>
          </div>

          {hasVoice ? (
            <audio src={voiceData.audioUrl} controls style={{ width: '100%', height: '32px' }} />
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No voice note recorded</span>
          )}
        </div>

        {/* Location Summary */}
        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> Location:
            </span>
            <button type="button" onClick={() => onEditStep(4)} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.75rem', cursor: 'pointer' }}>
              <Edit3 size={13} /> Edit
            </button>
          </div>

          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>📍 {wardDisplay}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Lat: {locationData.lat?.toFixed(4) || '13.0827'}, Lng: {(locationData.lng || locationData.lon || 80.2707).toFixed(4)} ({locationData.source})
          </div>
        </div>

      </div>

      {/* Final Submit Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="glass-btn glass-btn-primary"
        style={{ padding: '16px', justifyContent: 'center', fontSize: '1.05rem', marginTop: '8px' }}
      >
        <Send size={20} />
        <span>{isSubmitting ? 'Submitting Issue to Intake API...' : 'Submit Complaint'}</span>
      </button>
    </div>
  );
}
