from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, Employee, Task, Project, Recommendation, ActivityLog, TaskDependency
from backend.schemas.schemas import (
    UserRegister, LoginRequest, AuthResponse, UserResponse,
    EmployeeResponse, TaskResponse, TaskCreate, TaskUpdate,
    ProjectResponse, RecommendationResponse, DashboardSummary,
    ChatRequest, ChatResponse,
    ActivityLogResponse, TaskDependencyCreate, TaskDependencyResponse,
    WhatIfScenarioRequest, WhatIfScenarioResponse
)
from backend.core.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_optional_user
)
from backend.services.workload_engine import calculate_team_workload_metrics, calculate_employee_workload
from backend.services.risk_engine import calculate_all_projects_risk, calculate_project_risk
from backend.services.allocation_engine import (
    generate_recommendations_for_overloaded, find_reassignment_candidates,
    evaluate_what_if_scenario, commit_what_if_scenario
)
from backend.services.ai_agent import process_chat_query
from backend.services.csv_importer import import_employees_csv, import_tasks_csv
from backend.seed import seed_database

router = APIRouter(prefix="/api")

# --- Authentication Endpoints ---
@router.post("/auth/register", response_model=AuthResponse)
def register_user(req: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_pw = hash_password(req.password)
    user = User(
        name=req.name.strip(),
        email=req.email.strip().lower(),
        password_hash=hashed_pw,
        role=req.role,
        tenant_id=req.tenant_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email, "tenant_id": user.tenant_id})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/auth/login", response_model=AuthResponse)
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user or not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_access_token({"sub": str(user.id), "email": user.email, "tenant_id": user.tenant_id})
    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/auth/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)

# --- Dashboard ---
@router.get("/dashboard", response_model=DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    metrics = calculate_team_workload_metrics(db)
    project_risks = calculate_all_projects_risk(db)
    
    at_risk_projects = [p for p in project_risks if p["risk_level"] in ["HIGH", "MEDIUM"]]
    
    # Check pending recommendations
    recs = db.query(Recommendation).filter(Recommendation.status == "PENDING").all()
    if not recs:
        # Check if there are any genuinely new overloaded candidates (excluding already rejected/approved tasks)
        fresh_recs = generate_recommendations_for_overloaded(db, exclude_processed=True)
        for fr in fresh_recs:
            r_obj = Recommendation(
                task_id=fr["task_id"],
                from_employee_id=fr["from_employee_id"],
                to_employee_id=fr["to_employee_id"],
                reason=fr["reason"],
                risk_before=fr["risk_before"],
                risk_after=fr["risk_after"],
                score=fr["score"],
                status="PENDING"
            )
            db.add(r_obj)
        if fresh_recs:
            db.commit()
            recs = db.query(Recommendation).filter(Recommendation.status == "PENDING").all()

    formatted_recs = []
    for r in recs[:5]:
        task = db.get(Task, r.task_id)
        from_emp = db.get(Employee, r.from_employee_id)
        to_emp = db.get(Employee, r.to_employee_id)
        proj = db.get(Project, task.project_id) if task else None

        from_w = calculate_employee_workload(from_emp, db) if from_emp else {}
        to_w = calculate_employee_workload(to_emp, db) if to_emp else {}

        from_after = round(((from_w.get("assigned_hours", 0) - (task.remaining_hours if task else 0)) / from_emp.weekly_capacity) * 100.0, 1) if from_emp else 0.0
        to_after = round(((to_w.get("assigned_hours", 0) + (task.remaining_hours if task else 0)) / to_emp.weekly_capacity) * 100.0, 1) if to_emp else 0.0

        formatted_recs.append({
            "id": r.id,
            "task_id": r.task_id,
            "task_title": task.title if task else "Task",
            "project_name": proj.name if proj else "Project",
            "from_employee_id": r.from_employee_id,
            "from_employee_name": from_emp.name if from_emp else "N/A",
            "from_employee_util_before": from_w.get("utilization", 0.0),
            "from_employee_util_after": from_after,
            "to_employee_id": r.to_employee_id,
            "to_employee_name": to_emp.name if to_emp else "N/A",
            "to_employee_util_before": to_w.get("utilization", 0.0),
            "to_employee_util_after": to_after,
            "reason": r.reason,
            "risk_before": r.risk_before,
            "risk_after": r.risk_after,
            "score": r.score,
            "status": r.status,
            "created_at": r.created_at
        })

    # Prepare Workload Bar Chart Data
    chart_data = []
    for emp in metrics["workload_breakdown"]:
        chart_data.append({
            "name": emp["name"],
            "utilization": emp["utilization"],
            "capacity": emp["capacity"],
            "assigned_hours": emp["assigned_hours"],
            "status": emp["risk_status"]
        })

    return {
        "total_employees": metrics["total_employees"],
        "team_utilization": metrics["team_utilization"],
        "overloaded_count": metrics["overloaded_count"],
        "available_count": metrics["available_count"],
        "healthy_count": metrics["healthy_count"],
        "high_count": metrics["high_count"],
        "available_capacity_hours": metrics["available_capacity_hours"],
        "at_risk_projects_count": len(at_risk_projects),
        "workload_chart": chart_data,
        "project_risks": project_risks,
        "top_recommendations": formatted_recs
    }

# --- Employees ---
@router.get("/employees", response_model=List[EmployeeResponse])
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(Employee).all()
    res = []
    for emp in employees:
        w = calculate_employee_workload(emp, db)
        res.append(EmployeeResponse(
            id=emp.id,
            tenant_id=emp.tenant_id,
            name=emp.name,
            role=emp.role,
            skills=emp.skills,
            weekly_capacity=emp.weekly_capacity,
            availability=emp.availability,
            assigned_hours=w["assigned_hours"],
            utilization=w["utilization"],
            risk_status=w["risk_status"],
            active_tasks_count=w["active_tasks_count"],
            created_at=emp.created_at
        ))
    return res

@router.get("/employees/{id}", response_model=EmployeeResponse)
def get_employee(id: int, db: Session = Depends(get_db)):
    emp = db.get(Employee, id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    w = calculate_employee_workload(emp, db)
    return EmployeeResponse(
        id=emp.id,
        tenant_id=emp.tenant_id,
        name=emp.name,
        role=emp.role,
        skills=emp.skills,
        weekly_capacity=emp.weekly_capacity,
        availability=emp.availability,
        assigned_hours=w["assigned_hours"],
        utilization=w["utilization"],
        risk_status=w["risk_status"],
        active_tasks_count=w["active_tasks_count"],
        created_at=emp.created_at
    )

# --- Projects ---
@router.get("/projects", response_model=List[ProjectResponse])
def get_projects(db: Session = Depends(get_db)):
    risks = calculate_all_projects_risk(db)
    res = []
    for r in risks:
        proj = db.get(Project, r["project_id"])
        if not proj:
            continue
        res.append(ProjectResponse(
            id=proj.id,
            tenant_id=proj.tenant_id,
            name=proj.name,
            description=proj.description,
            priority=proj.priority,
            deadline=proj.deadline,
            status=proj.status,
            progress=r["progress"],
            remaining_effort=r["remaining_effort"],
            total_tasks=r["total_tasks"],
            completed_tasks=r["completed_tasks"],
            risk_score=r["risk_score"],
            risk_level=r["risk_level"],
            risk_explanation=r["risk_explanation"],
            team_members=r["team_members"],
            created_at=proj.created_at
        ))
    return res

@router.get("/projects/{id}")
def get_project_details(id: int, db: Session = Depends(get_db)):
    proj = db.get(Project, id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    risk_info = calculate_project_risk(proj, db)
    tasks = db.query(Task).filter(Task.project_id == id).all()
    
    task_responses = []
    for t in tasks:
        emp = db.get(Employee, t.assigned_employee_id) if t.assigned_employee_id else None
        task_responses.append({
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "assigned_employee_id": t.assigned_employee_id,
            "assigned_employee_name": emp.name if emp else "Unassigned",
            "estimated_hours": t.estimated_hours,
            "remaining_hours": t.remaining_hours,
            "priority": t.priority,
            "deadline": t.deadline,
            "complexity": t.complexity,
            "required_skills": t.required_skills,
            "status": t.status
        })

    return {
        "project": {
            "id": proj.id,
            "tenant_id": proj.tenant_id,
            "name": proj.name,
            "description": proj.description,
            "priority": proj.priority,
            "deadline": proj.deadline,
            "status": proj.status,
            "risk_score": risk_info["risk_score"],
            "risk_level": risk_info["risk_level"],
            "risk_explanation": risk_info["risk_explanation"],
            "progress": risk_info["progress"],
            "remaining_effort": risk_info["remaining_effort"]
        },
        "tasks": task_responses
    }

# --- Tasks ---
@router.get("/tasks", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    res = []
    for t in tasks:
        emp = db.get(Employee, t.assigned_employee_id) if t.assigned_employee_id else None
        proj = db.get(Project, t.project_id) if t.project_id else None
        res.append(TaskResponse(
            id=t.id,
            tenant_id=t.tenant_id,
            project_id=t.project_id,
            title=t.title,
            description=t.description,
            assigned_employee_id=t.assigned_employee_id,
            assigned_employee_name=emp.name if emp else None,
            project_name=proj.name if proj else None,
            estimated_hours=t.estimated_hours,
            remaining_hours=t.remaining_hours,
            priority=t.priority,
            deadline=t.deadline,
            complexity=t.complexity,
            required_skills=t.required_skills,
            status=t.status,
            created_at=t.created_at
        ))
    return res

@router.post("/tasks", response_model=TaskResponse)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**task_in.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)

    emp = db.get(Employee, task.assigned_employee_id) if task.assigned_employee_id else None
    proj = db.get(Project, task.project_id) if task.project_id else None

    # Activity Log
    log = ActivityLog(
        tenant_id=task.tenant_id,
        action="CREATE_TASK",
        entity_type="Task",
        entity_id=task.id,
        description=f"Created task '{task.title}' ({task.remaining_hours}h) assigned to {emp.name if emp else 'Unassigned'}."
    )
    db.add(log)
    db.commit()

    return TaskResponse(
        id=task.id,
        tenant_id=task.tenant_id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        assigned_employee_id=task.assigned_employee_id,
        assigned_employee_name=emp.name if emp else None,
        project_name=proj.name if proj else None,
        estimated_hours=task.estimated_hours,
        remaining_hours=task.remaining_hours,
        priority=task.priority,
        deadline=task.deadline,
        complexity=task.complexity,
        required_skills=task.required_skills,
        status=task.status,
        created_at=task.created_at
    )

@router.put("/tasks/{id}", response_model=TaskResponse)
def update_task(id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    task = db.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_emp_id = task.assigned_employee_id
    update_data = task_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    emp = db.get(Employee, task.assigned_employee_id) if task.assigned_employee_id else None
    proj = db.get(Project, task.project_id) if task.project_id else None

    # Activity Log
    action_type = "REASSIGN_TASK" if ("assigned_employee_id" in update_data and update_data["assigned_employee_id"] != old_emp_id) else "UPDATE_TASK"
    old_emp = db.get(Employee, old_emp_id) if old_emp_id else None
    desc = f"Reassigned '{task.title}' from {old_emp.name if old_emp else 'Unassigned'} to {emp.name if emp else 'Unassigned'}." if action_type == "REASSIGN_TASK" else f"Updated task details for '{task.title}' (Status: {task.status}, {task.remaining_hours}h remaining)."

    log = ActivityLog(
        tenant_id=task.tenant_id,
        action=action_type,
        entity_type="Task",
        entity_id=task.id,
        description=desc
    )
    db.add(log)
    db.commit()

    return TaskResponse(
        id=task.id,
        tenant_id=task.tenant_id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        assigned_employee_id=task.assigned_employee_id,
        assigned_employee_name=emp.name if emp else None,
        project_name=proj.name if proj else None,
        estimated_hours=task.estimated_hours,
        remaining_hours=task.remaining_hours,
        priority=task.priority,
        deadline=task.deadline,
        complexity=task.complexity,
        required_skills=task.required_skills,
        status=task.status,
        created_at=task.created_at
    )

@router.delete("/tasks/{id}")
def delete_task(id: int, db: Session = Depends(get_db)):
    task = db.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_title = task.title
    tenant_id = task.tenant_id

    # Clean up associated dependencies
    db.query(TaskDependency).filter(
        (TaskDependency.task_id == id) | (TaskDependency.depends_on_task_id == id)
    ).delete(synchronize_session=False)

    # Clean up associated recommendations
    db.query(Recommendation).filter(Recommendation.task_id == id).delete(synchronize_session=False)

    # Delete task
    db.delete(task)

    # Activity Log
    log = ActivityLog(
        tenant_id=tenant_id,
        action="DELETE_TASK",
        entity_type="Task",
        entity_id=id,
        description=f"Deleted task '{task_title}'."
    )
    db.add(log)
    db.commit()

    return {"success": True, "message": f"Task '{task_title}' deleted successfully."}

# --- Recommendations ---
@router.get("/recommendations")
def get_recommendations(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Recommendation)
    if status:
        query = query.filter(Recommendation.status == status.upper())
    recs = query.all()

    res = []
    for r in recs:
        task = db.get(Task, r.task_id)
        from_emp = db.get(Employee, r.from_employee_id)
        to_emp = db.get(Employee, r.to_employee_id)
        proj = db.get(Project, task.project_id) if task else None

        from_w = calculate_employee_workload(from_emp, db) if from_emp else {}
        to_w = calculate_employee_workload(to_emp, db) if to_emp else {}

        from_after = round(((from_w.get("assigned_hours", 0) - (task.remaining_hours if task else 0)) / from_emp.weekly_capacity) * 100.0, 1) if from_emp else 0.0
        to_after = round(((to_w.get("assigned_hours", 0) + (task.remaining_hours if task else 0)) / to_emp.weekly_capacity) * 100.0, 1) if to_emp else 0.0

        res.append({
            "id": r.id,
            "tenant_id": r.tenant_id,
            "task_id": r.task_id,
            "task_title": task.title if task else "Task",
            "project_name": proj.name if proj else "Project",
            "from_employee_id": r.from_employee_id,
            "from_employee_name": from_emp.name if from_emp else "N/A",
            "from_employee_util_before": from_w.get("utilization", 0.0),
            "from_employee_util_after": from_after,
            "to_employee_id": r.to_employee_id,
            "to_employee_name": to_emp.name if to_emp else "N/A",
            "to_employee_util_before": to_w.get("utilization", 0.0),
            "to_employee_util_after": to_after,
            "reason": r.reason,
            "risk_before": r.risk_before,
            "risk_after": r.risk_after,
            "score": r.score,
            "status": r.status,
            "created_at": r.created_at
        })
    return res

@router.post("/recommendations/{id}/approve")
def approve_recommendation(id: int, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if rec.status == "APPROVED":
        return {"message": "Recommendation already approved", "recommendation_id": id}

    task = db.get(Task, rec.task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Associated task not found")

    old_owner_id = task.assigned_employee_id
    new_owner_id = rec.to_employee_id

    # Execute Reassignment
    task.assigned_employee_id = new_owner_id
    rec.status = "APPROVED"

    from_emp = db.get(Employee, old_owner_id) if old_owner_id else None
    to_emp = db.get(Employee, new_owner_id)

    # Activity Log
    log = ActivityLog(
        tenant_id=rec.tenant_id,
        action="APPROVE_RECOMMENDATION",
        entity_type="Task",
        entity_id=task.id,
        description=f"Approved recommendation: Reassigned '{task.title}' from {from_emp.name if from_emp else 'N/A'} to {to_emp.name if to_emp else 'N/A'}."
    )
    db.add(log)
    db.commit()

    # Recalculate metrics
    from_w = calculate_employee_workload(from_emp, db) if from_emp else {}
    to_w = calculate_employee_workload(to_emp, db) if to_emp else {}

    return {
        "success": True,
        "message": f"Successfully reassigned '{task.title}' to {to_emp.name if to_emp else 'N/A'}.",
        "task_id": task.id,
        "from_employee": {
            "name": from_emp.name if from_emp else "N/A",
            "utilization": from_w.get("utilization", 0.0),
            "status": from_w.get("risk_status", "HEALTHY")
        },
        "to_employee": {
            "name": to_emp.name if to_emp else "N/A",
            "utilization": to_w.get("utilization", 0.0),
            "status": to_w.get("risk_status", "HEALTHY")
        }
    }

@router.post("/recommendations/{id}/reject")
def reject_recommendation(id: int, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = "REJECTED"
    db.commit()
    return {"success": True, "message": "Recommendation rejected"}

# --- AI Chat ---
@router.post("/chat", response_model=ChatResponse)
def ai_chat(req: ChatRequest):
    res = process_chat_query(req.message)
    return ChatResponse(
        reply=res["reply"],
        tool_calls=res.get("tool_calls", [])
    )

# --- CSV Importers ---
@router.post("/import/employees")
async def import_employees(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    csv_text = content.decode("utf-8")
    result = import_employees_csv(csv_text, db)
    return result

@router.post("/import/tasks")
async def import_tasks(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    csv_text = content.decode("utf-8")
    result = import_tasks_csv(csv_text, db)
    return result

# --- Workload Scenario API ---
AVAILABLE_SCENARIOS = [
    {
        "id": "baseline",
        "title": "Baseline Imbalance",
        "badge": "Standard Demo",
        "description": "Rahul overloaded @ 122.5%, Neha available @ 52.5%, Payment Gateway HIGH risk."
    },
    {
        "id": "crunch",
        "title": "Cascading Deadline Crunch",
        "badge": "High Pressure",
        "description": "3 projects due in < 48 hours, severe capacity deficit across multiple senior engineers."
    },
    {
        "id": "outage",
        "title": "Tech Lead Emergency Absence",
        "badge": "Incident",
        "description": "Lead Systems Engineer on emergency leave; 43.5 hours dumped onto remaining team."
    },
    {
        "id": "skillgap",
        "title": "Skill Bottleneck & Complexity",
        "badge": "Skill Deficit",
        "description": "Complex tasks requiring specialized Rust/Kubernetes skills assigned to wrong engineers."
    }
]

@router.get("/scenarios")
def list_scenarios():
    return AVAILABLE_SCENARIOS

@router.post("/scenarios/apply/{scenario_id}")
def apply_scenario(scenario_id: str):
    valid_ids = [s["id"] for s in AVAILABLE_SCENARIOS]
    if scenario_id not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Invalid scenario ID '{scenario_id}'. Must be one of {valid_ids}")

    seed_database(scenario_name=scenario_id)
    matched = next((s for s in AVAILABLE_SCENARIOS if s["id"] == scenario_id), None)
    return {
        "success": True,
        "message": f"Successfully activated workload scenario '{matched['title']}'!",
        "scenario": matched
    }

# --- Reset/Seed API ---
@router.post("/seed/reset")
def reset_demo_data():
    seed_database("baseline")
    return {"success": True, "message": "Demo data reset to baseline scenario successfully!"}

# --- Activity Log Endpoints ---
@router.get("/activity-logs", response_model=List[ActivityLogResponse])
def get_activity_logs(action: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(ActivityLog)
    if action:
        query = query.filter(ActivityLog.action == action.upper())
    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [ActivityLogResponse.model_validate(log) for log in logs]

# --- Task Dependency Endpoints ---
@router.get("/dependencies", response_model=List[TaskDependencyResponse])
def get_dependencies(db: Session = Depends(get_db)):
    deps = db.query(TaskDependency).all()
    res = []
    for d in deps:
        t = db.get(Task, d.task_id)
        prereq = db.get(Task, d.depends_on_task_id)
        res.append(TaskDependencyResponse(
            id=d.id,
            tenant_id=d.tenant_id,
            task_id=d.task_id,
            depends_on_task_id=d.depends_on_task_id,
            task_title=t.title if t else f"Task #{d.task_id}",
            depends_on_task_title=prereq.title if prereq else f"Task #{d.depends_on_task_id}"
        ))
    return res

@router.get("/projects/{id}/dependencies", response_model=List[TaskDependencyResponse])
def get_project_dependencies(id: int, db: Session = Depends(get_db)):
    project_tasks = db.query(Task).filter(Task.project_id == id).all()
    task_ids = [t.id for t in project_tasks]
    deps = db.query(TaskDependency).filter(TaskDependency.task_id.in_(task_ids)).all() if task_ids else []
    
    res = []
    for d in deps:
        t = db.get(Task, d.task_id)
        prereq = db.get(Task, d.depends_on_task_id)
        res.append(TaskDependencyResponse(
            id=d.id,
            tenant_id=d.tenant_id,
            task_id=d.task_id,
            depends_on_task_id=d.depends_on_task_id,
            task_title=t.title if t else f"Task #{d.task_id}",
            depends_on_task_title=prereq.title if prereq else f"Task #{d.depends_on_task_id}"
        ))
    return res

@router.post("/dependencies", response_model=TaskDependencyResponse)
def create_dependency(dep_in: TaskDependencyCreate, db: Session = Depends(get_db)):
    if dep_in.task_id == dep_in.depends_on_task_id:
        raise HTTPException(status_code=400, detail="Task cannot depend on itself")

    existing = db.query(TaskDependency).filter(
        TaskDependency.task_id == dep_in.task_id,
        TaskDependency.depends_on_task_id == dep_in.depends_on_task_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dependency link already exists")

    dep = TaskDependency(**dep_in.model_dump())
    db.add(dep)
    db.commit()
    db.refresh(dep)

    t = db.get(Task, dep.task_id)
    prereq = db.get(Task, dep.depends_on_task_id)

    # Activity Log
    log = ActivityLog(
        tenant_id=dep.tenant_id,
        action="CREATE_DEPENDENCY",
        entity_type="TaskDependency",
        entity_id=dep.id,
        description=f"Linked dependency: '{t.title if t else dep.task_id}' depends on '{prereq.title if prereq else dep.depends_on_task_id}'."
    )
    db.add(log)
    db.commit()

    return TaskDependencyResponse(
        id=dep.id,
        tenant_id=dep.tenant_id,
        task_id=dep.task_id,
        depends_on_task_id=dep.depends_on_task_id,
        task_title=t.title if t else f"Task #{dep.task_id}",
        depends_on_task_title=prereq.title if prereq else f"Task #{dep.depends_on_task_id}"
    )

@router.delete("/dependencies/{id}")
def delete_dependency(id: int, db: Session = Depends(get_db)):
    dep = db.get(TaskDependency, id)
    if not dep:
        raise HTTPException(status_code=404, detail="Dependency not found")

    t = db.get(Task, dep.task_id)
    prereq = db.get(Task, dep.depends_on_task_id)

    db.delete(dep)
    # Activity Log
    log = ActivityLog(
        tenant_id=dep.tenant_id,
        action="DELETE_DEPENDENCY",
        entity_type="TaskDependency",
        entity_id=id,
        description=f"Removed dependency between '{t.title if t else dep.task_id}' and '{prereq.title if prereq else dep.depends_on_task_id}'."
    )
    db.add(log)
    db.commit()

    return {"success": True, "message": "Dependency removed"}

# --- What-If Simulator Endpoints ---
@router.post("/simulator/evaluate", response_model=WhatIfScenarioResponse)
def evaluate_simulator(req: WhatIfScenarioRequest, db: Session = Depends(get_db)):
    changes_dict = [c.model_dump() for c in req.changes]
    result = evaluate_what_if_scenario(changes_dict, db)
    return WhatIfScenarioResponse(**result)

@router.post("/simulator/commit")
def commit_simulator(req: WhatIfScenarioRequest, user_name: Optional[str] = "Manager", db: Session = Depends(get_db)):
    changes_dict = [c.model_dump() for c in req.changes]
    result = commit_what_if_scenario(changes_dict, db, user_name=user_name or "Manager")
    return result
