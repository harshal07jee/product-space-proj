import csv
import io
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.models.models import Employee, Task, Project, ActivityLog, Recommendation
from backend.services.allocation_engine import generate_recommendations_for_overloaded

def _get_field(row: Dict[str, str], aliases: List[str], default: str = "") -> str:
    """Helper to match dict keys flexibly across column variations."""
    row_normalized = {k.strip().lower().replace(" ", "_"): v for k, v in row.items() if k}
    for alias in aliases:
        clean_alias = alias.strip().lower().replace(" ", "_")
        if clean_alias in row_normalized:
            val = row_normalized[clean_alias]
            if val is not None:
                return str(val).strip()
    return default

def import_employees_csv(csv_content: str, db: Session, tenant_id: str = "default_tenant") -> Dict[str, Any]:
    # Strip UTF-8 BOM if present
    if csv_content.startswith('\ufeff'):
        csv_content = csv_content[1:]

    reader = csv.DictReader(io.StringIO(csv_content))
    created_count = 0
    updated_count = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        name = _get_field(row, ["name", "employee_name", "employee", "full_name"])
        role = _get_field(row, ["role", "title", "position", "job_title"], "Engineer")
        skills = _get_field(row, ["skills", "required_skills", "skill_set", "technologies"])
        capacity_str = _get_field(row, ["weekly_capacity", "capacity", "hours", "weekly_hours"], "40")

        if not name:
            errors.append(f"Row {idx}: Missing employee name")
            continue

        try:
            capacity = float(capacity_str)
        except ValueError:
            capacity = 40.0

        existing = db.query(Employee).filter(
            Employee.name == name,
            Employee.tenant_id == tenant_id
        ).first()

        if existing:
            if role:
                existing.role = role
            if skills:
                existing.skills = skills
            existing.weekly_capacity = capacity
            updated_count += 1
        else:
            emp = Employee(
                tenant_id=tenant_id,
                name=name,
                role=role or "Software Engineer",
                skills=skills,
                weekly_capacity=capacity,
                availability="Active"
            )
            db.add(emp)
            created_count += 1

    db.commit()

    # Regenerate recommendations
    recs = generate_recommendations_for_overloaded(db, exclude_processed=True)
    for fr in recs:
        r_obj = Recommendation(
            tenant_id=tenant_id,
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
    if recs:
        db.commit()

    # Log action
    log = ActivityLog(
        tenant_id=tenant_id,
        action="IMPORT_EMPLOYEES_CSV",
        entity_type="Employee",
        description=f"Imported CSV: Created {created_count} employees, updated {updated_count} employees."
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "created_count": created_count,
        "updated_count": updated_count,
        "new_recommendations": len(recs),
        "errors": errors
    }

def import_tasks_csv(csv_content: str, db: Session, tenant_id: str = "default_tenant") -> Dict[str, Any]:
    if csv_content.startswith('\ufeff'):
        csv_content = csv_content[1:]

    reader = csv.DictReader(io.StringIO(csv_content))
    created_count = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        title = _get_field(row, ["title", "task", "task_name", "name"])
        project_name = _get_field(row, ["project", "project_name", "project_title"], "General Project")
        assigned_name = _get_field(row, ["assigned_employee", "assigned_to", "assignee", "employee"])
        est_hours_str = _get_field(row, ["estimated_hours", "estimated", "est_hours", "hours"], "10")
        rem_hours_str = _get_field(row, ["remaining_hours", "remaining", "rem_hours"], est_hours_str)
        priority = _get_field(row, ["priority", "prio", "importance"], "MEDIUM").upper()
        deadline = _get_field(row, ["deadline", "due_date", "date"], "2026-09-15")
        skills = _get_field(row, ["required_skills", "skills", "skill_set", "tech"])

        if not title:
            errors.append(f"Row {idx}: Missing task title")
            continue

        try:
            est_hours = float(est_hours_str)
            rem_hours = float(rem_hours_str)
        except ValueError:
            est_hours = 10.0
            rem_hours = 10.0

        if priority not in ["HIGH", "MEDIUM", "LOW"]:
            priority = "MEDIUM"

        # Find or create project
        proj = db.query(Project).filter(
            Project.name == project_name,
            Project.tenant_id == tenant_id
        ).first()

        if not proj:
            proj = Project(
                tenant_id=tenant_id,
                name=project_name,
                description=f"Project imported via CSV",
                priority=priority,
                deadline=deadline,
                status="IN_PROGRESS"
            )
            db.add(proj)
            db.flush()

        # Find employee
        emp = db.query(Employee).filter(
            Employee.name == assigned_name,
            Employee.tenant_id == tenant_id
        ).first() if assigned_name else None

        task = Task(
            tenant_id=tenant_id,
            project_id=proj.id,
            title=title,
            description=f"Task imported via CSV",
            assigned_employee_id=emp.id if emp else None,
            estimated_hours=est_hours,
            remaining_hours=rem_hours,
            priority=priority,
            deadline=deadline,
            complexity="MEDIUM",
            required_skills=skills,
            status="IN_PROGRESS" if rem_hours > 0 else "COMPLETED"
        )
        db.add(task)
        created_count += 1

    db.commit()

    # Regenerate recommendations
    recs = generate_recommendations_for_overloaded(db, exclude_processed=True)
    for fr in recs:
        r_obj = Recommendation(
            tenant_id=tenant_id,
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
    if recs:
        db.commit()

    log = ActivityLog(
        tenant_id=tenant_id,
        action="IMPORT_TASKS_CSV",
        entity_type="Task",
        description=f"Imported CSV: Created {created_count} tasks."
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "created_count": created_count,
        "new_recommendations": len(recs),
        "errors": errors
    }

