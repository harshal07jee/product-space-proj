import os
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.database.database import SessionLocal
from backend.models.models import Employee, Task, Project, Recommendation, ActivityLog
from backend.services.workload_engine import calculate_team_workload_metrics, calculate_employee_workload
from backend.services.risk_engine import calculate_all_projects_risk, calculate_project_risk
from backend.services.allocation_engine import find_reassignment_candidates, generate_recommendations_for_overloaded

# System instructions
SYSTEM_INSTRUCTIONS = """You are WorkLens AI, an executive AI workload orchestration assistant for software engineering managers.
Your job is to analyze real-time employee capacity, project delivery deadlines, skill requirements, and task dependencies.

Key Directives:
1. Always use available backend tools (`get_employees_tool`, `get_project_risks_tool`, `find_reassignment_candidates_tool`, `calculate_reassignment_impact_tool`, `approve_recommendation_tool`) to gather grounded facts before answering.
2. Structure your response into clear executive sections:
   - 📊 **Current Status Summary**: State exact utilization percentages, overloaded counts, and project risk levels.
   - ⚠️ **Key Bottlenecks**: Highlight specific overloaded personnel (utilization > 100%) and at-risk project deadlines.
   - 💡 **Actionable Recommendation**: Propose exact task reassignments specifying task name, effort hours, source employee, target employee, skill match %, and project risk mitigation.
   - 📈 **Quantified Impact**: Provide numerical predictions of before vs. after utilization percentages and risk score changes.
3. Never invent facts, hallucinate employee capacity, or perform manual arithmetic when tools are available.
4. Keep answers authoritative, concise, and structured with crisp Markdown bullets."""


def process_chat_query(user_message: str) -> Dict[str, Any]:
    """
    Main entry point for AI chat queries.
    Uses Gemini API if key is present; otherwise falls back gracefully to a rule-based query engine.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key or api_key == "your_gemini_key":
        return process_fallback_chat(user_message)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        # Declare tools
        tools = [
            get_employees_tool,
            get_employee_workload_tool,
            get_tasks_tool,
            get_project_risks_tool,
            find_available_employees_tool,
            find_reassignment_candidates_tool,
            calculate_reassignment_impact_tool,
            approve_recommendation_tool
        ]

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_INSTRUCTIONS,
            tools=tools
        )

        chat = model.start_chat(enable_automatic_function_calling=True)
        response = chat.send_message(user_message)

        return {
            "reply": response.text,
            "tool_calls": []
        }
    except Exception as e:
        print(f"Gemini API Exception: {e}")
        fallback = process_fallback_chat(user_message)
        fallback["reply"] = f"*(Operating in Deterministic Intelligence Mode - Gemini Notice: {str(e)})*\n\n" + fallback["reply"]
        return fallback


def process_fallback_chat(user_message: str) -> Dict[str, Any]:
    """
    Deterministic fallback logic when GEMINI_API_KEY is unconfigured or unavailable.
    Provides complete, executive answers using application data.
    """
    db: Session = SessionLocal()
    try:
        msg_lower = user_message.lower()

        if any(k in msg_lower for k in ["overload", "who is overloaded", "utilization", "capacity", "heavy"]):
            metrics = calculate_team_workload_metrics(db)
            overloaded = [emp for emp in metrics["workload_breakdown"] if emp["risk_status"] == "OVERLOADED"]
            if overloaded:
                lines = [
                    "### 📊 Workload & Overload Breakdown",
                    f"• **Team Utilization Rate**: `{metrics['team_utilization']}%`",
                    f"• **Overloaded Engineers**: `{len(overloaded)} members` exceeding 100% capacity limit:\n"
                ]
                for emp in overloaded:
                    lines.append(f"  - **{emp['name']}** (`{emp['role']}`): **{emp['utilization']}%** capacity ({emp['assigned_hours']}h assigned / {emp['capacity']}h max capacity)")
                
                lines.append("\n💡 *Recommendation*: Ask me `'Recommend task reassignments to balance team workload'` for immediate AI workload optimization.")
                return {"reply": "\n".join(lines)}
            else:
                return {"reply": f"### 📊 Workload Status\nAll team members are operating at healthy workload levels! Team utilization is currently `{metrics['team_utilization']}%`."}

        elif any(k in msg_lower for k in ["availab", "free", "capacity", "who can take"]):
            metrics = calculate_team_workload_metrics(db)
            avail = [emp for emp in metrics["workload_breakdown"] if emp["risk_status"] in ["AVAILABLE", "HEALTHY"]]
            lines = [
                f"### 🟢 Team Available Capacity",
                f"• **Total Available Bandwidth**: `{metrics['available_capacity_hours']} hours` unassigned.",
                "• **Available Personnel**:"
            ]
            for emp in avail:
                lines.append(f"  - **{emp['name']}** ({emp['role']}): **{emp['utilization']}%** current workload (`{emp['available_capacity']}h` free)")
            return {"reply": "\n".join(lines)}

        elif any(k in msg_lower for k in ["risk", "project", "deadline", "payment", "delay"]):
            risks = calculate_all_projects_risk(db)
            high_risks = [r for r in risks if r['risk_level'] == 'HIGH']
            lines = [
                "### 🛡️ Project Delivery Risk Assessment",
                f"• **At-Risk Projects**: `{len(high_risks)} HIGH risk` project(s) requiring management attention:\n"
            ]
            for r in risks:
                icon = "🔴" if r['risk_level'] == "HIGH" else "🟡" if r['risk_level'] == "MEDIUM" else "🟢"
                lines.append(f"{icon} **{r['project_name']}** — Risk Level: `{r['risk_level']}` (Score: `{r['risk_score']}/100`, Deadline: `{r['deadline']}`)")
                lines.append(f"  - *Progress*: `{r['progress']}%` | *Remaining Effort*: `{r['remaining_effort']}h`")
                lines.append(f"  - *Diagnosis*: {r['risk_explanation']}\n")
            return {"reply": "\n".join(lines)}

        elif any(k in msg_lower for k in ["recommend", "reassign", "balance", "solution", "fix", "help", "rahul", "neha"]):
            recs = generate_recommendations_for_overloaded(db)
            if recs:
                top = recs[0]
                lines = [
                    "### 🧠 WorkLens AI Redistribution Recommendation",
                    f"**Proposed Task Action**: Reassign task **'{top['task_title']}'** (`{top['remaining_hours']}h` effort) from **{top['from_employee_name']}** → **{top['to_employee_name']}**.\n",
                    "#### 📈 Measurable Impact:",
                    f"• **{top['from_employee_name']} Utilization**: `{top['from_employee_util_before']}%` → `{top['from_employee_util_after']}%` (Resolves Overload)",
                    f"• **{top['to_employee_name']} Utilization**: `{top['to_employee_util_before']}%` → `{top['to_employee_util_after']}%` (Healthy Level)",
                    f"• **Project Delivery Risk**: `{top['risk_before']}` → `{top['risk_after']}`\n",
                    f"#### 🔍 Executive Rationale:\n{top['reason']}\n",
                    "*(Click '[Approve Redistribution]' on the Dashboard to execute this DB update instantly!)*"
                ]
                return {"reply": "\n".join(lines)}
            else:
                return {"reply": "### 🧠 AI Analysis\nNo critical task reassignments are currently required. All team workloads and project delivery deadlines are aligned!"}

        else:
            return {
                "reply": (
                    "### 🤖 WorkLens AI Executive Assistant\n"
                    "I am powered by Google Gemini tool calling and deterministic calculation engines. Try asking:\n"
                    "• *'Who is currently overloaded?'*\n"
                    "• *'Who has available bandwidth to take on tasks?'*\n"
                    "• *'What is the delivery risk of the Payment Gateway project?'*\n"
                    "• *'Recommend task reassignments to balance team workload'* \n"
                )
            }
    finally:
        db.close()

