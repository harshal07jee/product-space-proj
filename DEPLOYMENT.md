# WorkLens AI - Production Deployment Guide

This guide covers deployment options for **WorkLens AI**:

1. **Option A: Docker Compose (Local or Cloud VPS)**
2. **Option B: Vercel (Frontend) + Render / Railway (Backend)**

---

## 🐋 Option A: Single-Command Docker Deployment

Launch both backend (FastAPI) and frontend (Next.js) with Docker Compose.

```bash
# 1. Clone & enter project root
cd WorkLens-AI

# 2. (Optional) Set your Gemini API key
export GEMINI_API_KEY="your_actual_gemini_api_key"

# 3. Build & start containers in detached mode
docker-compose up -d --build
```

- **Frontend**: Accessible at `http://localhost:3000`
- **Backend API**: Accessible at `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

## 🌐 Option B: Cloud Hosting (Vercel + Render)

### 1. Deploy Backend to Render / Railway
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m backend.seed && uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:
  - `GEMINI_API_KEY`: *(Optional) Your Google Gemini API Key*
  - `DATABASE_URL`: *(Optional) PostgreSQL connection string (defaults to SQLite fallback)*

### 2. Deploy Frontend to Vercel
- Framework Preset: **Next.js**
- Root Directory: `frontend`
- Environment Variable:
  - `NEXT_PUBLIC_API_URL`: `https://your-backend-app.onrender.com/api`
