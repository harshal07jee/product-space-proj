import csv
import io
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.models.models import Employee, Task, Project, ActivityLog

def import_employees_csv(csv_content: str, db: Session, tenant_id: str = "default_tenant") -> Dict[str, Any]:
    reader = csv.DictReader(io.StringIO(csv_content))
    created_count = 0
    updated_count = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        name = row.get("name", "").strip()
        role = row.get("role", "").strip()
        skills = row.get("skills", "").strip()
        capacity_str = row.get("weekly_capacity", "40").strip()

        if not name or not role:
            errors.append(f"Row {idx}: Missing required name or role")
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
            existing.role = role
            existing.skills = skills
            existing.weekly_capacity = capacity
            updated_count += 1
        else:
            emp = Employee(
                tenant_id=tenant_id,
                name=name,
                role=role,
                skills=skills,
                weekly_capacity=capacity,
                availability="Active"
            )
            db.add(emp)
            created_count += 1

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
        "errors": errors
    }

def import_tasks_csv(csv_content: str, db: Session, tenant_id: str = "default_tenant") -> Dict[str, Any]:
    reader = csv.DictReader(io.StringIO(csv_content))
    created_count = 0
    errors = []

    for idx, row in enumerate(reader, start=2):
        title = row.get("title", "").strip()
        project_name = row.get("project", "").strip()
        assigned_name = row.get("assigned_employee", "").strip()
        est_hours_str = row.get("estimated_hours", "0").strip()
        rem_hours_str = row.get("remaining_hours", "0").strip()
        priority = row.get("priority", "MEDIUM").strip().upper()
        deadline = row.get("deadline", "2026-09-15").strip()
        skills = row.get("required_skills", "").strip()

        if not title or not project_name:
            errors.append(f"Row {idx}: Missing required title or project")
            continue

        try:
            est_hours = float(est_hours_str)
            rem_hours = float(rem_hours_str)
        except ValueError:
            est_hours = 10.0
            rem_hours = 10.0

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
            status="TODO"
        )
        db.add(task)
        created_count += 1

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
        "errors": errors
    }
