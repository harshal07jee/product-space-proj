from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.models.models import Employee, Task, Project, Recommendation
from backend.services.workload_engine import calculate_employee_workload
from backend.services.risk_engine import calculate_project_risk

SKILL_ALIASES = {
    "reactjs": "react",
    "react": "react",
    "nodejs": "node",
    "node": "node",
    "fastapi": "fastapi",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "golang": "go",
    "go": "go",
    "tailwindcss": "tailwind",
    "tailwind": "tailwind",
    "javascript": "javascript",
    "js": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "python": "python",
    "py": "python",
}

def normalize_skill_token(token: str) -> str:
    """Normalizes skill tokens by lowercasing and stripping special characters."""
    clean = token.strip().lower().replace("-", "").replace(".", "").replace(" ", "").replace("_", "")
    return SKILL_ALIASES.get(clean, clean)

def parse_skills(skill_str: str) -> List[str]:
    if not skill_str:
        return []
    raw_tokens = [s.strip() for s in skill_str.replace(";", ",").split(",") if s.strip()]
    normalized = []
    for t in raw_tokens:
        norm = normalize_skill_token(t)
        if norm and norm not in normalized:
            normalized.append(norm)
    return normalized

def match_skills(required_skills: List[str], candidate_skills: List[str]) -> List[str]:
    """Matches skills using exact token comparison to prevent substring false-positives."""
    cand_set = set(candidate_skills)
    return [req for req in required_skills if req in cand_set]

def evaluate_reassignment_candidate(
    candidate: Employee,
    task: Task,
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    Evaluates an employee candidate for taking over a specific task.
    Returns candidate score and rationale if eligible, or None if rejected.
    """
    # 1. Exact Skill Match Check
    req_skills = parse_skills(task.required_skills)
    cand_skills = parse_skills(candidate.skills)

    matched_skills = match_skills(req_skills, cand_skills)
    skill_match_ratio = (len(matched_skills) / len(req_skills)) if req_skills else 1.0

    if skill_match_ratio < 0.5 and len(req_skills) > 0:
        return None  # Reject if lacking core required skills

    # 2. Current Workload Check
    workload = calculate_employee_workload(candidate, db)
    current_util = workload["utilization"]

    # Reject if already critically overloaded (> 110%)
    if current_util >= 110.0 and candidate.id != task.assigned_employee_id:
        return None

    # 3. Available Capacity Score (0-100)
    avail_hours = workload["available_capacity"]
    capacity_score = min(100.0, (avail_hours / max(1.0, task.remaining_hours)) * 50.0)

    # 4. Project Familiarity Score (0-100)
    existing_project_tasks = db.query(Task).filter(
        Task.project_id == task.project_id,
        Task.assigned_employee_id == candidate.id
    ).count()
    project_familiarity_score = min(100.0, existing_project_tasks * 40.0)

    # 5. Context Switching Cost
    context_switch_penalty = 0.0 if existing_project_tasks > 0 else 15.0

    # Composite Candidate Score
    raw_score = (
        (skill_match_ratio * 40.0) +
        (capacity_score * 0.35) +
        (project_familiarity_score * 0.25) -
        (current_util * 0.20) -
        context_switch_penalty
    )

    # Priority & Deadline Urgency Boost
    prio_boost = 30.0 if task.priority in ["HIGH", "CRITICAL"] else 0.0
    score = round(max(0.0, raw_score + prio_boost), 1)

    # Predicted workloads
    new_assigned = workload["assigned_hours"] + task.remaining_hours
    new_util = round((new_assigned / candidate.weekly_capacity) * 100.0, 1)

    return {
        "employee_id": candidate.id,
        "name": candidate.name,
        "role": candidate.role,
        "skills": candidate.skills,
        "matched_skills": matched_skills,
        "current_utilization": current_util,
        "predicted_utilization": new_util,
        "available_capacity_hours": avail_hours,
        "project_familiarity": existing_project_tasks > 0,
        "score": score
    }

def find_reassignment_candidates(task_id: int, db: Session) -> List[Dict[str, Any]]:
    """
    Finds and ranks all eligible candidates to take over a given task.
    """
    task = db.get(Task, task_id)
    if not task:
        return []

    employees = db.query(Employee).filter(Employee.availability == "Active").all()
    candidates = []

    for emp in employees:
        # Skip current owner if evaluating alternative candidates
        if emp.id == task.assigned_employee_id:
            continue

        eval_res = evaluate_reassignment_candidate(emp, task, db)
        if eval_res:
            candidates.append(eval_res)

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates

def generate_recommendations_for_overloaded(db: Session, exclude_processed: bool = True) -> List[Dict[str, Any]]:
    """
    Scans the system for overloaded employees (> 100% utilization) and generates high-impact recommendations.
    If exclude_processed is True, skips tasks that already have PENDING, APPROVED, or REJECTED recommendations.
    """
    # Track existing recommendations to prevent duplicate proposals
    existing_recs = db.query(Recommendation).all()
    processed_combinations = set()
    for r in existing_recs:
        if exclude_processed:
            processed_combinations.add((r.task_id, r.to_employee_id))
        elif r.status == "PENDING":
            processed_combinations.add((r.task_id, r.to_employee_id))

    employees = db.query(Employee).filter(Employee.availability == "Active").all()
    recs = []

    for emp in employees:
        w = calculate_employee_workload(emp, db)
        if w["utilization"] > 100.0:
            # Find candidate tasks to offload
            active_tasks = db.query(Task).filter(
                Task.assigned_employee_id == emp.id,
                Task.status.in_(["TODO", "IN_PROGRESS"])
            ).order_by(Task.remaining_hours.desc()).all()

            for task in active_tasks:
                candidates = find_reassignment_candidates(task.id, db)
                if candidates:
                    # Select best candidate not already processed
                    top_candidate = None
                    for cand in candidates:
                        if (task.id, cand["employee_id"]) not in processed_combinations:
                            top_candidate = cand
                            break

                    if not top_candidate:
                        continue

                    target_emp = db.get(Employee, top_candidate["employee_id"])
                    if not target_emp:
                        continue

                    # Calculate project risk before and predicted after
                    project = db.get(Project, task.project_id)
                    risk_before = calculate_project_risk(project, db)["risk_level"] if project else "HIGH"

                    # Calculate before/after utilization
                    from_util_before = w["utilization"]
                    from_util_after = round(((w["assigned_hours"] - task.remaining_hours) / emp.weekly_capacity) * 100.0, 1)

                    to_w = calculate_employee_workload(target_emp, db)
                    to_util_before = to_w["utilization"]
                    to_util_after = top_candidate["predicted_utilization"]

                    # Predict project risk level after
                    risk_after = "LOW" if from_util_after <= 95 and to_util_after <= 90 else "MEDIUM"

                    # Build detailed explanation
                    skill_list = ", ".join(top_candidate["matched_skills"]).upper() or "matching technical"
                    proj_text = f"and is already active on '{project.name}'" if top_candidate["project_familiarity"] else "with minimal context switching"
                    
                    reason = (
                        f"{target_emp.name} has the required {skill_list} skills, "
                        f"{top_candidate['available_capacity_hours']:.0f} hours of available capacity, {proj_text}. "
                        f"Reassigning the {task.remaining_hours:.0f}-hour '{task.title}' task reduces {emp.name}'s workload "
                        f"from {from_util_before}% to {from_util_after}% while bringing {target_emp.name} to {to_util_after}%."
                    )

                    recs.append({
                        "task_id": task.id,
                        "task_title": task.title,
                        "project_name": project.name if project else "Project",
                        "from_employee_id": emp.id,
                        "from_employee_name": emp.name,
                        "from_employee_util_before": from_util_before,
                        "from_employee_util_after": from_util_after,
                        "to_employee_id": target_emp.id,
                        "to_employee_name": target_emp.name,
                        "to_employee_util_before": to_util_before,
                        "to_employee_util_after": to_util_after,
                        "reason": reason,
                        "risk_before": risk_before,
                        "risk_after": risk_after,
                        "score": top_candidate["score"],
                        "remaining_hours": task.remaining_hours
                    })
                    processed_combinations.add((task.id, target_emp.id))

    # Sort recommendations by highest impact score
    recs.sort(key=lambda r: r["score"], reverse=True)
    return recs


def evaluate_what_if_scenario(changes: List[Dict[str, Any]], db: Session) -> Dict[str, Any]:
    """
    Evaluates a What-If scenario in-memory without modifying the database.
    Calculates current vs projected team utilization, individual workloads, and project risks.
    """
    from backend.services.workload_engine import calculate_team_workload_metrics, classify_utilization
    from backend.services.risk_engine import calculate_all_projects_risk, classify_project_risk
    from backend.models.models import TaskDependency, ActivityLog

    current_team = calculate_team_workload_metrics(db)
    current_projects = calculate_all_projects_risk(db)

    # Build task map from DB and overlay simulation changes
    all_tasks = db.query(Task).all()
    task_map = {t.id: {
        "id": t.id,
        "project_id": t.project_id,
        "title": t.title,
        "assigned_employee_id": t.assigned_employee_id,
        "estimated_hours": t.estimated_hours,
        "remaining_hours": t.remaining_hours,
        "deadline": t.deadline,
        "priority": t.priority,
        "status": t.status
    } for t in all_tasks}

    changes_summary = []
    for chg in changes:
        t_id = chg.get("task_id")
        if t_id in task_map:
            t = task_map[t_id]
            old_emp_id = t["assigned_employee_id"]
            old_emp = db.get(Employee, old_emp_id) if old_emp_id else None
            
            new_emp_id = chg.get("new_assigned_employee_id", t["assigned_employee_id"])
            new_emp = db.get(Employee, new_emp_id) if new_emp_id else None

            if "new_assigned_employee_id" in chg and chg["new_assigned_employee_id"] is not None:
                t["assigned_employee_id"] = chg["new_assigned_employee_id"]
            if "new_remaining_hours" in chg and chg["new_remaining_hours"] is not None:
                t["remaining_hours"] = float(chg["new_remaining_hours"])
            if "new_deadline" in chg and chg["new_deadline"]:
                t["deadline"] = chg["new_deadline"]
            if "new_status" in chg and chg["new_status"]:
                t["status"] = chg["new_status"]

            changes_summary.append({
                "task_id": t_id,
                "task_title": t["title"],
                "from_employee_name": old_emp.name if old_emp else "Unassigned",
                "to_employee_name": new_emp.name if new_emp else (old_emp.name if old_emp else "Unassigned"),
                "remaining_hours": t["remaining_hours"],
                "deadline": t["deadline"],
                "status": t["status"]
            })

    # Recalculate employee workloads in-memory
    employees = db.query(Employee).filter(Employee.availability == "Active").all()
    emp_map = {e.id: e for e in employees}

    workload_comparison = []
    total_proj_capacity = 0.0
    total_proj_assigned = 0.0
    proj_overloaded_count = 0
    proj_available_hours = 0.0

    current_emp_workloads = {b["employee_id"]: b for b in current_team["workload_breakdown"]}

    for emp_id, emp in emp_map.items():
        curr = current_emp_workloads.get(emp_id, {})
        curr_util = curr.get("utilization", 0.0)
        curr_status = curr.get("risk_status", "HEALTHY")
        capacity = emp.weekly_capacity if emp.weekly_capacity > 0 else 40.0

        # Sum projected active tasks
        proj_assigned = sum(
            t["remaining_hours"] for t in task_map.values()
            if t["assigned_employee_id"] == emp_id and t["status"] in ["TODO", "IN_PROGRESS", "IN_REVIEW"]
        )
        proj_util = round((proj_assigned / capacity) * 100.0, 1)
        proj_status = classify_utilization(proj_util)

        total_proj_capacity += capacity
        total_proj_assigned += proj_assigned
        if proj_status == "OVERLOADED":
            proj_overloaded_count += 1
        proj_available_hours += max(0.0, capacity - proj_assigned)

        workload_comparison.append({
            "employee_id": emp_id,
            "name": emp.name,
            "role": emp.role,
            "capacity": capacity,
            "current_assigned_hours": curr.get("assigned_hours", 0.0),
            "current_utilization": curr_util,
            "current_status": curr_status,
            "projected_assigned_hours": proj_assigned,
            "projected_utilization": proj_util,
            "projected_status": proj_status,
            "delta_utilization": round(proj_util - curr_util, 1)
        })

    projected_team_utilization = round((total_proj_assigned / total_proj_capacity * 100.0), 1) if total_proj_capacity > 0 else 0.0

    # Recalculate project risks in-memory
    projects = db.query(Project).all()
    project_risks_comparison = []

    for proj in projects:
        curr_p = next((p for p in current_projects if p["project_id"] == proj.id), {})
        curr_risk_score = curr_p.get("risk_score", 0.0)
        curr_risk_level = curr_p.get("risk_level", "LOW")

        p_tasks = [t for t in task_map.values() if t["project_id"] == proj.id]
        p_active = [t for t in p_tasks if t["status"] in ["TODO", "IN_PROGRESS", "IN_REVIEW"]]
        p_rem_hours = sum(t["remaining_hours"] for t in p_active)
        total_est = sum(t["estimated_hours"] for t in p_tasks)
        proj_progress = round(((total_est - p_rem_hours) / total_est * 100.0), 1) if total_est > 0 else 100.0

        # Simulated capacity risk
        p_assignee_ids = list(set(t["assigned_employee_id"] for t in p_active if t["assigned_employee_id"]))
        cap_risks = []
        for a_id in p_assignee_ids:
            a_w = next((w for w in workload_comparison if w["employee_id"] == a_id), None)
            if a_w:
                u = a_w["projected_utilization"]
                if u > 100:
                    cap_risks.append(min(100.0, (u - 80) * 2.0))
                else:
                    cap_risks.append(max(0.0, (u - 70) * 1.5))
        sim_cap_risk = (sum(cap_risks) / len(cap_risks)) if cap_risks else 0.0

        # Deadline score
        from datetime import datetime, timezone
        try:
            deadline_date = datetime.strptime(proj.deadline, "%Y-%m-%d").date()
            today_date = datetime.now(timezone.utc).date()
            days_rem = (deadline_date - today_date).days
            if days_rem <= 0:
                sim_dl_score = 100.0 if p_rem_hours > 0 else 10.0
            elif days_rem <= 3:
                sim_dl_score = 90.0 if p_rem_hours > 10 else 60.0
            elif days_rem <= 7:
                sim_dl_score = 65.0 if p_rem_hours > 20 else 40.0
            elif days_rem <= 14:
                sim_dl_score = 35.0
            else:
                sim_dl_score = 15.0
        except Exception:
            sim_dl_score = 30.0

        # Priority score
        prio_weights = {"CRITICAL": 100.0, "HIGH": 75.0, "MEDIUM": 45.0, "LOW": 20.0}
        sim_prio_score = prio_weights.get(proj.priority.upper(), 50.0)

        # Dependency score
        active_ids = [t["id"] for t in p_active]
        deps = db.query(TaskDependency).filter(TaskDependency.task_id.in_(active_ids)).all() if active_ids else []
        blocked = 0
        for d in deps:
            pr = task_map.get(d.depends_on_task_id)
            if pr and pr["status"] != "DONE":
                blocked += 1
        sim_dep_score = min(100.0, (blocked / len(p_active) * 100.0)) if p_active else 0.0

        sim_raw = (0.35 * sim_cap_risk + 0.30 * sim_dl_score + 0.20 * sim_prio_score + 0.15 * sim_dep_score)
        sim_risk_score = round(min(100.0, max(0.0, sim_raw)), 1)
        sim_risk_level = classify_project_risk(sim_risk_score)

        project_risks_comparison.append({
            "project_id": proj.id,
            "project_name": proj.name,
            "priority": proj.priority,
            "deadline": proj.deadline,
            "current_risk_score": curr_risk_score,
            "current_risk_level": curr_risk_level,
            "projected_risk_score": sim_risk_score,
            "projected_risk_level": sim_risk_level,
            "delta_risk_score": round(sim_risk_score - curr_risk_score, 1),
            "projected_progress": proj_progress,
            "projected_remaining_effort": p_rem_hours
        })

    return {
        "current_team_utilization": current_team["team_utilization"],
        "projected_team_utilization": projected_team_utilization,
        "current_overloaded_count": current_team["overloaded_count"],
        "projected_overloaded_count": proj_overloaded_count,
        "current_available_capacity_hours": current_team["available_capacity_hours"],
        "projected_available_capacity_hours": proj_available_hours,
        "workload_comparison": workload_comparison,
        "project_risks_comparison": project_risks_comparison,
        "changes_summary": changes_summary
    }


def commit_what_if_scenario(changes: List[Dict[str, Any]], db: Session, user_name: str = "Manager") -> Dict[str, Any]:
    """
    Applies the validated What-If scenario changes to the database and creates an audit activity log.
    """
    from backend.models.models import ActivityLog
    updated_tasks = []

    for chg in changes:
        t_id = chg.get("task_id")
        task = db.get(Task, t_id)
        if not task:
            continue

        old_emp_id = task.assigned_employee_id
        if "new_assigned_employee_id" in chg and chg["new_assigned_employee_id"] is not None:
            task.assigned_employee_id = chg["new_assigned_employee_id"]
        if "new_remaining_hours" in chg and chg["new_remaining_hours"] is not None:
            task.remaining_hours = float(chg["new_remaining_hours"])
        if "new_deadline" in chg and chg["new_deadline"]:
            task.deadline = chg["new_deadline"]
        if "new_status" in chg and chg["new_status"]:
            task.status = chg["new_status"]

        updated_tasks.append(task.title)

    db.commit()

    # Log Scenario Audit Entry
    desc = f"{user_name} committed a What-If Scenario with {len(updated_tasks)} task updates ({', '.join(updated_tasks[:3])}{'...' if len(updated_tasks) > 3 else ''})."
    log = ActivityLog(
        action="WHAT_IF_COMMIT",
        entity_type="Scenario",
        entity_id=None,
        description=desc
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully applied What-If scenario with {len(updated_tasks)} task updates.",
        "updated_tasks_count": len(updated_tasks)
    }
