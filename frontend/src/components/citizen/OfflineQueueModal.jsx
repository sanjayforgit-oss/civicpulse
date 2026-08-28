import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, CheckCircle2, AlertTriangle, Clock, X } from 'lucide-react';
import { offlineDb, OFFLINE_SYNC_STATUS } from '../../utils/offlineDb';
import { syncEngine } from '../../utils/syncEngine';

export default function OfflineQueueModal({ isOpen, onClose }) {
  const [queueItems, setQueueItems] = useState([]);

  const loadQueue = async () => {
    const items = await offlineDb.offline_complaints.toArray();
    setQueueItems(items);
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 2500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ maxWidth: '540px', width: '100%', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
            <Layers size={22} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Offline Complaints Queue</h3>
          </div>
          <button onClick={onClose} className="glass-btn" style={{ padding: '4px 10px' }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Local IndexedDB store monitoring offline draft complaints. Auto-uploads when network is restored.
        </p>

        {queueItems.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No queued offline complaints in local storage.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {queueItems.map(item => (
              <div key={item.offline_submission_id} style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {item.offline_submission_id}
                  </span>
                  <span className={`badge ${item.sync_status === OFFLINE_SYNC_STATUS.SYNCED ? 'badge-low' : item.sync_status === OFFLINE_SYNC_STATUS.FAILED ? 'badge-high' : 'badge-medium'}`}>
                    {item.sync_status}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  "{item.description || 'Photo/Voice Complaint'}"
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  📍 {item.location_ward} • Retry attempts: {item.retry_count}
                </div>

                {item.last_error && (
                  <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '4px' }}>
                    Error: {item.last_error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={async () => {
              await syncEngine.manualRetrySync();
              loadQueue();
            }}
            className="glass-btn glass-btn-primary"
            style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '0.9rem' }}
          >
            <RefreshCw size={16} />
            <span>Manual Retry Sync</span>
          </button>
        </div>
      </div>
    </div>
  );
}
