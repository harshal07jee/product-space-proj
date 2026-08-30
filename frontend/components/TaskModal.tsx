"use client";

import React, { useState, useEffect } from "react";
import { Employee, Project, Task } from "@/lib/types";
import { createTask, updateTask, deleteTask } from "@/lib/api";
import { X, Check, Trash2, Plus, Edit3, AlertTriangle, Briefcase, Calendar, Clock, Layers } from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  taskToEdit?: Task | null;
  projects: Project[];
  employees: Employee[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  taskToEdit,
  projects,
  employees,
}) => {
  const isEditing = Boolean(taskToEdit);

  const [projectId, setProjectId] = useState<number>(projects[0]?.id || 1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<number | null>(null);
  const [estimatedHours, setEstimatedHours] = useState<number>(8);
  const [remainingHours, setRemainingHours] = useState<number>(8);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [complexity, setComplexity] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [requiredSkills, setRequiredSkills] = useState("Python,API");
  const [status, setStatus] = useState<"TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE">("TODO");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setProjectId(taskToEdit.project_id);
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || "");
      setAssignedEmployeeId(taskToEdit.assigned_employee_id || null);
      setEstimatedHours(taskToEdit.estimated_hours);
      setRemainingHours(taskToEdit.remaining_hours);
      setPriority(taskToEdit.priority);
      setDeadline(taskToEdit.deadline);
      setComplexity(taskToEdit.complexity);
      setRequiredSkills(taskToEdit.required_skills);
      setStatus(taskToEdit.status);
    } else {
      setProjectId(projects[0]?.id || 1);
      setTitle("");
      setDescription("");
      setAssignedEmployeeId(employees[0]?.id || null);
      setEstimatedHours(8);
      setRemainingHours(8);
      setPriority("MEDIUM");
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDeadline(defaultDate.toISOString().split("T")[0]);
      setComplexity("MEDIUM");
      setRequiredSkills("React,TypeScript");
      setStatus("TODO");
    }
    setErrorMsg(null);
  }, [taskToEdit, isOpen, projects, employees]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Task title is required");
      return;
    }
    if (!deadline) {
      setErrorMsg("Deadline is required");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isEditing && taskToEdit) {
        await updateTask(taskToEdit.id, {
          title,
          description,
          assigned_employee_id: assignedEmployeeId,
          estimated_hours: Number(estimatedHours),
          remaining_hours: Number(remainingHours),
          priority,
          deadline,
          complexity,
          required_skills: requiredSkills,
          status,
        });
        onSuccess(`Task '${title}' updated successfully.`);
      } else {
        await createTask({
          project_id: Number(projectId),
          title,
          description,
          assigned_employee_id: assignedEmployeeId,
          estimated_hours: Number(estimatedHours),
          remaining_hours: Number(remainingHours),
          priority,
          deadline,
          complexity,
          required_skills: requiredSkills,
          status,
        });
        onSuccess(`Task '${title}' created successfully.`);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit) return;
    if (!confirm(`Are you sure you want to delete '${taskToEdit.title}'?`)) return;

    setLoading(true);
    try {
      await deleteTask(taskToEdit.id);
      onSuccess(`Task '${taskToEdit.title}' deleted.`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {isEditing ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEditing ? `Edit Task #${taskToEdit?.id}` : "Create New Task"}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing ? "Update task properties, remaining hours, or reassign ownership" : "Define effort, assignees, and skill criteria"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Project Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Task Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement OAuth2 Refresh Token Flow"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Project *</label>
              <select
                disabled={isEditing}
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.priority})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Assigned Employee</label>
              <select
                value={assignedEmployeeId || ""}
                onChange={(e) => setAssignedEmployeeId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role}) - {emp.utilization}% ({emp.risk_status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope details, acceptance criteria, or technical blockers..."
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Hours, Priority, Complexity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Est. Hours</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Rem. Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={remainingHours}
                onChange={(e) => setRemainingHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Complexity</label>
              <select
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          {/* Skills, Deadline, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300">Required Skills</label>
              <input
                type="text"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                placeholder="e.g. Python, FastAPI, Docker"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Deadline *</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="DONE">DONE</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center space-x-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Task</span>
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>{isEditing ? "Update Task" : "Create Task"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
