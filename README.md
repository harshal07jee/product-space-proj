# WorkLens AI - AI Workforce Workload Intelligence

**WorkLens AI** is an enterprise AI workload orchestration assistant web application built for engineering managers, product leaders, and team leads.

It solves workload visibility problems by dynamically analyzing employee capacities, project deadlines, skill mappings, priority levels, and task dependencies to identify workload imbalances, predict delivery risks, and recommend actionable task redistributions.

---

## 🌟 Key Features

1. **Observe & Analyze**: Real-time KPI dashboard for Team Utilization %, Overloaded Employees count, At-Risk Projects count, and Available Capacity hours.
2. **Deterministic Engines**:
   - **Workload Engine**: Calculates employee utilization rates (`assigned_hours / capacity * 100`) and categorizes status into `AVAILABLE`, `HEALTHY`, `HIGH`, or `OVERLOADED`.
   - **Risk Engine**: Multi-factor weighted score (`0.35 * Capacity Risk + 0.30 * Deadline Pressure + 0.20 * Priority + 0.15 * Dependency Risk`) scaled 0-100 into `LOW`, `MEDIUM`, or `HIGH` risk levels.
   - **Allocation Engine**: Candidate scoring model evaluating skill matches, capacity, project familiarity, deadline feasibility, and context switching costs.
3. **Google Gemini Tool Calling**:
   - Natural language AI assistant configured with tools (`get_employees()`, `get_project_risks()`, `find_reassignment_candidates()`, `approve_recommendation()`).
   - Grounded evidence-based explanations powered strictly by application data without hallucinating organizational facts.
4. **Interactive Manager Approval Workflow**:
   - Review AI recommendations with before/after metric predictions.
   - One-click approval updates database task ownership, recalculates team workloads and project risks, and updates the dashboard instantly.
5. **CSV Dataset Import**:
   - Upload `employees.csv` and `tasks.csv` to instantly import custom organizational data.
6. **One-Click Demo Reset**:
   - Reset database state back to the baseline demo scenario anytime.

---

## 🚀 Quick Start & Local Execution

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Install Backend & Seed Demo Data
```bash
# From project root
pip install -r requirements.txt

# Run initial seed script
python backend/seed.py
```

### 2. Start Backend Server (FastAPI)
```bash
uvicorn backend.main:app --reload --port 8000
```
API Documentation will be accessible at `http://localhost:8000/docs`.

### 3. Start Frontend App (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 📁 Modular Architecture

```text
worklens-ai/
├── backend/
│   ├── api/
│   │   └── routes.py           # FastAPI REST endpoints
│   ├── database/
│   │   └── database.py         # SQLAlchemy DB connection (PostgreSQL & SQLite fallback)
│   ├── models/
│   │   └── models.py           # SQLAlchemy database models
│   ├── schemas/
│   │   └── schemas.py          # Pydantic schemas
│   ├── services/
│   │   ├── workload_engine.py  # Deterministic utilization calculation
│   │   ├── risk_engine.py      # Project delivery risk score engine
│   │   ├── allocation_engine.py# Candidate scoring & task redistribution
│   │   ├── csv_importer.py     # CSV parsing service
│   │   └── ai_agent.py        # Isolated Google Gemini API tool-calling agent
│   ├── main.py                 # FastAPI application entry point
│   └── seed.py                 # Seed script with primary demo scenario
├── frontend/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React UI components (Dashboard, Team, Projects, Recommendations, AI Chat)
│   ├── lib/                    # API client and TypeScript interfaces
└── .env.example
```

---

## 🎯 Primary Acceptance Flow

1. Open Dashboard: **Rahul** is displayed at **122.5% utilization (OVERLOADED)**, **Neha** is at **52.5% utilization (AVAILABLE)**, and **Payment Gateway** project is at **HIGH Risk**.
2. Review Recommendation: AI recommends moving **Payment API** task (12h) from Rahul to Neha.
3. Click **[Approve]**:
   - Task ownership updates in DB to Neha.
   - Workloads automatically recalculate (Rahul → 92.5%, Neha → 82.5%).
   - Payment Gateway risk score recalculates down to LOW.
   - Dashboard & charts update instantly!
