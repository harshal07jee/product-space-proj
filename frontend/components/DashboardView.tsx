"use client";

import React, { useState } from "react";
import { DashboardData, Recommendation } from "@/lib/types";
import { Users, AlertTriangle, ShieldCheck, Clock, ArrowRight, Sparkles, CheckCircle2, TrendingUp, Upload, FileSpreadsheet, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { uploadCSV } from "@/lib/api";

interface DashboardViewProps {
  data: DashboardData;
  onApproveRecommendation: (id: number) => void;
  onSelectTab: (tab: "team" | "projects" | "recommendations") => void;
  isApproving: number | null;
  onOpenCSVModal?: () => void;
  onRefreshData?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onApproveRecommendation,
  onSelectTab,
  isApproving,
  onOpenCSVModal,
  onRefreshData,
}) => {
  const [quickUploadType, setQuickUploadType] = useState<"employees" | "tasks">("tasks");
  const [isQuickUploading, setIsQuickUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleQuickFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsQuickUploading(true);
    setUploadStatus(null);
    try {
      // Auto-detect type based on filename if possible
      const fname = file.name.toLowerCase();
      const targetType = fname.includes("employee") ? "employees" : fname.includes("task") ? "tasks" : quickUploadType;

      const res = await uploadCSV(targetType, file);
      if (res.success) {
        setUploadStatus(`Uploaded! ${res.created_count || 0} created, ${res.updated_count || 0} updated.`);
        if (onRefreshData) onRefreshData();
      } else {
        setUploadStatus(`Warning: ${res.errors.join("; ")}`);
      }
    } catch (err: any) {
      setUploadStatus(`Failed: ${err.message}`);
    } finally {
      setIsQuickUploading(false);
    }
  };
  const getBarColor = (status: string) => {
    switch (status) {
      case "OVERLOADED":
        return "#f43f5e"; // Rose-500
      case "HIGH":
        return "#f59e0b"; // Amber-500
      case "HEALTHY":
        return "#6366f1"; // Indigo-500
      case "AVAILABLE":
        return "#10b981"; // Emerald-500
      default:
        return "#64748b";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OVERLOADED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "HIGH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "HEALTHY":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "AVAILABLE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "HIGH":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "MEDIUM":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "LOW":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Direct CSV Upload Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-indigo-500/20 bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center space-x-2">
              <span>Direct Dashboard CSV Import</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LIVE UPDATE
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Upload custom <code className="text-indigo-300">employees.csv</code> or <code className="text-indigo-300">tasks.csv</code> to automatically refresh workload, project risks, and AI recommendations.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto shrink-0">
          {uploadStatus && (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              {uploadStatus}
            </span>
          )}

          <label className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all flex items-center space-x-2 shrink-0">
            {isQuickUploading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>Upload CSV File</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleQuickFileUpload}
            />
          </label>

          {onOpenCSVModal && (
            <button
              onClick={onOpenCSVModal}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shrink-0"
            >
              Templates & Details
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Team Utilization */}
        <div
          onClick={() => onSelectTab("team")}
          className="glass-card rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Team Utilization
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {data.team_utilization}%
            </span>
            <span className="text-xs font-medium text-slate-400">
              Target: 75–85%
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                data.team_utilization > 100
                  ? "bg-rose-500"
                  : data.team_utilization > 90
                  ? "bg-amber-500"
                  : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min(100, data.team_utilization)}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Overloaded Employees */}
        <div
          onClick={() => onSelectTab("team")}
          className="glass-card rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all border-rose-500/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Overloaded
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-rose-400 tracking-tight">
              {data.overloaded_count}
            </span>
            <span className="text-xs font-medium text-rose-400/80">
              {data.overloaded_count > 0 ? "Requires Redistribution" : "Optimal Workload"}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Employees exceeding 100% capacity limit.
          </p>
        </div>

        {/* KPI 3: At-Risk Projects */}
        <div
          onClick={() => onSelectTab("projects")}
          className="glass-card rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              At-Risk Projects
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {data.at_risk_projects_count}
            </span>
            <span className="text-xs font-medium text-slate-400">
              Out of {data.project_risks.length} total
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Projects with HIGH or MEDIUM delivery risk.
          </p>
        </div>

        {/* KPI 4: Available Capacity */}
        <div
          onClick={() => onSelectTab("team")}
          className="glass-card rounded-2xl p-5 cursor-pointer hover:scale-[1.02] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Available Capacity
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {data.available_capacity_hours} hrs
            </span>
            <span className="text-xs font-medium text-emerald-400/80">
              {data.available_count} members free
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Unassigned hours across active team members.
          </p>
        </div>
      </div>

      {/* Main Grid: Workload Chart + AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workload Horizontal Bar Chart */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-white">Workload Distribution</h3>
              <p className="text-xs text-slate-400">
                Individual team member utilization percentages vs 100% capacity threshold
              </p>
            </div>

            {/* Status Legend */}
            <div className="flex items-center space-x-3 text-xs font-medium">
              <span className="flex items-center space-x-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>Available</span>
              </span>
              <span className="flex items-center space-x-1 text-indigo-400">
                <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                <span>Healthy</span>
              </span>
              <span className="flex items-center space-x-1 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span>High</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span>Overloaded</span>
              </span>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.workload_chart}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 140]} stroke="#64748b" fontSize={11} unit="%" />
                <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={12} width={75} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white">{d.name}</p>
                          <p className="text-slate-300">
                            Utilization: <span className="font-semibold text-indigo-400">{d.utilization}%</span>
                          </p>
                          <p className="text-slate-400">
                            Workload: {d.assigned_hours}h assigned / {d.capacity}h capacity
                          </p>
                          <p className="text-slate-400">
                            Status: <span className="font-semibold">{d.status}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="utilization" radius={[0, 6, 6, 0]} barSize={18}>
                  {data.workload_chart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations Quick Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
                <h3 className="font-bold text-lg text-white">AI Recommendations</h3>
              </div>
              <button
                onClick={() => onSelectTab("recommendations")}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {data.top_recommendations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                No active workload recommendations needed! Team capacity is balanced.
              </div>
            ) : (
              <div className="space-y-3.5">
                {data.top_recommendations.slice(0, 2).map((rec) => (
                  <div key={rec.id} className="glass-card rounded-xl p-4 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {rec.project_name}
                      </span>
                      <span className="text-[10px] font-semibold text-rose-400">
                        {rec.risk_before} → {rec.risk_after} RISK
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-white">
                      Move <span className="text-indigo-300">'{rec.task_title}'</span> from{" "}
                      <span className="text-rose-400">{rec.from_employee_name}</span> to{" "}
                      <span className="text-emerald-400">{rec.to_employee_name}</span>
                    </p>

                    {/* Impact Metric Bar */}
                    <div className="bg-slate-900/80 rounded-lg p-2.5 text-[11px] grid grid-cols-2 gap-2 text-center border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">From ({rec.from_employee_name})</span>
                        <span className="font-bold text-rose-400">{rec.from_employee_util_before}%</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="font-bold text-emerald-400">{rec.from_employee_util_after}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">To ({rec.to_employee_name})</span>
                        <span className="font-bold text-indigo-400">{rec.to_employee_util_before}%</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="font-bold text-emerald-400">{rec.to_employee_util_after}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onApproveRecommendation(rec.id)}
                      disabled={isApproving === rec.id}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isApproving === rec.id ? (
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve Redistribution</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Risk Section */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-white">Project Risk Assessment</h3>
            <p className="text-xs text-slate-400">
              Live delivery risk score calculated based on capacity, deadline pressure, and dependencies
            </p>
          </div>
          <button
            onClick={() => onSelectTab("projects")}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>View All Projects</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Project Name</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Remaining Effort</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-200 font-medium">
              {data.project_risks.map((p) => (
                <tr
                  key={p.project_id}
                  onClick={() => onSelectTab("projects")}
                  className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                    <span>{p.project_name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{p.deadline}</td>
                  <td className="py-3.5 px-4 w-48">
                    <div className="flex items-center space-x-2">
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${p.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-300">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{p.remaining_effort} hrs</td>
                  <td className="py-3.5 px-4 font-bold text-slate-300">{p.risk_score} / 100</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${getRiskBadge(
                        p.risk_level
                      )}`}
                    >
                      {p.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
