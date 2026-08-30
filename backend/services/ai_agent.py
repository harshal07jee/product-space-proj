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
SYSTEM_INSTRUCTIONS = """You are WorkLens AI, an enterprise workforce workload assistant.
Your job is to help managers understand team workload, identify delivery risks, and recommend workload redistribution.

Never invent employee, task, project, capacity, deadline, or risk information.
Use the provided tools to retrieve current application data.
Do not perform deterministic numerical calculations yourself when a backend tool can calculate them.

Recommendations must consider:
* employee skills
* employee capacity
* current workload
* task effort
* deadlines
* project familiarity
* dependencies
* delivery risk

Every recommendation must include a concise explanation and measurable expected impact.
Never automatically reassign work without manager approval.
When the manager asks to execute an approved recommendation, use the appropriate backend tool.

Be concise, factual, and evidence-based."""

# Define tool functions for execution
def get_employees_tool() -> str:
    db: Session = SessionLocal()
    try:
        metrics = calculate_team_workload_metrics(db)
        return json.dumps(metrics["workload_breakdown"], indent=2)
    finally:
        db.close()

def get_employee_workload_tool(employee_id: int) -> str:
    db: Session = SessionLocal()
    try:
        emp = db.get(Employee, employee_id)
        if not emp:
            return json.dumps({"error": f"Employee {employee_id} not found"})
        return json.dumps(calculate_employee_workload(emp, db), indent=2)
    finally:
        db.close()

def get_tasks_tool() -> str:
    db: Session = SessionLocal()
    try:
        tasks = db.query(Task).all()
        res = []
        for t in tasks:
            emp = db.get(Employee, t.assigned_employee_id) if t.assigned_employee_id else None
            proj = db.get(Project, t.project_id) if t.project_id else None
            res.append({
                "task_id": t.id,
                "title": t.title,
                "project_name": proj.name if proj else "Unknown",
                "assigned_to": emp.name if emp else "Unassigned",
                "assigned_employee_id": t.assigned_employee_id,
                "remaining_hours": t.remaining_hours,
                "estimated_hours": t.estimated_hours,
                "priority": t.priority,
                "deadline": t.deadline,
                "required_skills": t.required_skills,
                "status": t.status
            })
        return json.dumps(res, indent=2)
    finally:
        db.close()

def get_project_risks_tool() -> str:
    db: Session = SessionLocal()
    try:
        return json.dumps(calculate_all_projects_risk(db), indent=2)
    finally:
        db.close()

def find_available_employees_tool() -> str:
    db: Session = SessionLocal()
    try:
        metrics = calculate_team_workload_metrics(db)
        available = [emp for emp in metrics["workload_breakdown"] if emp["risk_status"] in ["AVAILABLE", "HEALTHY"]]
        return json.dumps(available, indent=2)
    finally:
        db.close()

def find_reassignment_candidates_tool(task_id: int) -> str:
    db: Session = SessionLocal()
    try:
        candidates = find_reassignment_candidates(task_id, db)
        return json.dumps(candidates, indent=2)
    finally:
        db.close()

def calculate_reassignment_impact_tool(task_id: int, employee_id: int) -> str:
    db: Session = SessionLocal()
    try:
        task = db.get(Task, task_id)
        target_emp = db.get(Employee, employee_id)
        if not task or not target_emp:
            return json.dumps({"error": "Task or Target Employee not found"})

        from_emp = db.get(Employee, task.assigned_employee_id) if task.assigned_employee_id else None

        from_before = calculate_employee_workload(from_emp, db) if from_emp else None
        to_before = calculate_employee_workload(target_emp, db)

        from_after_util = round(((from_before["assigned_hours"] - task.remaining_hours) / from_emp.weekly_capacity) * 100.0, 1) if from_emp else 0.0
        to_after_util = round(((to_before["assigned_hours"] + task.remaining_hours) / target_emp.weekly_capacity) * 100.0, 1)

        return json.dumps({
            "task_title": task.title,
            "remaining_hours": task.remaining_hours,
            "from_employee": from_emp.name if from_emp else "Unassigned",
            "from_utilization_before": from_before["utilization"] if from_before else 0,
            "from_utilization_after": from_after_util,
            "to_employee": target_emp.name,
            "to_utilization_before": to_before["utilization"],
            "to_utilization_after": to_after_util,
        }, indent=2)
    finally:
        db.close()

def approve_recommendation_tool(recommendation_id: int) -> str:
    db: Session = SessionLocal()
    try:
        rec = db.get(Recommendation, recommendation_id)
        if not rec:
            return json.dumps({"error": f"Recommendation {recommendation_id} not found"})

        if rec.status == "APPROVED":
            return json.dumps({"status": "Already approved"})

        task = db.get(Task, rec.task_id)
        if not task:
            return json.dumps({"error": f"Task {rec.task_id} not found"})

        task.assigned_employee_id = rec.to_employee_id
        rec.status = "APPROVED"

        # Log Activity
        to_emp = db.get(Employee, rec.to_employee_id)
        from_emp = db.get(Employee, rec.from_employee_id)
        log = ActivityLog(
            action="REASSIGN_TASK",
            entity_type="Task",
            entity_id=task.id,
            description=f"Reassigned '{task.title}' from {from_emp.name if from_emp else 'N/A'} to {to_emp.name if to_emp else 'N/A'} via AI Recommendation."
        )
        db.add(log)
        db.commit()

        return json.dumps({"status": "APPROVED", "message": f"Task '{task.title}' successfully reassigned to {to_emp.name if to_emp else 'N/A'}."})
    finally:
        db.close()


def process_chat_query(user_message: str) -> Dict[str, Any]:
    """
    Main entry point for AI chat queries.
    Uses Gemini API if key is present; otherwise falls back gracefully to a rule-based query engine.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    # If GEMINI_API_KEY is not set or is placeholder string, return fallback response
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
        fallback["reply"] = f"[Gemini API Notice: {str(e)}]\n\n" + fallback["reply"]
        return fallback


def process_fallback_chat(user_message: str) -> Dict[str, Any]:
    """
    Deterministic fallback logic when GEMINI_API_KEY is unconfigured or unavailable.
    """
    db: Session = SessionLocal()
    try:
        msg_lower = user_message.lower()

        if "overloaded" in msg_lower or "who is overloaded" in msg_lower:
            metrics = calculate_team_workload_metrics(db)
            overloaded = [emp for emp in metrics["workload_breakdown"] if emp["risk_status"] == "OVERLOADED"]
            if overloaded:
                lines = ["Here are the currently overloaded employees:"]
                for emp in overloaded:
                    lines.append(f"• **{emp['name']}** ({emp['role']}): {emp['utilization']}% workload ({emp['assigned_hours']} assigned / {emp['capacity']}h capacity)")
                return {"reply": "\n".join(lines)}
            else:
                return {"reply": "Great news! No team members are currently overloaded (>100% capacity)."}

        elif "available" in msg_lower or "capacity" in msg_lower:
            metrics = calculate_team_workload_metrics(db)
            avail = [emp for emp in metrics["workload_breakdown"] if emp["risk_status"] in ["AVAILABLE", "HEALTHY"]]
            lines = [f"Total available team capacity: **{metrics['available_capacity_hours']} hours**.", "Available team members:"]
            for emp in avail:
                lines.append(f"• **{emp['name']}**: {emp['utilization']}% workload ({emp['available_capacity']}h available capacity)")
            return {"reply": "\n".join(lines)}

        elif "risk" in msg_lower or "project" in msg_lower or "payment" in msg_lower:
            risks = calculate_all_projects_risk(db)
            lines = ["Current Project Risk Assessment:"]
            for r in risks:
                lines.append(f"• **{r['project_name']}**: Risk Level **{r['risk_level']}** (Score: {r['risk_score']}/100, Progress: {r['progress']}%). {r['risk_explanation']}")
            return {"reply": "\n".join(lines)}

        elif "recommend" in msg_lower or "reassign" in msg_lower or "task" in msg_lower or "rahul" in msg_lower or "neha" in msg_lower:
            recs = generate_recommendations_for_overloaded(db)
            if recs:
                top = recs[0]
                return {
                    "reply": (
                        f"Top Recommendation:\n"
                        f"Move **{top['task_title']}** ({top['remaining_hours']}h) from **{top['from_employee_name']}** to **{top['to_employee_name']}**.\n\n"
                        f"**Impact:**\n"
                        f"• {top['from_employee_name']} workload: {top['from_employee_util_before']}% → {top['from_employee_util_after']}%\n"
                        f"• {top['to_employee_name']} workload: {top['to_employee_util_before']}% → {top['to_employee_util_after']}%\n"
                        f"• Project Risk: {top['risk_before']} → {top['risk_after']}\n\n"
                        f"**Rationale:** {top['reason']}"
                    )
                }
            else:
                return {"reply": "No high-priority task reassignments are currently required."}

        else:
            return {
                "reply": (
                    "I am **WorkLens AI**. You can ask me:\n"
                    "• *'Who is overloaded?'*\n"
                    "• *'Who has available capacity?'*\n"
                    "• *'Why is the payment project at risk?'*\n"
                    "• *'Recommend workload changes that reduce delivery risk'*\n\n"
                    "*(Note: Set GEMINI_API_KEY in environment variables for full LLM generative capabilities)*"
                )
            }
    finally:
        db.close()
