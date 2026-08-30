from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.models.models import Employee, Task

def classify_utilization(utilization: float) -> str:
    """
    Classifies employee utilization into predefined risk categories:
    < 70%       AVAILABLE
    70–90%      HEALTHY
    90–100%     HIGH
    > 100%      OVERLOADED
    """
    if utilization < 70.0:
        return "AVAILABLE"
    elif utilization <= 90.0:
        return "HEALTHY"
    elif utilization <= 100.0:
        return "HIGH"
    else:
        return "OVERLOADED"

def calculate_employee_workload(employee: Employee, db: Session) -> Dict[str, Any]:
    """
    Calculates total assigned remaining hours, utilization %, and risk category for an employee.
    """
    active_tasks = db.query(Task).filter(
        Task.assigned_employee_id == employee.id,
        Task.status.in_(["TODO", "IN_PROGRESS", "IN_REVIEW"])
    ).all()

    assigned_hours = sum(task.remaining_hours for task in active_tasks)
    capacity = employee.weekly_capacity if employee.weekly_capacity > 0 else 40.0
    utilization = round((assigned_hours / capacity) * 100.0, 1)
    status = classify_utilization(utilization)

    return {
        "employee_id": employee.id,
        "name": employee.name,
        "role": employee.role,
        "capacity": capacity,
        "assigned_hours": assigned_hours,
        "utilization": utilization,
        "risk_status": status,
        "active_tasks_count": len(active_tasks),
        "available_capacity": max(0.0, capacity - assigned_hours)
    }

def calculate_team_workload_metrics(db: Session) -> Dict[str, Any]:
    """
    Computes overall team utilization and breakdown across all active employees.
    """
    employees = db.query(Employee).filter(Employee.availability == "Active").all()
    if not employees:
        return {
            "total_employees": 0,
            "team_utilization": 0.0,
            "overloaded_count": 0,
            "high_count": 0,
            "healthy_count": 0,
            "available_count": 0,
            "available_capacity_hours": 0.0,
            "workload_breakdown": []
        }

    breakdowns = [calculate_employee_workload(emp, db) for emp in employees]

    total_capacity = sum(b["capacity"] for b in breakdowns)
    total_assigned = sum(b["assigned_hours"] for b in breakdowns)
    overall_utilization = round((total_assigned / total_capacity * 100.0), 1) if total_capacity > 0 else 0.0

    available_hours = sum(b["available_capacity"] for b in breakdowns)
    overloaded_count = sum(1 for b in breakdowns if b["risk_status"] == "OVERLOADED")
    high_count = sum(1 for b in breakdowns if b["risk_status"] == "HIGH")
    healthy_count = sum(1 for b in breakdowns if b["risk_status"] == "HEALTHY")
    available_count = sum(1 for b in breakdowns if b["risk_status"] == "AVAILABLE")

    return {
        "total_employees": len(employees),
        "team_utilization": overall_utilization,
        "overloaded_count": overloaded_count,
        "high_count": high_count,
        "healthy_count": healthy_count,
        "available_count": available_count,
        "available_capacity_hours": available_hours,
        "workload_breakdown": breakdowns
    }
