# 🏛️ CivicPulse — Tamil Nadu AI Civic Issue Platform

> **AI-Powered Civic Reporting, Multilingual Regional Voice Processing & Satellite Heatmap Governance System**

---

## 🌟 Executive Overview & Core Idea

**CivicPulse** is an enterprise-grade, multimodal AI platform designed to transform urban governance across Tamil Nadu (Chennai, Madurai, Coimbatore, Trichy, Salem). It bridges the gap between citizens and municipal authorities by allowing citizens to report civic defects (**road potholes, garbage overflow, streetlight cable faults, sewage blockages**) using photos, regional voice recordings, or text, even in offline environments.

The platform uses **Sarvam AI** for Indian regional language processing (Tamil STT & Translation), **Gemini Multimodal AI** for defect severity categorization, a **4-Factor Multi-Signal Deduplication Engine** to eliminate redundant complaints, and an **Esri World Satellite Heatmap Layer** for spatial density governance.

---

## 🎯 Key Problems Solved

1. **Language Barrier in Civic Reporting**:
   - Citizens in tier-2/tier-3 Tamil Nadu towns often struggle to type detailed formal English descriptions. CivicPulse enables voice recordings in Tamil, automatically transcribed and translated via **Sarvam AI**.
2. **Duplicate Complaint Overload**:
   - Multiple citizens reporting the same physical pothole lead to officer inefficiency. CivicPulse calculates a **4-factor duplicate score** (GPS distance, image similarity embeddings, text similarity, and time proximity) to cluster reports under a single master ticket.
3. **Offline & Low Connectivity Areas**:
   - Uses **Dexie.js / IndexedDB** for local background queuing. Complaints saved while offline auto-sync to the FastAPI backend the moment network connectivity returns.
4. **Resolution Fraud & Lack of Transparency**:
   - Implements a citizen-side **Resolution Verification & Reopen Workflow**. Officers must upload "After Work" photos, and citizens must explicitly confirm resolution before closure.

---

## 🏗️ Technical Architecture & Modules Overview

CivicPulse is built as a 11-module full-stack system:

```
                          ┌──────────────────────────────────────┐
                          │    Citizen Mobile & Web Intake       │
                          │   (React + Vite + Leaflet Maps)      │
                          └──────────────────┬───────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
          ┌─────────────────────────┐                 ┌─────────────────────────┐
          │   Offline Sync Engine   │                 │     FastAPI Backend     │
          │   (Dexie.js IndexedDB)  │                 │    (Python 3.14 REST)   │
          └─────────────────────────┘                 └────────────┬────────────┘
                                                                   │
       ┌──────────────────────────────┬────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                            ▼                              ▼
┌───────────────┐           ┌──────────────────┐        ┌──────────────────┐           ┌──────────────────────┐
│  Sarvam AI    │           │    Gemini AI     │        │  Multi-Signal    │           │    Esri Satellite    │
│ (Tamil STT &  │           │  (Multimodal     │        │ Deduplication    │           │    Heatmap Engine    │
│ Translation)  │           │ Categorization)  │        │   (4 Signals)    │           │   (Leaflet.heat)     │
└───────────────┘           └──────────────────┘        └──────────────────┘           └──────────────────────┘
```

---

## 🧩 Module Breakdown

| Module | Core Functionality | Technologies Used |
| :--- | :--- | :--- |
| **Module 1** | Citizen Auth & Aadhaar Identity Verification | FastAPI, OAuth2 JWT, Demo Aadhaar Hash |
| **Module 2** | Citizen Home Dashboard & Status Summary | React, Plus Jakarta Sans UI System |
| **Module 3** | Multimodal Intake Wizard (Photo, Text, Voice, Map) | Leaflet EXIF, MediaRecorder API |
| **Module 4** | Offline Queue & Dexie.js Auto-Sync | IndexedDB, Background Sync Engine |
| **Module 5** | Sarvam AI Regional Language Voice Pipeline | Sarvam AI STT & Translation REST API |
| **Module 6** | Gemini Multimodal AI Defect Categorization | Google Gemini AI Multimodal Service |
| **Module 7** | 4-Signal Spatial & Embedding Deduplication | Haversine GPS, Text/Image Cosine Distance |
| **Module 8** | My Civic Hub & Public Issue Feed | Privacy-sanitized aggregated public view |
| **Module 9** | Resolution Verification & Citizen Reopen | OTP verification, Dispute & Photo Proof |
| **Module 10** | Security, Rate Limiting & Abuse Protection | Slowapi Rate Limiter, IP/Device scoring |
| **Module 11** | Integrated E2E Walkthrough & 20-Step Demo | Automated Pytest / FastAPI Test Suite |

---

## 🛰️ Heatmap & Real Map Integration

CivicPulse features an industry-standard **Esri World Satellite Imagery Map Layer** with smooth **Gaussian Heat Density Interpolation (`L.heatLayer`)**:
- **Continuous Color Gradient**: Blue (Low Density) $\rightarrow$ Yellow (Medium) $\rightarrow$ Orange (High) $\rightarrow$ Red (Critical Hotspot).
- **Interactive Badges**: Displays category breakdown and severity score percentage (e.g., `ROADS: 96%`) centered over **Chennai, Madurai, Coimbatore, Trichy, and Salem**.
- **Differential Privacy**: Hides exact citizen identities and exact street addresses on public heatmaps, aggregating data at the ward grid level.

---

## ⚡ Getting Started Locally

### Prerequisites
- Node.js (v18+) & `npm`
- Python 3.10+ & `pip`

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Run Database Migrations & Start Uvicorn Server
python -m uvicorn app.main:app --reload --port 8000
```
*Backend API Docs will be available at: `http://localhost:8000/docs`*

### 2. Frontend Setup (React + Vite)
```bash
# In the root project directory:
npm install
npm run dev
```
*Frontend Web Application will be available at: `http://localhost:5173`*

---

## 🧪 Running Automated Module Verification Tests

Run the complete 11-module automated backend test suite:
```bash
cd backend
python test_module11_complete_journey.py
```

---

## 📄 License
This project is licensed under the MIT License — built for civic empowerment and smart city governance across Tamil Nadu.
