import Dexie from 'dexie';

// Initialize Dexie IndexedDB Database for Offline Complaints
export const offlineDb = new Dexie('CivicPulseOfflineDB');

offlineDb.version(1).stores({
  offline_complaints: 'offline_submission_id, sync_status, created_at, retry_count'
});

export const OFFLINE_SYNC_STATUS = {
  DRAFT: 'DRAFT',
  WAITING_FOR_SYNC: 'WAITING_FOR_SYNC',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED'
};
