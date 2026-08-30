export interface Employee {
  id: number;
  name: string;
  role: string;
  skills: string;
  weekly_capacity: number;
  availability: string;
  assigned_hours: number;
  utilization: number;
  risk_status: "AVAILABLE" | "HEALTHY" | "HIGH" | "OVERLOADED";
  active_tasks_count: number;
  created_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  assigned_employee_id?: number | null;
  assigned_employee_name?: string;
  project_name?: string;
  estimated_hours: number;
  remaining_hours: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deadline: string;
  complexity: "EASY" | "MEDIUM" | "HARD";
  required_skills: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deadline: string;
  status: string;
  progress: number;
  remaining_effort: number;
  total_tasks: number;
  completed_tasks: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  risk_explanation: string;
  team_members: string[];
  created_at: string;
}

export interface Recommendation {
  id: number;
  task_id: number;
  task_title: string;
  project_name: string;
  from_employee_id: number;
  from_employee_name: string;
  from_employee_util_before: number;
  from_employee_util_after: number;
  to_employee_id: number;
  to_employee_name: string;
  to_employee_util_before: number;
  to_employee_util_after: number;
  reason: string;
  risk_before: string;
  risk_after: string;
  score: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

export interface DashboardData {
  total_employees: number;
  team_utilization: number;
  overloaded_count: number;
  available_count: number;
  healthy_count: number;
  high_count: number;
  available_capacity_hours: number;
  at_risk_projects_count: number;
  workload_chart: {
    name: string;
    utilization: number;
    capacity: number;
    assigned_hours: number;
    status: string;
  }[];
  project_risks: {
    project_id: number;
    project_name: string;
    priority: string;
    deadline: string;
    progress: number;
    remaining_effort: number;
    risk_score: number;
    risk_level: string;
    risk_explanation: string;
  }[];
  top_recommendations: Recommendation[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface ActivityLog {
  id: number;
  tenant_id: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  description: string;
  created_at: string;
}

export interface TaskDependency {
  id: number;
  tenant_id: string;
  task_id: number;
  depends_on_task_id: number;
  task_title?: string;
  depends_on_task_title?: string;
}

export interface WhatIfChange {
  task_id: number;
  new_assigned_employee_id?: number;
  new_remaining_hours?: number;
  new_deadline?: string;
  new_status?: string;
}

export interface WhatIfWorkloadComparison {
  employee_id: number;
  name: string;
  role: string;
  capacity: number;
  current_assigned_hours: number;
  current_utilization: number;
  current_status: string;
  projected_assigned_hours: number;
  projected_utilization: number;
  projected_status: string;
  delta_utilization: number;
}

export interface WhatIfProjectRiskComparison {
  project_id: number;
  project_name: string;
  priority: string;
  deadline: string;
  current_risk_score: number;
  current_risk_level: string;
  projected_risk_score: number;
  projected_risk_level: string;
  delta_risk_score: number;
  projected_progress: number;
  projected_remaining_effort: number;
}

export interface WhatIfSimulationResponse {
  current_team_utilization: number;
  projected_team_utilization: number;
  current_overloaded_count: number;
  projected_overloaded_count: number;
  current_available_capacity_hours: number;
  projected_available_capacity_hours: number;
  workload_comparison: WhatIfWorkloadComparison[];
  project_risks_comparison: WhatIfProjectRiskComparison[];
  changes_summary: {
    task_id: number;
    task_title: string;
    from_employee_name: string;
    to_employee_name: string;
    remaining_hours: number;
    deadline: string;
    status: string;
  }[];
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
  created_at: string;
}
