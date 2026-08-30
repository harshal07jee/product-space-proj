from datetime import datetime, timezone, date
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.models.models import Project, Task, TaskDependency, Employee
from backend.services.workload_engine import calculate_employee_workload

def classify_project_risk(score: float) -> str:
    """
    Classifies project risk score into categories:
    0–30:   LOW
    31–60:  MEDIUM
    61–100: HIGH
    """
    if score <= 30.0:
        return "LOW"
    elif score <= 60.0:
        return "MEDIUM"
    else:
        return "HIGH"

def calculate_project_risk(project: Project, db: Session) -> Dict[str, Any]:
    """
    Calculates deterministic risk score for a project using weighted metrics:
    Risk Score = 0.35 * Capacity Risk + 0.30 * Deadline Pressure + 0.20 * Priority + 0.15 * Dependency Risk
    """
    tasks = db.query(Task).filter(Task.project_id == project.id).all()
    if not tasks:
        return {
            "project_id": project.id,
            "project_name": project.name,
            "risk_score": 0.0,
            "risk_level": "LOW",
            "progress": 100.0,
            "remaining_effort": 0.0,
            "explanation": "No active tasks assigned to this project."
        }

    active_tasks = [t for t in tasks if t.status in ["TODO", "IN_PROGRESS", "IN_REVIEW"]]
    completed_tasks = [t for t in tasks if t.status == "DONE"]
    
    total_est = sum(t.estimated_hours for t in tasks)
    remaining_hours = sum(t.remaining_hours for t in active_tasks)
    progress = round(((total_est - remaining_hours) / total_est * 100.0), 1) if total_est > 0 else 100.0

    # 1. Capacity Risk (0 to 100)
    # Evaluates whether task assignees are overloaded
    assignee_ids = list(set(t.assigned_employee_id for t in active_tasks if t.assigned_employee_id))
    capacity_risks = []
    for emp_id in assignee_ids:
        emp = db.get(Employee, emp_id)
        if emp:
            w = calculate_employee_workload(emp, db)
            if w["utilization"] > 100:
                capacity_risks.append(min(100.0, (w["utilization"] - 80) * 2.0))
            else:
                capacity_risks.append(max(0.0, (w["utilization"] - 70) * 1.5))
    
    capacity_risk_score = (sum(capacity_risks) / len(capacity_risks)) if capacity_risks else 0.0

    # 2. Deadline Pressure (0 to 100)
    # Assesses days remaining until project deadline vs remaining work
    try:
        deadline_date = datetime.strptime(project.deadline, "%Y-%m-%d").date()
        today_date = datetime.now(timezone.utc).date()
        days_remaining = (deadline_date - today_date).days

        if days_remaining <= 0:
            deadline_pressure_score = 100.0 if remaining_hours > 0 else 10.0
        elif days_remaining <= 3:
            deadline_pressure_score = 90.0 if remaining_hours > 10 else 60.0
        elif days_remaining <= 7:
            deadline_pressure_score = 65.0 if remaining_hours > 20 else 40.0
        elif days_remaining <= 14:
            deadline_pressure_score = 35.0
        else:
            deadline_pressure_score = 15.0
    except Exception:
        deadline_pressure_score = 30.0

    # 3. Priority Risk (0 to 100)
    priority_weights = {"CRITICAL": 100.0, "HIGH": 75.0, "MEDIUM": 45.0, "LOW": 20.0}
    priority_score = priority_weights.get(project.priority.upper(), 50.0)

    # 4. Dependency Risk (0 to 100)
    # Checks if any active tasks are blocked by incomplete dependencies
    active_task_ids = [t.id for t in active_tasks]
    deps = db.query(TaskDependency).filter(TaskDependency.task_id.in_(active_task_ids)).all() if active_task_ids else []
    
    blocked_count = 0
    for dep in deps:
        prereq = db.get(Task, dep.depends_on_task_id)
        if prereq and prereq.status != "DONE":
            blocked_count += 1
            
    dependency_score = min(100.0, (blocked_count / len(active_tasks) * 100.0)) if active_tasks else 0.0

    # Weighted Sum Formula
    raw_risk_score = (
        0.35 * capacity_risk_score +
        0.30 * deadline_pressure_score +
        0.20 * priority_score +
        0.15 * dependency_score
    )
    risk_score = round(min(100.0, max(0.0, raw_risk_score)), 1)
    risk_level = classify_project_risk(risk_score)

    # Build human explanation
    reasons = []
    if capacity_risk_score > 50:
        reasons.append("Assignees are overloaded (>100% capacity)")
    if deadline_pressure_score > 50:
        reasons.append("Tight deadline pressure relative to remaining effort")
    if dependency_score > 30:
        reasons.append(f"{blocked_count} tasks blocked by uncompleted upstream dependencies")
    
    explanation = "; ".join(reasons) if reasons else "Project progress is on track with manageable workload."

    # Unique team members
    team_members = list(set(emp.name for emp in db.query(Employee).filter(Employee.id.in_(assignee_ids)).all()))

    return {
        "project_id": project.id,
        "project_name": project.name,
        "priority": project.priority,
        "deadline": project.deadline,
        "progress": progress,
        "remaining_effort": remaining_hours,
        "total_tasks": len(tasks),
        "completed_tasks": len(completed_tasks),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_explanation": explanation,
        "team_members": team_members,
        "components": {
            "capacity_risk": round(capacity_risk_score, 1),
            "deadline_pressure": round(deadline_pressure_score, 1),
            "priority_score": round(priority_score, 1),
            "dependency_risk": round(dependency_score, 1)
        }
    }

def calculate_all_projects_risk(db: Session) -> List[Dict[str, Any]]:
    projects = db.query(Project).all()
    return [calculate_project_risk(p, db) for p in projects]
