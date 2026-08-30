"use client";

import React, { useState } from "react";
import { Project, Task } from "@/lib/types";
import { fetchProjectDetails } from "@/lib/api";
import { ProjectGanttView } from "./ProjectGanttView";
import {
  FolderKanban,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Layers,
  List
} from "lucide-react";

interface ProjectsViewProps {
  projects: Project[];
  onEditTask?: (task: Task) => void;
  onCreateTask?: (projectId?: number) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onEditTask,
  onCreateTask,
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState<"tasks" | "gantt">("tasks");

  const handleOpenProject = async (proj: Project) => {
    setSelectedProject(proj);
    setLoadingDetails(true);
    try {
      const data = await fetchProjectDetails(proj.id);
      setProjectTasks(data.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const reloadProjectDetails = async () => {
    if (!selectedProject) return;
    try {
      const data = await fetchProjectDetails(selectedProject.id);
      setProjectTasks(data.tasks);
    } catch (e) {
      console.error(e);
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

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case "CRITICAL":
      case "HIGH":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "MEDIUM":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <FolderKanban className="h-5 w-5 text-indigo-400" />
            <span>Projects & Delivery Risk Workspace</span>
          </h2>
          <p className="text-xs text-slate-400">
            Monitor multi-project completion status, critical path bottlenecks, and interactive task dependency trees
          </p>
        </div>

        {onCreateTask && (
          <button
            onClick={() => onCreateTask()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center space-x-1.5 shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Project Task</span>
          </button>
        )}
      </div>

      {/* Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => handleOpenProject(p)}
            className="glass-card rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/40 cursor-pointer space-y-4 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-white text-lg">{p.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getPriorityBadge(
                      p.priority
                    )}`}
                  >
                    {p.priority} PRIORITY
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{p.description}</p>
              </div>

              <span
                className={`px-3 py-1 text-xs font-extrabold rounded-full border ${getRiskBadge(
                  p.risk_level
                )}`}
              >
                {p.risk_level} RISK
              </span>
            </div>

            {/* Progress & Metrics */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Project Progress</span>
                <span className="text-white font-extrabold">{p.progress}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${p.progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Remaining Effort: <strong className="text-slate-200">{p.remaining_effort} hrs</strong></span>
                <span>Deadline: <strong className="text-slate-200">{p.deadline}</strong></span>
              </div>
            </div>

            {/* AI Risk Explanation Snippet */}
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>Risk Diagnostics</span>
              </span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {p.risk_explanation}
              </p>
            </div>

            {/* Team Members List */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs text-slate-400 font-medium">
                  {p.team_members.join(", ") || "Assigned Team"}
                </span>
              </div>
              <span className="text-xs font-semibold text-indigo-400 flex items-center space-x-1">
                <span>Inspect Tasks & Timeline</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Project Details & Gantt Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl rounded-2xl border border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-white">{selectedProject.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${getRiskBadge(
                      selectedProject.risk_level
                    )}`}
                  >
                    {selectedProject.risk_level} RISK ({selectedProject.risk_score}/100)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedProject.description}</p>
              </div>

              <div className="flex items-center space-x-3">
                {onCreateTask && (
                  <button
                    onClick={() => onCreateTask(selectedProject.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Task</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedProject(null)}
                  className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* AI Risk Bottleneck Analysis Box */}
            <div className="glass-card rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 space-y-1.5">
              <h4 className="text-xs font-bold uppercase text-amber-400 flex items-center space-x-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>AI Bottleneck & Delivery Risk Analysis</span>
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedProject.risk_explanation}
              </p>
            </div>

            {/* View Switcher Tabs: Task List vs Timeline Gantt */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
              <button
                onClick={() => setModalTab("tasks")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  modalTab === "tasks" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Task List ({projectTasks.length})</span>
              </button>
              <button
                onClick={() => setModalTab("gantt")}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                  modalTab === "gantt" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Dependency Tree & Gantt</span>
              </button>
            </div>

            {/* View Tab Contents */}
            {loadingDetails ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center space-y-2">
                <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading project task hierarchy...</span>
              </div>
            ) : modalTab === "gantt" ? (
              <ProjectGanttView
                project={selectedProject}
                tasks={projectTasks}
                onEditTask={(t) => {
                  if (onEditTask) onEditTask(t);
                }}
                onRefreshProject={reloadProjectDetails}
              />
            ) : (
              <div className="space-y-2.5">
                {projectTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (onEditTask) onEditTask(t);
                    }}
                    className="glass-card rounded-xl p-4 border border-slate-800 hover:border-indigo-500/40 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{t.title}</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            t.priority === "HIGH" || t.priority === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{t.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span>Assignee: <strong className="text-indigo-300">{t.assigned_employee_name || "Unassigned"}</strong></span>
                        <span>Remaining: <strong className="text-slate-200">{t.remaining_hours} hrs</strong></span>
                        <span>Skills: <strong>{t.required_skills}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-3 py-1 text-xs font-semibold rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-center">
                        {t.status}
                      </span>
                      <button
                        title="Edit task"
                        className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-800 hover:border-indigo-500/40"
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
      )}
    </div>
  );
};
