import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { syncEngine } from '../../utils/syncEngine';

export default function SyncStatusBanner({ onOpenQueue }) {
  const [syncState, setSyncState] = useState({ isOnline: navigator.onLine, isSyncing: false, message: '' });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((data) => {
      setSyncState(data);
    });
    return unsubscribe;
  }, []);

  if (syncState.isOnline && !syncState.isSyncing && !syncState.message) {
    return null; // Silent when online and fully synced
  }

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 1500,
      padding: '10px 16px',
      background: !syncState.isOnline
        ? 'rgba(245, 158, 11, 0.9)'
        : syncState.isSyncing
        ? 'rgba(14, 165, 233, 0.9)'
        : 'rgba(16, 185, 129, 0.9)',
      backdropFilter: 'blur(8px)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '0.85rem',
      fontWeight: 600,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!syncState.isOnline ? (
          <WifiOff size={18} />
        ) : syncState.isSyncing ? (
          <RefreshCw size={18} style={{ animation: 'spin 2s linear infinite' }} />
        ) : (
          <CheckCircle2 size={18} />
        )}

        <span>
          {!syncState.isOnline
            ? 'Offline — your complaint has been saved.'
            : syncState.isSyncing
            ? 'Submitting your saved complaint...'
            : syncState.message || 'Complaint submitted successfully.'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {syncState.isOnline && (
          <button
            onClick={() => syncEngine.manualRetrySync()}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Retry Now
          </button>
        )}

        {onOpenQueue && (
          <button
            onClick={onOpenQueue}
            style={{ background: 'none', border: 'none', color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            View Queue
          </button>
        )}
      </div>
    </div>
  );
}
