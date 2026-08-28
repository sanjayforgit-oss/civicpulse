const API_HOST = import.meta.env.VITE_API_BASE_URL 
  ? (import.meta.env.VITE_API_BASE_URL.startsWith('http') ? import.meta.env.VITE_API_BASE_URL : `https://${import.meta.env.VITE_API_BASE_URL}`)
  : 'http://localhost:8000';

const API_BASE_URL = `${API_HOST}/api/v1`;


export const apiService = {
  // Token management
  getToken: () => localStorage.getItem('civicpulse_access_token'),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('civicpulse_access_token', accessToken);
    localStorage.setItem('civicpulse_refresh_token', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('civicpulse_access_token');
    localStorage.removeItem('civicpulse_refresh_token');
  },
  removeToken: () => {
    localStorage.removeItem('civicpulse_access_token');
    localStorage.removeItem('civicpulse_refresh_token');
  },

  // 1. Request Email OTP
  requestOtp: async (email) => {
    const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to request OTP');
    return data;
  },

  // 2. Verify Email OTP
  verifyOtp: async (email, otp_code) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to verify OTP');
    return data;
  },

  // 3. Check Demo Aadhaar Identity
  checkDemoIdentity: async (demo_aadhaar_number) => {
    const res = await fetch(`${API_BASE_URL}/auth/check-demo-identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demo_aadhaar_number })
    });
    const data = await res.json();
    return data;
  },

  // 4. Register Citizen
  registerCitizen: async ({ email, demo_aadhaar_number, preferred_language, password }) => {
    const res = await fetch(`${API_BASE_URL}/auth/register-citizen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, demo_aadhaar_number, preferred_language, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    if (data.access_token) {
      apiService.setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },

  // 5. Citizen Login
  login: async ({ email, password, otp_code }) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, otp_code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    if (data.access_token) {
      apiService.setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },

  // 5b. Officer Login
  officerLogin: async ({ officer_id, password }) => {
    const res = await fetch(`${API_BASE_URL}/auth/officer-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officer_id, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Officer login failed');
    if (data.access_token) {
      apiService.setTokens(data.access_token, data.refresh_token);
    }
    return data;
  },

  // 6. Get Protected User Profile
  getUserProfile: async () => {
    const token = apiService.getToken();
    if (!token) throw new Error('No access token found');

    const res = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch profile');
    return data;
  },

  // --- MODULE 2 OFFICER PORTAL API METHODS ---

  // Get Officer Dashboard Summary & Assigned Issues
  getOfficerDashboard: async () => {
    const token = apiService.getToken();
    if (!token) throw new Error('No access token found');

    const res = await fetch(`${API_BASE_URL}/officer/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch officer dashboard');
    return data;
  },

  acceptOfficerTask: async (issueId, notes = '') => {
    const token = apiService.getToken();
    const res = await fetch(`${API_BASE_URL}/officer/issues/${issueId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to accept task');
    return data;
  },

  submitSiteInspection: async (issueId, inspectionData) => {
    const token = apiService.getToken();
    const res = await fetch(`${API_BASE_URL}/officer/issues/${issueId}/submit-inspection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(inspectionData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to submit inspection');
    return data;
  },

  requestBudgetApproval: async (issueId, estimated_cost, reason) => {
    const token = apiService.getToken();
    const res = await fetch(`${API_BASE_URL}/officer/issues/${issueId}/request-budget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ estimated_cost, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to submit budget request');
    return data;
  },

  decideBudget: async (issueId, approved, notes = '') => {
    const token = apiService.getToken();
    const res = await fetch(`${API_BASE_URL}/officer/issues/${issueId}/decide-budget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ approved, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to decide budget');
    return data;
  },

  createWorkOrder: async (issueId, workOrderData) => {
    const token = apiService.getToken();
    const res = await fetch(`${API_BASE_URL}/officer/issues/${issueId}/create-work-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(workOrderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to create work order');
    return data;
  },

  updateWorkProgress: async (issueId, status, notes = '') => {
    const token = apiService.getToken();
    const res = await fetch(`${API_BASE_URL}/officer/issues/${issueId}/update-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update work progress');
    return data;
  },

  submitResolutionEvidence: async (issueId, evidenceData) => {
    const token = apiService.getToken();
    const res = await fetch(`${API_BASE_URL}/officer/issues/${issueId}/submit-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(evidenceData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to submit evidence');
    return data;
  },

  // --- MODULE 8 CITIZEN COMPLAINTS & DASHBOARD METHODS ---
  getMyComplaints: async () => {
    const token = apiService.getToken();
    if (!token) return [];
    const res = await fetch(`${API_BASE_URL}/citizen/my-issues`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch user complaints');
    return data;
  },

  getPublicIssues: async () => {
    const token = apiService.getToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE_URL}/citizen/public-issues`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch public issues');
    return data;
  },

  getDashboardSummary: async () => {
    const token = apiService.getToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE_URL}/citizen/dashboard-summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch dashboard summary');
    return data;
  },


  translateText: async (text, sourceLang = 'auto') => {
    try {
      const res = await fetch(`${API_BASE_URL}/text/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source_language: sourceLang, target_language: 'en-IN' })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      console.warn('Text translation error:', e);
      return { original_text: text, translated_text: text };
    }
  },

  // --- ISSUE CREATION & INTAKE ---

  createIssue: async (issueData) => {
    const token = apiService.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/issues/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(issueData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to submit complaint');
    return data;
  },

  // --- AI BACKEND INTEGRATION ENDPOINTS ---

  submitComplaintAi: async (data) => {
    const res = await fetch(`${API_BASE_URL}/complaints/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },


  uploadMediaPii: async (file, lat, lon) => {
    const formData = new FormData();
    formData.append('file', file);
    if (lat) formData.append('client_latitude', lat.toString());
    if (lon) formData.append('client_longitude', lon.toString());
    const res = await fetch(`${API_BASE_URL}/media/upload`, { method: 'POST', body: formData });
    return res.json();
  },

  processVoiceNote: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'voicenote.mp3');
    const res = await fetch(`${API_BASE_URL}/audio/process-voice-complaint`, { method: 'POST', body: formData });
    return res.json();
  },

  validateImageDirect: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/ai/validate-image/direct`, { method: 'POST', body: formData });
    return res.json();
  },

  fetchHeatmapAnalytics: async (dept) => {
    const url = new URL(`${API_BASE_URL}/complaints/analytics/heatmap`);
    if (dept) url.searchParams.append('department', dept);
    const res = await fetch(url.toString());
    return res.json();
  },

  upvoteComplaintAi: async (complaintId, userId) => {
    const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/upvote?user_id=${userId}`, { method: 'POST' });
    return res.json();
  },

  updateComplaintStatusAi: async (complaintId, status, assignedWorkerName, resolutionNotes) => {
    const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, assigned_worker_name: assignedWorkerName, resolution_notes: resolutionNotes })
    });
    return res.json();
  }
};
