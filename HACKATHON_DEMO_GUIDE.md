# 🚀 WorkLens AI - Hackathon Demo & Presentation Guide

> **Tagline**: *Enterprise AI Workforce Workload Intelligence & Delivery Risk Prevention*

---

## ⏱️ 2-Minute Judge Pitch Script

> **"Hello Judges! We are team WorkLens AI.**
> 
> In modern engineering organizations, **73% of project delivery delays are caused by workload imbalances**—where senior engineers are severely burnt out at 140% utilization, while other capable team members sit idle at 50% capacity. Managers waste hours in spreadsheets trying to figure out who has the right skills and bandwidth to take on tasks.
> 
> **WorkLens AI solves this instantly.**
> 
> WorkLens AI is an intelligent workload orchestration platform powered by deterministic calculation engines and **Google Gemini AI tool calling**. 
> 
> Watch how it works in real time:
> 
> 1. **Instant Visibility**: Right on our dashboard, WorkLens AI highlights that **Rahul is overloaded at 122.5% capacity**, while **Neha is available at 52.5%**. This bottleneck puts our critical **Payment Gateway project at HIGH delivery risk**.
> 2. **Direct Data Import**: Need custom company data? Simply drag and drop your `employees.csv` or `tasks.csv` directly onto the dashboard, and the system updates instantly.
> 3. **Gemini AI Tool-Calling Engine**: Instead of guessing, our AI assistant calls backend tools to calculate skill compatibility, task complexity, context switching costs, and delivery feasibility.
> 4. **One-Click Execution**: Gemini recommends moving the **Payment API** task from Rahul to Neha. With **one click on [Approve Redistribution]**, the database updates: Rahul drops to a healthy 92.5%, Neha goes to 82.5%, and project delivery risk plummets from **HIGH to LOW**.
> 
> WorkLens AI turns workload chaos into predictable, zero-burnout delivery. Thank you!"

---

## 🎯 Step-by-Step Live Demo Path for Judges

| Step | Action in App | What Judges Will See & Hear |
|---|---|---|
| **1** | Open Dashboard (`http://localhost:3000`) | Point out KPI cards: Team Utilization (122.5% for Rahul), 1 Overloaded Engineer, Payment Gateway project at HIGH Risk. |
| **2** | Direct CSV Upload | Click **Upload CSV File** on the Dashboard banner. Select `employees_sample.csv` or `tasks_sample.csv` -> Watch live metric refresh. |
| **3** | Switch Demo Scenario | Use the **Scenario Switcher** in the top navbar: Select **"Cascading Deadline Crunch"** or **"Tech Lead Outage"** -> Demonstrate instant adaptability. |
| **4** | Open Gemini AI Drawer | Click **Sparkles [WorkLens AI]** -> Type *"Who is overloaded and how do we fix it?"* -> Show grounded evidence-based tool-calling response with before/after numbers. |
| **5** | Approve Recommendation | Click **[Approve Redistribution]** on the top recommendation -> Watch horizontal bar charts and project risk score update live! |
| **6** | What-If Simulator | Click **Simulator** tab -> Drag task hours or change assignments -> Preview real-time risk predictions before committing to database. |

---

## 🏗️ System Architecture & Differentiators

```text
[ Next.js 14 Frontend ] (Glassmorphism UI, Recharts, Responsive Tables)
          │
          │ REST API
          ▼
[ FastAPI Backend ] 
    ├── 1. Workload Engine (Assigned / Capacity %)
    ├── 2. Risk Engine (Weighted multi-factor score: Capacity + Deadline + Priority + Dependency)
    ├── 3. Allocation Engine (Candidate scoring: Skill Match + Capacity + Familiarity - Context Switching)
    └── 4. Google Gemini API Agent (Structured Tool Calling: get_employees, get_risks, approve_rec)
          │
          ▼
[ SQLite / PostgreSQL DB ] (Transactional State with Audit Logs)
```

### Key Differentiators for Judges:
1. **Zero Hallucination Guarantee**: Gemini AI does not fabricate metrics; it uses structured backend tools to query live database calculations.
2. **Interactive Manager Control**: AI recommends, but human managers approve—ensuring enterprise control and compliance.
3. **Multi-Factor Risk Scoring**: Evaluates capacity pressure, deadline proximity, task priority, and dependency chains.
