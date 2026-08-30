from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from backend.database.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_tenant", index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    role = Column(String, default="Manager")
    created_at = Column(DateTime, default=utc_now)

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_tenant", index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    skills = Column(Text, nullable=False)  # Comma-separated or JSON string, e.g. "Python,API,FastAPI"
    weekly_capacity = Column(Float, default=40.0)
    availability = Column(String, default="Active")
    created_at = Column(DateTime, default=utc_now)

    tasks = relationship("Task", back_populates="assigned_employee")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_tenant", index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    deadline = Column(String, nullable=False)    # ISO date string e.g. "2026-09-03"
    status = Column(String, default="IN_PROGRESS") # PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD
    created_at = Column(DateTime, default=utc_now)

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_tenant", index=True, nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assigned_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    estimated_hours = Column(Float, default=0.0)
    remaining_hours = Column(Float, default=0.0)
    priority = Column(String, default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    deadline = Column(String, nullable=False)    # ISO date string
    complexity = Column(String, default="MEDIUM") # EASY, MEDIUM, HARD
    required_skills = Column(Text, nullable=False) # e.g. "Python,API"
    status = Column(String, default="TODO")      # TODO, IN_PROGRESS, IN_REVIEW, DONE
    created_at = Column(DateTime, default=utc_now)

    project = relationship("Project", back_populates="tasks")
    assigned_employee = relationship("Employee", back_populates="tasks")

class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_tenant", index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    depends_on_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_tenant", index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    from_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    to_employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    reason = Column(Text, nullable=False)
    risk_before = Column(String, default="HIGH")
    risk_after = Column(String, default="LOW")
    score = Column(Float, default=0.0)
    status = Column(String, default="PENDING")  # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime, default=utc_now)

    task = relationship("Task")
    from_employee = relationship("Employee", foreign_keys=[from_employee_id])
    to_employee = relationship("Employee", foreign_keys=[to_employee_id])

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, default="default_tenant", index=True, nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
