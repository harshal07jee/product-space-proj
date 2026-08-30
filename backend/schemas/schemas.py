from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    role: str = "Manager"
    tenant_id: str = "default_tenant"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str = "Manager"
    tenant_id: str = "default_tenant"
    created_at: datetime
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Employee Schemas ---
class EmployeeBase(BaseModel):
    name: str
    role: str
    skills: str
    weekly_capacity: float = 40.0
    availability: str = "Active"

class EmployeeCreate(EmployeeBase):
    tenant_id: Optional[str] = "default_tenant"

class EmployeeResponse(EmployeeBase):
    id: int
    tenant_id: str = "default_tenant"
    assigned_hours: float = 0.0
    utilization: float = 0.0
    risk_status: str = "HEALTHY"
    active_tasks_count: int = 0
    created_at: datetime
    class Config:
        from_attributes = True

# --- Task Schemas ---
class TaskBase(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    assigned_employee_id: Optional[int] = None
    estimated_hours: float
    remaining_hours: float
    priority: str = "MEDIUM"
    deadline: str
    complexity: str = "MEDIUM"
    required_skills: str
    status: str = "TODO"

class TaskCreate(TaskBase):
    tenant_id: Optional[str] = "default_tenant"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_employee_id: Optional[int] = None
    estimated_hours: Optional[float] = None
    remaining_hours: Optional[float] = None
    priority: Optional[str] = None
    deadline: Optional[str] = None
    complexity: Optional[str] = None
    required_skills: Optional[str] = None
    status: Optional[str] = None

class TaskResponse(TaskBase):
    id: int
    tenant_id: str = "default_tenant"
    assigned_employee_name: Optional[str] = None
    project_name: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    priority: str = "MEDIUM"
    deadline: str
    status: str = "IN_PROGRESS"

class ProjectCreate(ProjectBase):
    tenant_id: Optional[str] = "default_tenant"

class ProjectResponse(ProjectBase):
    id: int
    tenant_id: str = "default_tenant"
    progress: float = 0.0
    remaining_effort: float = 0.0
    total_tasks: int = 0
    completed_tasks: int = 0
    risk_score: float = 0.0
    risk_level: str = "LOW"
    risk_explanation: Optional[str] = None
    team_members: List[str] = []
    created_at: datetime
    class Config:
        from_attributes = True

# --- Recommendation Schemas ---
class RecommendationResponse(BaseModel):
    id: int
    tenant_id: str = "default_tenant"
    task_id: int
    task_title: str
    project_name: str
    from_employee_id: int
    from_employee_name: str
    from_employee_util_before: float
    from_employee_util_after: float
    to_employee_id: int
    to_employee_name: str
    to_employee_util_before: float
    to_employee_util_after: float
    reason: str
    risk_before: str
    risk_after: str
    score: float
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

# --- Dashboard & AI Chat Schemas ---
class DashboardSummary(BaseModel):
    total_employees: int
    team_utilization: float
    overloaded_count: int
    available_count: int
    healthy_count: int
    high_count: int
    available_capacity_hours: float
    at_risk_projects_count: int
    workload_chart: List[dict]
    project_risks: List[dict]
    top_recommendations: List[dict]

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    tool_calls: Optional[List[dict]] = None

# --- Activity Log Schemas ---
class ActivityLogResponse(BaseModel):
    id: int
    tenant_id: str = "default_tenant"
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    description: str
    created_at: datetime
    class Config:
        from_attributes = True

# --- Task Dependency Schemas ---
class TaskDependencyBase(BaseModel):
    task_id: int
    depends_on_task_id: int

class TaskDependencyCreate(TaskDependencyBase):
    tenant_id: Optional[str] = "default_tenant"

class TaskDependencyResponse(TaskDependencyBase):
    id: int
    tenant_id: str = "default_tenant"
    task_title: Optional[str] = None
    depends_on_task_title: Optional[str] = None
    class Config:
        from_attributes = True

# --- What-If Simulator Schemas ---
class WhatIfChangeItem(BaseModel):
    task_id: int
    new_assigned_employee_id: Optional[int] = None
    new_remaining_hours: Optional[float] = None
    new_deadline: Optional[str] = None
    new_status: Optional[str] = None

class WhatIfScenarioRequest(BaseModel):
    changes: List[WhatIfChangeItem]

class WhatIfScenarioResponse(BaseModel):
    current_team_utilization: float
    projected_team_utilization: float
    current_overloaded_count: int
    projected_overloaded_count: int
    current_available_capacity_hours: float
    projected_available_capacity_hours: float
    workload_comparison: List[dict]
    project_risks_comparison: List[dict]
    changes_summary: List[dict]
