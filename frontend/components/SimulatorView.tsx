"use client";

import React, { useState, useEffect } from "react";
import { Employee, Project, Task, WhatIfChange, WhatIfSimulationResponse } from "@/lib/types";
import { simulateWhatIf, commitWhatIf } from "@/lib/api";
import {
  Cpu,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Sliders,
  Check
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from "recharts";

interface SimulatorViewProps {
  tasks: Task[];
  employees: Employee[];
  projects: Project[];
  onCommitSuccess: () => void;
  onToast: (msg: string) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  tasks,
  employees,
  projects,
  onCommitSuccess,
  onToast,
}) => {
  const [stagedChanges, setStagedChanges] = useState<WhatIfChange[]>([]);
  const [simulationResult, setSimulationResult] = useState<WhatIfSimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Staging form inputs
  const [selectedTaskId, setSelectedTaskId] = useState<number>(tasks[0]?.id || 1);
  const [targetEmployeeId, setTargetEmployeeId] = useState<number>(employees[0]?.id || 1);
  const [overrideHours, setOverrideHours] = useState<string>("");

  useEffect(() => {
    if (tasks.length > 0 && !selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [tasks, selectedTaskId]);

  const runSimulation = async (changesToSimulate: WhatIfChange[]) => {
    if (changesToSimulate.length === 0) {
      setSimulationResult(null);
      return;
    }
    setLoading(true);
    try {
      const res = await simulateWhatIf(changesToSimulate);
      setSimulationResult(res);
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChange = () => {
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;

    const newChange: WhatIfChange = {
      task_id: selectedTaskId,
      new_assigned_employee_id: targetEmployeeId,
      new_remaining_hours: overrideHours ? Number(overrideHours) : task.remaining_hours,
    };

    // Replace if task already in staged changes, else append
    const updated = [
      ...stagedChanges.filter((c) => c.task_id !== selectedTaskId),
      newChange,
    ];
    setStagedChanges(updated);
    setOverrideHours("");
    runSimulation(updated);
  };

  const handleRemoveChange = (taskId: number) => {
    const updated = stagedChanges.filter((c) => c.task_id !== taskId);
    setStagedChanges(updated);
    runSimulation(updated);
  };

  const handleClearAll = () => {
    setStagedChanges([]);
    setSimulationResult(null);
  };

  const handleCommit = async () => {
    if (stagedChanges.length === 0) return;
    setCommitting(true);
    try {
      const res = await commitWhatIf(stagedChanges);
      onToast(res.message || "Scenario committed successfully! Metrics recalculated.");
      setStagedChanges([]);
      setSimulationResult(null);
      onCommitSuccess();
    } catch (err: any) {
      onToast(`Commit failed: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  };

  // Quick preset hypothesis helper
  const handleLoadDemoHypothesis = () => {
    const paymentTask = tasks.find((t) => t.title.toLowerCase().includes("payment") || t.assigned_employee_name === "Rahul");
    const neha = employees.find((e) => e.name === "Neha");

    if (paymentTask && neha) {
      const preset: WhatIfChange[] = [
        {
          task_id: paymentTask.id,
          new_assigned_employee_id: neha.id,
          new_remaining_hours: paymentTask.remaining_hours,
        },
      ];
      setStagedChanges(preset);
      runSimulation(preset);
    }
  };

  const selectedTaskObj = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-pink-400" />
            <span>"What-If" Workload Scenario Simulator</span>
          </h2>
          <p className="text-xs text-slate-400">
            Stage hypothetical reassignments and preview live utilization and delivery risk impacts before committing
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleLoadDemoHypothesis}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all flex items-center space-x-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Load Quick Hypothesis</span>
          </button>
          {stagedChanges.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all flex items-center space-x-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Sandbox</span>
            </button>
          )}
        </div>
      </div>

      {/* Simulator Staging Sandbox Controls */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
          <Sliders className="h-4 w-4 text-pink-400" />
          <span>Stage Hypothetical Task Reassignment</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-300">Select Task to Move</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.remaining_hours}h) — Currently: {t.assigned_employee_name || "Unassigned"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300">Simulate New Assignee</label>
            <select
              value={targetEmployeeId}
              onChange={(e) => setTargetEmployeeId(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.utilization}% - {emp.risk_status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddChange}
            className="w-full py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-500 text-white shadow-md transition-all flex items-center justify-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add to Hypothesis</span>
          </button>
        </div>

        {/* Staged Changes Chips/List */}
        {stagedChanges.length > 0 && (
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              Currently Staged Changes ({stagedChanges.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {stagedChanges.map((c) => {
                const t = tasks.find((item) => item.id === c.task_id);
                const target = employees.find((item) => item.id === c.new_assigned_employee_id);
                return (
                  <div
                    key={c.task_id}
                    className="glass-card rounded-xl px-3 py-1.5 border border-pink-500/30 bg-pink-500/5 flex items-center space-x-2 text-xs"
                  >
                    <span className="text-white font-semibold">{t?.title}</span>
                    <span className="text-slate-400">({t?.assigned_employee_name} → <strong className="text-pink-300">{target?.name}</strong>)</span>
                    <button
                      onClick={() => handleRemoveChange(c.task_id)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Simulation Results Workspace */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center space-y-2">
          <div className="h-6 w-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Simulating multi-factor workload and project risks...</span>
        </div>
      ) : simulationResult ? (
        <div className="space-y-6">
          {/* Projected KPI Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* KPI 1: Team Utilization */}
            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Team Utilization
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-white">
                  {simulationResult.projected_team_utilization}%
                </span>
                <span className="text-xs text-slate-400 line-through">
                  {simulationResult.current_team_utilization}%
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold block">
                Target healthy team envelope
              </span>
            </div>

            {/* KPI 2: Overloaded Employees */}
            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Overloaded Employees
              </span>
              <div className="flex items-baseline space-x-2">
                <span className={`text-2xl font-extrabold ${simulationResult.projected_overloaded_count < simulationResult.current_overloaded_count ? "text-emerald-400" : "text-rose-400"}`}>
                  {simulationResult.projected_overloaded_count}
                </span>
                <span className="text-xs text-slate-400 line-through">
                  {simulationResult.current_overloaded_count}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                {simulationResult.projected_overloaded_count < simulationResult.current_overloaded_count
                  ? `Reduces overloaded members by ${simulationResult.current_overloaded_count - simulationResult.projected_overloaded_count}!`
                  : "No change in overloaded headcount"}
              </span>
            </div>

            {/* KPI 3: Available Capacity */}
            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Available Capacity
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-emerald-400">
                  {simulationResult.projected_available_capacity_hours}h
                </span>
                <span className="text-xs text-slate-400 line-through">
                  {simulationResult.current_available_capacity_hours}h
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">
                Unassigned hours available
              </span>
            </div>
          </div>

          {/* Workload Comparison Bar Chart */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Projected Workload Distribution vs Baseline</h3>
                <p className="text-xs text-slate-400">Comparing current workload % vs projected scenario % per employee</p>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={simulationResult.workload_comparison}
                  margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
                >
                  <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} />
                  <YAxis domain={[0, 140]} stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <p className="font-bold text-white">{d.name} ({d.role})</p>
                            <p className="text-slate-300">
                              Current: <span className="font-semibold text-indigo-400">{d.current_utilization}% ({d.current_status})</span>
                            </p>
                            <p className="text-pink-300">
                              Projected: <span className="font-semibold">{d.projected_utilization}% ({d.projected_status})</span>
                            </p>
                            <p className="text-slate-400">
                              Delta: <strong className={d.delta_utilization < 0 ? "text-emerald-400" : "text-amber-400"}>{d.delta_utilization > 0 ? `+${d.delta_utilization}` : d.delta_utilization}%</strong>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="current_utilization" name="Current Workload %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="projected_utilization" name="Projected Workload %" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Risks Delta Comparison */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-white">Projected Delivery Risk Impacts</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {simulationResult.project_risks_comparison.map((p) => (
                <div key={p.project_id} className="glass-card rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{p.project_name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                      {p.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Current Risk</span>
                      <span className="font-bold text-rose-400">{p.current_risk_level} ({p.current_risk_score}/100)</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Projected Risk</span>
                      <span className="font-bold text-emerald-400">{p.projected_risk_level} ({p.projected_risk_score}/100)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commit Actions Bar */}
          <div className="bg-slate-900 border border-pink-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-0.5 text-center sm:text-left">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2 justify-center sm:justify-start">
                <Sparkles className="h-4 w-4 text-pink-400" />
                <span>Ready to Apply Scenario to Production?</span>
              </h4>
              <p className="text-xs text-slate-400">
                Commits {stagedChanges.length} task updates to database and recalculates all dashboards.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-950 text-slate-400 hover:text-white"
              >
                Discard
              </button>
              <button
                onClick={handleCommit}
                disabled={committing}
                className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-lg shadow-pink-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {committing ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Apply Changes to Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <Cpu className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Sandbox is Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Select a task and new candidate above or click <strong>"Load Quick Hypothesis"</strong> to simulate moving the Payment API task from Rahul to Neha.
          </p>
        </div>
      )}
    </div>
  );
};
