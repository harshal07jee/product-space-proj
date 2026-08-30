"use client";

import React, { useState, useEffect } from "react";
import { Project, Task, TaskDependency } from "@/lib/types";
import { fetchProjectDependencies, createDependency, deleteDependency } from "@/lib/api";
import {
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Link as LinkIcon,
  Unlink,
  Check
} from "lucide-react";

interface ProjectGanttViewProps {
  project: Project;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onRefreshProject: () => void;
}

export const ProjectGanttView: React.FC<ProjectGanttViewProps> = ({
  project,
  tasks,
  onEditTask,
  onRefreshProject,
}) => {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [sourceTaskId, setSourceTaskId] = useState<number>(tasks[0]?.id || 1);
  const [dependsOnTaskId, setDependsOnTaskId] = useState<number>(tasks[1]?.id || 1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDeps = async () => {
    setLoadingDeps(true);
    try {
      const data = await fetchProjectDependencies(project.id);
      setDependencies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDeps(false);
    }
  };

  useEffect(() => {
    loadDeps();
  }, [project.id]);

  const handleCreateDependency = async () => {
    if (sourceTaskId === dependsOnTaskId) {
      setErrorMsg("A task cannot depend on itself");
      return;
    }
    setErrorMsg(null);
    try {
      await createDependency(sourceTaskId, dependsOnTaskId);
      await loadDeps();
      setIsLinking(false);
      onRefreshProject();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to create dependency link");
    }
  };

  const handleDeleteDependency = async (id: number) => {
    try {
      await deleteDependency(id);
      await loadDeps();
      onRefreshProject();
    } catch (e: any) {
      console.error(e);
    }
  };

  // Determine if a task is blocked by incomplete dependencies
  const isTaskBlocked = (task: Task) => {
    if (task.status === "DONE") return false;
    const prereqs = dependencies.filter((d) => d.task_id === task.id);
    for (const p of prereqs) {
      const prereqTask = tasks.find((t) => t.id === p.depends_on_task_id);
      if (prereqTask && prereqTask.status !== "DONE") {
        return true;
      }
    }
    return false;
  };

  const getTaskPrerequisites = (task: Task) => {
    const prereqIds = dependencies
      .filter((d) => d.task_id === task.id)
      .map((d) => d.depends_on_task_id);
    return tasks.filter((t) => prereqIds.includes(t.id));
  };

  return (
    <div className="space-y-5">
      {/* Controls & Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <span>Dependency Chain & Critical Path Timeline</span>
          </h4>
          <p className="text-xs text-slate-400">
            Tasks blocked by incomplete upstream dependencies will trigger risk warnings
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Status Legend */}
          <div className="hidden sm:flex items-center space-x-3 text-[11px] font-medium">
            <span className="flex items-center space-x-1 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>Blocked</span>
            </span>
            <span className="flex items-center space-x-1 text-indigo-400">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <span>Ready / Active</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Completed</span>
            </span>
          </div>

          <button
            onClick={() => setIsLinking(!isLinking)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center space-x-1.5"
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>{isLinking ? "Cancel Link" : "+ Link Dependency"}</span>
          </button>
        </div>
      </div>

      {/* Link Dependency Form */}
      {isLinking && (
        <div className="glass-card rounded-2xl p-4 border border-indigo-500/30 bg-indigo-500/5 space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Define Upstream Task Dependency
          </h5>

          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-300 text-xs flex items-center space-x-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">Target Task (Dependent)</label>
              <select
                value={sourceTaskId}
                onChange={(e) => setSourceTaskId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-semibold">Depends On (Prerequisite)</label>
              <select
                value={dependsOnTaskId}
                onChange={(e) => setDependsOnTaskId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreateDependency}
              className="py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center space-x-1"
            >
              <Check className="h-4 w-4" />
              <span>Save Dependency Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Task Gantt Timeline Grid */}
      <div className="space-y-3">
        {tasks.map((t, idx) => {
          const blocked = isTaskBlocked(t);
          const prereqs = getTaskPrerequisites(t);
          const isDone = t.status === "DONE";

          return (
            <div
              key={t.id}
              onClick={() => onEditTask(t)}
              className={`glass-card rounded-2xl p-4 border transition-all cursor-pointer space-y-3 ${
                blocked
                  ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500"
                  : isDone
                  ? "border-emerald-500/30 bg-emerald-500/5 opacity-80"
                  : "border-slate-800 hover:border-indigo-500/40"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="h-6 w-6 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-white">{t.title}</h4>
                      {blocked && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>BLOCKED</span>
                        </span>
                      )}
                      {isDone && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          DONE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{t.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <div className="text-right">
                    <span className="text-indigo-300 font-semibold block">{t.assigned_employee_name || "Unassigned"}</span>
                    <span className="text-[11px] text-slate-500">Deadline: {t.deadline}</span>
                  </div>
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                    {t.remaining_hours}h rem
                  </span>
                </div>
              </div>

              {/* Dependency Connection Details */}
              {prereqs.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-semibold flex items-center space-x-1">
                    <LinkIcon className="h-3 w-3" />
                    <span>Requires:</span>
                  </span>
                  {prereqs.map((pr) => {
                    const depObj = dependencies.find(
                      (d) => d.task_id === t.id && d.depends_on_task_id === pr.id
                    );
                    return (
                      <span
                        key={pr.id}
                        className={`px-2 py-0.5 rounded-md flex items-center space-x-1 border ${
                          pr.status === "DONE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                        }`}
                      >
                        <span>{pr.title} ({pr.status})</span>
                        {depObj && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDependency(depObj.id);
                            }}
                            title="Remove dependency link"
                            className="text-slate-500 hover:text-rose-400 ml-1"
                          >
                            <Unlink className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
