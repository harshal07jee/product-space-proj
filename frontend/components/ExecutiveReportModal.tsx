"use client";

import React from "react";
import { DashboardData, Employee, Project, Task } from "@/lib/types";
import {
  FileDown,
  Printer,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Brain,
  Building
} from "lucide-react";

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: DashboardData | null;
  employees: Employee[];
  projects: Project[];
  tasks: Task[];
  tenantId?: string;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  dashboardData,
  employees,
  projects,
  tasks,
  tenantId = "default_tenant",
}) => {
  if (!isOpen || !dashboardData) return null;

  const handleDownloadEmployeesCSV = () => {
    const headers = ["Employee Name", "Role", "Skills", "Weekly Capacity (hrs)", "Assigned Hours", "Utilization %", "Workload Status", "Active Tasks"];
    const rows = employees.map((emp) => [
      `"${emp.name}"`,
      `"${emp.role}"`,
      `"${emp.skills}"`,
      emp.weekly_capacity,
      emp.assigned_hours,
      `${emp.utilization}%`,
      emp.risk_status,
      emp.active_tasks_count,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `worklens_team_capacity_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadProjectsCSV = () => {
    const headers = ["Project Name", "Priority", "Deadline", "Progress %", "Remaining Effort (hrs)", "Risk Score", "Risk Level", "Risk Explanation", "Team Members"];
    const rows = projects.map((p) => [
      `"${p.name}"`,
      p.priority,
      p.deadline,
      `${p.progress}%`,
      p.remaining_effort,
      `${p.risk_score}/100`,
      p.risk_level,
      `"${p.risk_explanation.replace(/"/g, '""')}"`,
      `"${p.team_members.join(", ")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `worklens_project_risks_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const overloadedEmployees = employees.filter((e) => e.risk_status === "OVERLOADED");
  const highRiskProjects = projects.filter((p) => p.risk_level === "HIGH");

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-4xl rounded-2xl border border-slate-800 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Executive Workload & Risk Report</h3>
              <p className="text-xs text-slate-400">Download formatted CSV audits or print an executive briefing</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all flex items-center space-x-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick CSV Export Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleDownloadEmployeesCSV}
            className="glass-card rounded-xl p-4 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all text-left flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <span>Export Team Capacity CSV</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Detailed spreadsheet of all {employees.length} employees, utilization %, and active task loads.
              </p>
            </div>
            <FileDown className="h-5 w-5 text-indigo-400 shrink-0 ml-3" />
          </button>

          <button
            onClick={handleDownloadProjectsCSV}
            className="glass-card rounded-xl p-4 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all text-left flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                <span>Export Project Risk Audit CSV</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Full delivery risk score breakdowns, remaining hours, and AI bottleneck diagnostics.
              </p>
            </div>
            <FileDown className="h-5 w-5 text-amber-400 shrink-0 ml-3" />
          </button>
        </div>

        {/* Printable Executive Report Preview Paper */}
        <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 space-y-6 text-slate-200">
          <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-lg font-bold text-white flex items-center space-x-2">
                <Brain className="h-5 w-5 text-indigo-400" />
                <span>WorkLens AI — Workforce Intelligence Briefing</span>
              </h4>
              <p className="text-xs text-slate-400">
                Generated for tenant: <strong className="text-indigo-300 font-mono">{tenantId}</strong> on {new Date().toLocaleDateString(undefined, { dateStyle: "full" })}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-fit">
              CONFIDENTIAL
            </span>
          </div>

          {/* KPI Summary Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Team Workload</span>
              <p className="text-xl font-extrabold text-white mt-0.5">{dashboardData.team_utilization}%</p>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Overloaded</span>
              <p className="text-xl font-extrabold text-rose-400 mt-0.5">{dashboardData.overloaded_count}</p>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">At-Risk Projects</span>
              <p className="text-xl font-extrabold text-amber-400 mt-0.5">{dashboardData.at_risk_projects_count}</p>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Available Capacity</span>
              <p className="text-xl font-extrabold text-emerald-400 mt-0.5">{dashboardData.available_capacity_hours}h</p>
            </div>
          </div>

          {/* High Priority Alerts */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              High Priority Delivery Risks
            </h5>

            {highRiskProjects.length === 0 ? (
              <p className="text-xs text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>All project delivery risks are currently within acceptable limits.</span>
              </p>
            ) : (
              <div className="space-y-2">
                {highRiskProjects.map((p) => (
                  <div key={p.id} className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300">{p.name} ({p.priority} Priority)</span>
                      <span className="font-mono text-rose-400 font-bold">Score: {p.risk_score}/100</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{p.risk_explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overloaded Team Members */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Overloaded Staffing Requiring Task Redistribution
            </h5>

            {overloadedEmployees.length === 0 ? (
              <p className="text-xs text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>No team members exceed the 100% capacity limit.</span>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {overloadedEmployees.map((emp) => (
                  <div key={emp.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{emp.name} ({emp.role})</span>
                      <span className="text-[11px] text-slate-400">{emp.assigned_hours}h assigned / {emp.weekly_capacity}h capacity</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-extrabold text-rose-400 bg-rose-500/10 rounded-md border border-rose-500/20">
                      {emp.utilization}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
