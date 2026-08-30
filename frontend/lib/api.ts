import {
  DashboardData,
  Employee,
  Project,
  Task,
  Recommendation,
  ChatMessage,
  ActivityLog,
  TaskDependency,
  WhatIfChange,
  WhatIfSimulationResponse,
  AuthUser
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// --- Auth Token Helpers ---
const TOKEN_KEY = "worklens_jwt_token";
const USER_KEY = "worklens_auth_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// --- Auth Endpoints ---
export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Invalid email or password");
  }
  const data = await res.json();
  setStoredAuth(data.access_token, data.user);
  return data;
}

export async function registerUser(userData: {
  name: string;
  email: string;
  password: string;
  role?: string;
  tenant_id?: string;
}): Promise<{ access_token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Registration failed");
  }
  const data = await res.json();
  setStoredAuth(data.access_token, data.user);
  return data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

// --- Dashboard & Metrics ---
export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
  return res.json();
}

// --- Employees ---
export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch(`${API_BASE}/employees`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch employees");
  return res.json();
}

// --- Projects ---
export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchProjectDetails(id: number): Promise<{ project: Project; tasks: Task[] }> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch project details");
  return res.json();
}

// --- Tasks CRUD ---
export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/tasks`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function createTask(taskData: {
  project_id: number;
  title: string;
  description?: string;
  assigned_employee_id?: number | null;
  estimated_hours: number;
  remaining_hours: number;
  priority: string;
  deadline: string;
  complexity: string;
  required_skills: string;
  status: string;
}): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create task");
  }
  return res.json();
}

export async function updateTask(id: number, taskData: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to update task");
  }
  return res.json();
}

export async function deleteTask(id: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to delete task");
  }
  return res.json();
}

// --- Dependencies ---
export async function fetchDependencies(): Promise<TaskDependency[]> {
  const res = await fetch(`${API_BASE}/dependencies`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch task dependencies");
  return res.json();
}

export async function fetchProjectDependencies(projectId: number): Promise<TaskDependency[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/dependencies`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch project dependencies");
  return res.json();
}

export async function createDependency(taskId: number, dependsOnTaskId: number): Promise<TaskDependency> {
  const res = await fetch(`${API_BASE}/dependencies`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ task_id: taskId, depends_on_task_id: dependsOnTaskId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create dependency link");
  }
  return res.json();
}

export async function deleteDependency(id: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/dependencies/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete dependency link");
  return res.json();
}

// --- Activity Logs ---
export async function fetchActivityLogs(action?: string, limit: number = 100): Promise<ActivityLog[]> {
  const url = action
    ? `${API_BASE}/activity-logs?action=${encodeURIComponent(action)}&limit=${limit}`
    : `${API_BASE}/activity-logs?limit=${limit}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch activity logs");
  return res.json();
}

// --- What-If Simulator ---
export async function simulateWhatIf(changes: WhatIfChange[]): Promise<WhatIfSimulationResponse> {
  const res = await fetch(`${API_BASE}/simulator/evaluate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ changes }),
  });
  if (!res.ok) throw new Error("Failed to simulate What-If scenario");
  return res.json();
}

export async function commitWhatIf(changes: WhatIfChange[], userName?: string): Promise<{ success: boolean; message: string; updated_tasks_count: number }> {
  const url = userName ? `${API_BASE}/simulator/commit?user_name=${encodeURIComponent(userName)}` : `${API_BASE}/simulator/commit`;
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ changes }),
  });
  if (!res.ok) throw new Error("Failed to commit What-If scenario changes");
  return res.json();
}

// --- Recommendations ---
export async function fetchRecommendations(status?: string): Promise<Recommendation[]> {
  const url = status ? `${API_BASE}/recommendations?status=${status}` : `${API_BASE}/recommendations`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function approveRecommendation(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/recommendations/${id}/approve`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to approve recommendation");
  return res.json();
}

export async function rejectRecommendation(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/recommendations/${id}/reject`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to reject recommendation");
  return res.json();
}

// --- AI Chat ---
export async function sendChatMessage(message: string): Promise<{ reply: string; tool_calls?: any[] }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Failed to communicate with AI Assistant");
  return res.json();
}

// --- CSV Importers ---
export async function uploadCSV(type: "employees" | "tasks", file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/import/${type}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload ${type} CSV`);
  return res.json();
}

// --- Demo Reset & Scenario Switcher ---
export async function fetchScenarios(): Promise<Array<{ id: string; title: string; badge: string; description: string }>> {
  const res = await fetch(`${API_BASE}/scenarios`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function applyScenario(scenarioId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/scenarios/apply/${scenarioId}`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to apply workload scenario");
  return res.json();
}

export async function resetDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/seed/reset`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to reset demo data");
  return res.json();
}
