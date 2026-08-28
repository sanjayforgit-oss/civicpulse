import React from 'react';
import { MapPin, Users, Calendar, ArrowUpRight, Globe, Volume2 } from 'lucide-react';

export default function PublicIssueCard({ issue, onViewDetails, lang = 'en' }) {
  if (!issue) return null;

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Active', class: 'badge-high' };
      case 'PROCESSING':
        return { label: 'Processing', class: 'badge-medium' };
      case 'PENDING_CONFIRMATION':
        return { label: 'Pending Approval', class: 'badge-medium' };
      case 'RESOLVED':
        return { label: 'Resolved', class: 'badge-low' };
      default:
        return { label: status, class: 'badge-low' };
    }
  };

  const badge = getStatusBadge(issue.status);
  const nativeText = issue.original_description || issue.title_ta || issue.title_en;
  const processedText = issue.processed_description || issue.title_en;

  return (
    <div className="glass-panel" style={{
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between',
      gap: '12px',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
      borderRadius: '16px'
    }}>
      <div>
        {/* Header: Category & Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>
            {issue.category}
          </span>
          <span className={`badge ${badge.class}`}>
            {badge.label}
          </span>
        </div>

        {/* Original Native Description */}
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px', lineHeight: '1.4' }}>
          "{nativeText}"
        </h4>

        {/* Sarvam AI Processed English Version */}
        {processedText && processedText !== nativeText && (
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginBottom: '8px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Globe size={13} />
            <span>En: "{processedText}"</span>
          </div>
        )}

        {/* Location (Privacy Sanitized - Approximate Only) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          <MapPin size={14} color="#0ea5e9" />
          <span>{issue.location_ward}</span>
        </div>
      </div>

      {/* Footer Meta: Supporters & Date */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', paddingTop: '10px', borderTop: '1px solid var(--border-color)', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} color="#6ee7b7" />
            <span>{issue.supporters_count || 0} Supporters ({issue.reports_count || 1} Reports)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} />
            <span>{new Date(issue.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onViewDetails && onViewDetails(issue)}
          className="glass-btn"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '8px 12px' }}
        >
          <span>View Details & Sarvam AI STT</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
