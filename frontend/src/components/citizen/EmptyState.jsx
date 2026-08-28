import React from 'react';
import { Inbox, Plus } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title, description, actionText, onAction }) {
  return (
    <div className="glass-panel" style={{
      padding: '40px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '16px 0',
      borderRadius: '16px'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        background: 'rgba(14, 165, 233, 0.12)',
        border: '1px solid rgba(14, 165, 233, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <Icon size={28} color="#38bdf8" />
      </div>

      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
        {title}
      </h4>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '320px', marginBottom: actionText ? '20px' : 0 }}>
        {description}
      </p>

      {actionText && (
        <button
          onClick={onAction}
          className="glass-btn glass-btn-primary"
          style={{ padding: '10px 18px', fontSize: '0.85rem' }}
        >
          <Plus size={16} />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
}
