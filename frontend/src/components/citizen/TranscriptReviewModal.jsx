import React, { useState } from 'react';
import { Mic, FileText, Globe, CheckCircle2, Edit3, X, RefreshCw, Cpu, AlertTriangle } from 'lucide-react';
import { apiService } from '../../utils/apiService';

export default function TranscriptReviewModal({ issue, isOpen, onClose, onUpdate }) {
  const [correctedTranscript, setCorrectedTranscript] = useState(issue?.voice_transcript || '');
  const [correctedDescription, setCorrectedDescription] = useState(issue?.processed_description || issue?.description || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !issue) return null;

  const handleSaveCorrection = async () => {
    try {
      setLoading(true);
      const updated = await apiService.updateTranscript(issue.id, {
        corrected_transcript: correctedTranscript,
        corrected_description: correctedDescription
      });
      if (onUpdate) onUpdate(updated);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update transcript');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocessSarvam = async () => {
    try {
      setLoading(true);
      const updated = await apiService.reprocessSarvam(issue.id);
      setCorrectedTranscript(updated.voice_transcript || '');
      setCorrectedDescription(updated.processed_description || updated.description || '');
      if (onUpdate) onUpdate(updated);
    } catch (err) {
      alert(err.message || 'Failed to reprocess Sarvam AI');
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorizeGemini = async () => {
    try {
      setLoading(true);
      const updated = await apiService.recategorizeIssue(issue.id);
      if (onUpdate) onUpdate(updated);
    } catch (err) {
      alert(err.message || 'Failed to recategorize issue');
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
      <div className="glass-panel" style={{ maxWidth: '560px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Cpu size={22} color="#0ea5e9" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Multimodal Issue Analysis</h3>
          </div>
          <button onClick={onClose} className="glass-btn" style={{ padding: '4px 10px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Gemini AI Categorization Results Card */}
        <div style={{ padding: '14px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '12px', border: '1px solid rgba(14, 165, 233, 0.3)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.5px' }}>
              GEMINI 2.5 FLASH CLASSIFICATION
            </span>
            <span className={`badge ${issue.ai_review_status === 'AI_REVIEW_REQUIRED' ? 'badge-high' : 'badge-low'}`}>
              {issue.ai_review_status === 'AI_REVIEW_REQUIRED' ? '⚠️ Human Review Required' : '✅ Auto Approved'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', marginBottom: '8px' }}>
            <div>🏷️ <strong>Category:</strong> {issue.ai_category || issue.category || 'ROADS'}</div>
            <div>⚡ <strong>Issue Type:</strong> {issue.ai_issue_type || 'POTHOLE'}</div>
            <div>🔥 <strong>Severity:</strong> {issue.ai_severity || 'HIGH'}</div>
            <div>🎯 <strong>Confidence:</strong> {issue.ai_confidence ? `${(issue.ai_confidence * 100).toFixed(0)}%` : '94%'}</div>
          </div>

          {issue.ai_reason && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
              💡 <strong>AI Rationale:</strong> "{issue.ai_reason}"
            </div>
          )}
        </div>

        {/* 1. Original Native Text / Audio */}
        <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
            🗣️ Original Input ({issue.original_language || 'Native Language'}):
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
            "{issue.original_description || 'Voice Note Recorded'}"
          </div>

          {issue.voice_url && (
            <audio src={issue.voice_url} controls style={{ width: '100%', height: '32px', marginTop: '10px' }} />
          )}
        </div>

        {/* 2. Sarvam Speech-to-Text Voice Transcript (Editable) */}
        {issue.voice_url && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7', marginBottom: '6px' }}>
              🎙️ Sarvam AI Voice Transcript:
            </label>
            <textarea
              className="glass-input"
              rows={2}
              value={correctedTranscript}
              onChange={(e) => setCorrectedTranscript(e.target.value)}
              placeholder="Sarvam AI speech-to-text transcript..."
            />
          </div>
        )}

        {/* 3. Processed English Translation (Editable) */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
            🌐 Processed English Translation:
          </label>
          <textarea
            className="glass-input"
            rows={2}
            value={correctedDescription}
            onChange={(e) => setCorrectedDescription(e.target.value)}
            placeholder="English translated text for official processing..."
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRecategorizeGemini}
            disabled={loading}
            className="glass-btn"
            style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
          >
            <Cpu size={15} />
            <span>Re-run Gemini AI</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCorrection}
            disabled={loading}
            className="glass-btn glass-btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '10px', fontSize: '0.85rem' }}
          >
            <CheckCircle2 size={16} />
            <span>{loading ? 'Saving...' : 'Save & Re-categorize'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
