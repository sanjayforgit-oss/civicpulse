import React from 'react';
import { Bell, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import EmptyState from './EmptyState';

export default function NotificationDrawer({ isOpen, onClose }) {
  if (!isOpen) return null;

  const notifications = []; // Prototype notifications list

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '380px',
        height: '100%',
        borderRadius: 0,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} color="#0ea5e9" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Notifications</h3>
          </div>
          <button onClick={onClose} className="glass-btn" style={{ padding: '4px 10px' }}>
            <X size={16} />
          </button>
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No Notifications Yet"
            description="You will receive alerts here when officers update your civic issue reports or SLA status."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Notification items */}
          </div>
        )}
      </div>
    </div>
  );
}
