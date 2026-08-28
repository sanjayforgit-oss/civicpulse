/**
 * CivicPulse Frontend API Client Helper (TypeScript / JavaScript)
 * Fully integrated with AI Backend endpoints on http://localhost:8000
 */

const BASE_URL = 'http://localhost:8000';

/**
 * Submit Complaint with AI Processing & Auto-Duplicate Detection
 */
export async function submitComplaint(data: {
  citizen_user_id?: string;
  image_media_id?: string;
  audio_media_id?: string;
  text_description: string;
  latitude: number;
  longitude: number;
  location_address?: string;
  is_vulnerable_zone?: boolean;
}) {
  const res = await fetch(`${BASE_URL}/api/v1/complaints/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

/**
 * Upload Media with Auto PII Blur (Faces & License Plates) & EXIF GPS Extraction
 */
export async function uploadMedia(file: File, lat?: number, lon?: number) {
  const formData = new FormData();
  formData.append('file', file);
  if (lat) formData.append('client_latitude', lat.toString());
  if (lon) formData.append('client_longitude', lon.toString());
  const res = await fetch(`${BASE_URL}/api/v1/media/upload`, { 
    method: 'POST', 
    body: formData 
  });
  return res.json();
}

/**
 * Voice Note Recording (Regional STT + English Translation)
 */
export async function processVoiceNote(audioBlob: Blob) {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'voicenote.mp3');
  const res = await fetch(`${BASE_URL}/api/v1/audio/process-voice-complaint`, { 
    method: 'POST', 
    body: formData 
  });
  return res.json();
}

/**
 * Instant AI Fake / Synthetic Image Detector
 */
export async function validateImageDirect(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/api/v1/ai/validate-image/direct`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

/**
 * Map Dashboard Heatmap & Hotspots for MapLibre / Leaflet
 */
export async function fetchHeatmapData(dept?: string) {
  const url = new URL(`${BASE_URL}/api/v1/complaints/analytics/heatmap`);
  if (dept) url.searchParams.append('department', dept);
  const res = await fetch(url.toString());
  return res.json();
}

/**
 * Citizen Upvote (Real-Time Priority Escalation)
 */
export async function upvoteComplaint(complaintId: string, userId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/complaints/${complaintId}/upvote?user_id=${userId}`, { 
    method: 'POST' 
  });
  return res.json();
}

/**
 * Municipal Officer Status Update
 */
export async function updateComplaintStatus(
  complaintId: string, 
  status: 'IN_PROGRESS' | 'RESOLVED', 
  assignedWorkerName?: string, 
  resolutionNotes?: string
) {
  const res = await fetch(`${BASE_URL}/api/v1/complaints/${complaintId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      assigned_worker_name: assignedWorkerName,
      resolution_notes: resolutionNotes
    })
  });
  return res.json();
}
