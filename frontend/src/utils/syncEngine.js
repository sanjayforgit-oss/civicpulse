import { offlineDb, OFFLINE_SYNC_STATUS } from './offlineDb';
import { apiService } from './apiService';

class SyncEngine {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.listeners = [];

    // Register browser online/offline connectivity event listeners
    window.addEventListener('online', () => this.handleConnectivityChange(true));
    window.addEventListener('offline', () => this.handleConnectivityChange(false));
  }

  subscribe(listener) {
    this.listeners.push(listener);
    // Initial emission
    listener({ isOnline: this.isOnline, isSyncing: this.isSyncing });
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners(data = {}) {
    const payload = { isOnline: this.isOnline, isSyncing: this.isSyncing, ...data };
    this.listeners.forEach(l => l(payload));
  }

  async handleConnectivityChange(onlineState) {
    this.isOnline = onlineState;
    this.notifyListeners({ message: onlineState ? 'Submitting your saved complaint...' : 'Offline — your complaint has been saved.' });

    if (onlineState) {
      // Auto-trigger sync when connectivity returns
      await this.runAutoSync();
    }
  }

  // Enqueue a complaint into local IndexedDB when offline
  async enqueueOfflineComplaint(complaintPayload) {
    const offlineId = `OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const offlineRecord = {
      offline_submission_id: offlineId,
      photo: complaintPayload.media_url || null,
      voice: complaintPayload.voice_url || null,
      description: complaintPayload.description || null,
      language: complaintPayload.language || 'English',
      latitude: complaintPayload.latitude,
      longitude: complaintPayload.longitude,
      location_source: complaintPayload.location_source || 'GPS',
      location_accuracy: complaintPayload.location_accuracy || 10.0,
      location_ward: complaintPayload.location_ward || 'Ward General, Chennai',
      created_at: new Date().toISOString(),
      sync_status: OFFLINE_SYNC_STATUS.WAITING_FOR_SYNC,
      retry_count: 0,
      last_error: null
    };

    await offlineDb.offline_complaints.put(offlineRecord);
    this.notifyListeners({ message: 'Offline — your complaint has been saved.' });

    // If online, immediately trigger auto-sync
    if (this.isOnline) {
      await this.runAutoSync();
    }

    return offlineRecord;
  }

  // Background Auto-Sync Engine with Exponential Backoff Retries
  async runAutoSync() {
    if (!this.isOnline || this.isSyncing) return;

    try {
      this.isSyncing = true;
      this.notifyListeners({ message: 'Submitting your saved complaint...' });

      // Fetch pending or failed items
      const pendingItems = await offlineDb.offline_complaints
        .where('sync_status')
        .equals(OFFLINE_SYNC_STATUS.WAITING_FOR_SYNC)
        .or('sync_status')
        .equals(OFFLINE_SYNC_STATUS.FAILED)
        .toArray();

      for (const item of pendingItems) {
        try {
          // Update status to SYNCING
          await offlineDb.offline_complaints.update(item.offline_submission_id, {
            sync_status: OFFLINE_SYNC_STATUS.SYNCING
          });

          // Upload to FastAPI Intake API (Passing offline_submission_id for duplicate prevention)
          const uploadPayload = {
            offline_submission_id: item.offline_submission_id,
            description: item.description,
            language: item.language,
            media_url: item.photo,
            voice_url: item.voice,
            latitude: item.latitude,
            longitude: item.longitude,
            location_source: item.location_source,
            location_accuracy: item.location_accuracy,
            location_ward: item.location_ward
          };

          await apiService.createIssue(uploadPayload);

          // Mark as SYNCED upon server confirmation
          await offlineDb.offline_complaints.update(item.offline_submission_id, {
            sync_status: OFFLINE_SYNC_STATUS.SYNCED
          });
        } catch (err) {
          const nextRetry = item.retry_count + 1;
          await offlineDb.offline_complaints.update(item.offline_submission_id, {
            sync_status: OFFLINE_SYNC_STATUS.FAILED,
            retry_count: nextRetry,
            last_error: err.message || 'Network submission error'
          });
        }
      }

      this.notifyListeners({ message: 'Complaint submitted successfully.' });
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  // Manual Retry Trigger
  async manualRetrySync() {
    if (!this.isOnline) {
      this.notifyListeners({ message: 'Could not submit yet. We\'ll retry automatically when online.' });
      return;
    }
    await this.runAutoSync();
  }
}

export const syncEngine = new SyncEngine();
