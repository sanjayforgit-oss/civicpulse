# 🚀 CivicPulse AI Backend - Complete Frontend Integration Guide

This document contains everything your frontend teammate (Next.js / React / Flutter / Vite) needs to connect the UI to the AI Backend.

---

## 📦 1. How to Run the AI Backend
1. Unzip `civicpulse_ai_backend.zip` in your project root or run from the `backend/` folder.
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Ensure `backend/.env` is configured with API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   SARVAM_API_KEY=your_sarvam_api_key_here
   ```

4. Start the server:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
5. Interactive Swagger Documentation: **`http://localhost:8000/docs`**
6. Backend Base URL for Frontend: **`http://localhost:8000`**

---

## 📡 2. Complete API Reference for Frontend

### A. All-in-One Complaint Submission
**Endpoint:** `POST /api/v1/complaints/submit`  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "citizen_user_id": "user_12345",
  "image_media_id": "img_a1b2c3d4e5f6",
  "audio_media_id": "aud_f6e5d4c3b2a1",
  "text_description": "Massive road pothole on 100ft road near signal",
  "latitude": 12.971598,
  "longitude": 77.594562,
  "location_address": "100ft Road, Indiranagar, Bengaluru",
  "is_vulnerable_zone": true
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "is_duplicate": false,
  "complaint": {
    "id": "cmp_84a1d4bc62",
    "citizen_user_id": "user_12345",
    "image_url": "/uploads/original/img_a1b2.jpg",
    "sanitized_image_url": "/uploads/sanitized/img_a1b2.jpg",
    "audio_url": "/uploads/audio/aud_f6e5.mp3",
    "latitude": 12.971598,
    "longitude": 77.594562,
    "location_address": "100ft Road, Indiranagar, Bengaluru",
    "category": "ROAD_POTHOLE",
    "category_display_name": "Road Pothole & Surface Damage",
    "department": "ROAD_MAINTENANCE_PWD",
    "department_display_name": "Road Maintenance & PWD",
    "is_authentic_image": true,
    "authenticity_probability": 0.05,
    "base_severity_score": 8,
    "urgency_level": "HIGH",
    "priority_score": 78.5,
    "upvote_count": 1,
    "duplicate_report_count": 1,
    "is_cluster_root": true,
    "status": "REPORTED",
    "detected_hazards": ["Risk of two-wheeler skid and road accident", "Traffic congestion"],
    "recommended_action": "Dispatch road repair asphalt mixer and road roller.",
    "created_at": "2026-08-28T00:30:00"
  },
  "matched_primary_id": null,
  "distance_meters": null,
  "message": "Complaint submitted successfully."
}
```

---

### B. Media Upload with Automatic PII Redaction & GPS Extraction
**Endpoint:** `POST /api/v1/media/upload`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: (Binary File: `.jpg`, `.png`, `.mp3`, `.wav`, `.m4a`)
- `client_latitude`: (Optional Float GPS)
- `client_longitude`: (Optional Float GPS)

**Response:** Returns `media_id`, `sanitized_url` (with faces/number plates blurred), and extracted GPS.

---

### C. Voice-to-Text & Regional Translation (Sarvam AI + Gemini)
**Endpoint:** `POST /api/v1/audio/process-voice-complaint`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `audio_file`: (Binary Voice Note `.mp3`, `.m4a`, `.wav`, `.mpeg`, `.ogg`)

**Response:**
```json
{
  "media_id": "aud_d769ea627a4f",
  "original_transcript": "ஸ்ரவன் தேஜா என்கிற பெண்ணை உயிருக்கு உயிராய் காதலித்தான்.",
  "detected_language": "ta-IN",
  "translated_english_text": "He fell in love with the girl named Sravan Teja.",
  "is_mock": false
}
```

---

### D. Instant AI Fake / Manipulated Image Detector
**Endpoint:** `POST /api/v1/ai/validate-image/direct`  
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: (Binary Image)

**Response:**
```json
{
  "is_authentic": false,
  "ai_generated_probability": 0.88,
  "status": "REJECTED_AI_GENERATED",
  "flags": ["Synthetic Texture Anomaly", "Unnatural Diffusion Artifacts"],
  "reasons": ["The image displays plastic textures and anatomical distortions characteristic of diffusion generative models."]
}
```

---

### E. Map Analytics & Heatmap Hotspot Data (For Google Maps / Mapbox / Leaflet)
**Endpoint:** `GET /api/v1/complaints/analytics/heatmap`  
**Query Params:** `department` (optional), `category` (optional), `status` (optional)

**Response:**
```json
{
  "total_active_complaints": 12,
  "total_clusters": 5,
  "critical_hotspots_count": 4,
  "department_distribution": {
    "ROAD_MAINTENANCE_PWD": 8,
    "WATER_SUPPLY_SEWERAGE_BOARD": 2,
    "SOLID_WASTE_MANAGEMENT": 2
  },
  "heatmap_points": [
    {
      "latitude": 12.978369,
      "longitude": 77.640835,
      "weight": 0.85,
      "severity": 8,
      "priority_score": 82.0,
      "complaint_count": 5,
      "category": "ROAD_POTHOLE",
      "category_display_name": "Road Pothole & Surface Damage",
      "department": "ROAD_MAINTENANCE_PWD",
      "department_display_name": "Road Maintenance & PWD",
      "location_address": "100ft Road, Indiranagar",
      "urgency_level": "CRITICAL",
      "sample_complaint_id": "cmp_84a1d4bc62"
    }
  ]
}
```

---

### F. List Complaints (Sorted Dynamically by Priority Score)
**Endpoint:** `GET /api/v1/complaints?department=ROAD_MAINTENANCE_PWD&status=REPORTED`

---

### G. Citizen Upvote
**Endpoint:** `POST /api/v1/complaints/{id}/upvote?user_id=citizen_123`  
*Automatically recalculates priority score in real-time.*

---

### H. Municipal Staff Status Update
**Endpoint:** `PATCH /api/v1/complaints/{id}/status`  
**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "assigned_worker_name": "Ramesh Kumar (Junior Engineer)",
  "resolution_notes": "Repair team dispatched with asphalt equipment."
}
```

---

## 💻 3. Ready-to-Paste JavaScript / TypeScript Client

```typescript
const BASE_URL = 'http://localhost:8000';

// 1. Submit Complaint
export async function submitComplaint(data: {
  citizen_user_id?: string;
  image_media_id?: string;
  audio_media_id?: string;
  text_description?: string;
  latitude?: number;
  longitude?: number;
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

// 2. Upload Media (Image / Audio)
export async function uploadMedia(file: File, lat?: number, lon?: number) {
  const formData = new FormData();
  formData.append('file', file);
  if (lat) formData.append('client_latitude', lat.toString());
  if (lon) formData.append('client_longitude', lon.toString());

  const res = await fetch(`${BASE_URL}/api/v1/media/upload`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// 3. Process Voice Recording (STT + Translation)
export async function processVoiceNote(audioBlob: Blob) {
  const formData = new FormData();
  formData.append('audio_file', audioBlob, 'voicenote.mp3');

  const res = await fetch(`${BASE_URL}/api/v1/audio/process-voice-complaint`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

// 4. Fetch Heatmap Hotspots for Map UI
export async function fetchHeatmapData(dept?: string) {
  const url = new URL(`${BASE_URL}/api/v1/complaints/analytics/heatmap`);
  if (dept) url.searchParams.append('department', dept);
  const res = await fetch(url.toString());
  return res.json();
}

// 5. Upvote a Complaint
export async function upvoteComplaint(complaintId: string, userId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/complaints/${complaintId}/upvote?user_id=${userId}`, {
    method: 'POST',
  });
  return res.json();
}
```
