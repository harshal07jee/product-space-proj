"use client";

import React, { useState } from "react";
import { Employee, Task } from "@/lib/types";
import {
  Users,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Briefcase,
  Code,
  Edit3,
  Plus,
  ArrowRightLeft
} from "lucide-react";

interface TeamViewProps {
  employees: Employee[];
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onCreateTask?: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  employees,
  tasks,
  onEditTask,
  onCreateTask,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const roles = Array.from(new Set(employees.map((e) => e.role)));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.skills.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || emp.role === roleFilter;
    const matchesRisk = riskFilter === "ALL" || emp.risk_status === riskFilter;
    return matchesSearch && matchesRole && matchesRisk;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OVERLOADED":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "HIGH":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "HEALTHY":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      case "AVAILABLE":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  const getUtilBarColor = (util: number) => {
    if (util > 100) return "bg-rose-500";
    if (util > 90) return "bg-amber-500";
    if (util >= 70) return "bg-indigo-500";
    return "bg-emerald-500";
  };

  const selectedEmpTasks = selectedEmployee
    ? tasks.filter((t) => t.assigned_employee_id === selectedEmployee.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>Team Capacity & Workload</span>
          </h2>
          <p className="text-xs text-slate-400">
            Monitor real-time assigned hours, weekly capacity limits, and skill allocations
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search employee or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OVERLOADED">Overloaded (&gt;100%)</option>
            <option value="HIGH">High (90–100%)</option>
            <option value="HEALTHY">Healthy (70–90%)</option>
            <option value="AVAILABLE">Available (&lt;70%)</option>
          </select>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            onClick={() => setSelectedEmployee(emp)}
            className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 cursor-pointer space-y-4 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{emp.name}</h3>
                <p className="text-xs font-medium text-slate-400 flex items-center space-x-1 mt-0.5">
                  <Briefcase className="h-3 w-3 text-slate-500" />
                  <span>{emp.role}</span>
                </p>
              </div>
              <span
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${getStatusBadge(
                  emp.risk_status
                )}`}
              >
                {emp.risk_status}
              </span>
            </div>

            {/* Utilization Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Utilization</span>
                <span className="text-white font-extrabold">{emp.utilization}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${getUtilBarColor(emp.utilization)}`}
                  style={{ width: `${Math.min(125, emp.utilization)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Assigned: {emp.assigned_hours} hrs</span>
                <span>Capacity: {emp.weekly_capacity} hrs</span>
              </div>
            </div>

            {/* Skills Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {emp.skills.split(",").map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-900 text-slate-300 border border-slate-800"
                >
                  {s.trim()}
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>{emp.active_tasks_count} active tasks</span>
              <span className="text-indigo-400 font-semibold hover:underline">Click to view & reassign →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Employee Assigned Tasks Drawer/Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>{selectedEmployee.name}</span>
                  <span className="text-xs text-slate-400 font-normal">({selectedEmployee.role})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Workload: <span className="text-indigo-400 font-bold">{selectedEmployee.utilization}%</span> (
                  {selectedEmployee.assigned_hours}h / {selectedEmployee.weekly_capacity}h)
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Assigned Tasks ({selectedEmpTasks.length})
                </h4>
                {onCreateTask && (
                  <button
                    onClick={() => {
                      setSelectedEmployee(null);
                      onCreateTask();
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Assign Task</span>
                  </button>
                )}
              </div>

              {selectedEmpTasks.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                  No active tasks assigned to this employee.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedEmpTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (onEditTask) {
                          setSelectedEmployee(null);
                          onEditTask(t);
                        }
                      }}
                      className="glass-card rounded-xl p-4 border border-slate-800 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white">{t.title}</span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-900 text-slate-400">
                            {t.project_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{t.description}</p>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                          <span>Remaining: <strong className="text-indigo-300">{t.remaining_hours} hrs</strong></span>
                          <span>Deadline: <strong>{t.deadline}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {t.status}
                        </span>
                        <button
                          title="Edit or Reassign"
                          className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-800"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
