# 🚀 CivicPulse — Render Cloud Deployment Guide

This guide walks you through deploying **CivicPulse** to [Render.com](https://render.com) using your free or paid credits.

---

## 🏗️ Deployment Architecture on Render

We deploy CivicPulse as **2 Render Services**:
1. **`civicpulse-backend` (Web Service - Python FastAPI)**:
   - Runs the AI reasoning pipelines, Sarvam/Gemini connectors, Aadhaar identity validation, and SQLite/PostgreSQL database.
2. **`civicpulse-frontend` (Static Site - Vite React)**:
   - Builds into blazing-fast static assets on Render's global CDN and communicates with the backend API.

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Push Your Code to GitHub
Run the following in your terminal to commit and push all the latest fixes to your repository:
```bash
cd d:\civicpulse\frontend
git add .
git commit -m "feat: complete AI multimodal pipelines, database persistence, and cloud config"
git push origin main
```

---

### Step 2: Deploy the FastAPI Backend on Render
1. Go to your **[Render Dashboard](https://dashboard.render.com)** $\rightarrow$ Click **"New +"** $\rightarrow$ Select **"Web Service"**.
2. Connect your GitHub repository: `cit_civic_pluse` (or your repo fork).
3. Fill in the following settings:
   - **Name**: `civicpulse-backend`
   - **Region**: *Singapore (Southeast Asia)* or *Oregon (US West)*
   - **Root Directory**: `backend` *(or leave blank if pointing to repo root)*
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment Variables**, click **"Add Environment Variable"** and enter:
   - `PYTHON_VERSION` = `3.11.9`
   - `GEMINI_API_KEY` = `<Your Gemini API Key>`
   - `SARVAM_API_KEY` = `<Your Sarvam API Key>`
   - `JWT_SECRET` = `<Any secret string e.g. CivicPulseSecret2026>`
5. Click **"Create Web Service"**.
6. ⏳ Wait 1–2 minutes for the build to finish. Once live, copy your backend URL:  
   *(e.g. `https://civicpulse-backend-xxxx.onrender.com`)*

---

### Step 3: Deploy the React Frontend on Render
1. In your **Render Dashboard** $\rightarrow$ Click **"New +"** $\rightarrow$ Select **"Static Site"**.
2. Connect the same repository.
3. Fill in the following settings:
   - **Name**: `civicpulse-frontend`
   - **Root Directory**: *(Leave blank)*
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://civicpulse-backend-xxxx.onrender.com` *(Paste your Step 2 Backend URL)*
5. Click **"Create Static Site"**.
6. ⏳ Render will build and publish your web app to a global live URL:  
   *(e.g. `https://civicpulse-frontend.onrender.com`)*

---

## ⚡ 1-Click Alternative (Render Blueprint)

If you prefer automated 1-click deployment, we have included [`render.yaml`](file:///d:/civicpulse/render.yaml):
1. Go to **[Render Dashboard](https://dashboard.render.com)** $\rightarrow$ Click **"Blueprints"**.
2. Select your repository $\rightarrow$ Render will automatically detect `render.yaml` and configure both frontend and backend services in a single click!
