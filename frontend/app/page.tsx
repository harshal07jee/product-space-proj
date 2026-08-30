"use client";

import React, { useEffect, useState } from "react";
import { AuthUser, DashboardData, Employee, Project, Recommendation, Task } from "@/lib/types";
import {
  fetchDashboard,
  fetchEmployees,
  fetchProjects,
  fetchTasks,
  fetchRecommendations,
  approveRecommendation,
  rejectRecommendation,
  resetDemoData,
  getStoredUser,
} from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { Sidebar, NavTab } from "@/components/Sidebar";
import { DashboardView } from "@/components/DashboardView";
import { TeamView } from "@/components/TeamView";
import { ProjectsView } from "@/components/ProjectsView";
import { RecommendationsView } from "@/components/RecommendationsView";
import { SimulatorView } from "@/components/SimulatorView";
import { ActivityLogView } from "@/components/ActivityLogView";
import { AIChatDrawer } from "@/components/AIChatDrawer";
import { CSVImportModal } from "@/components/CSVImportModal";
import { TaskModal } from "@/components/TaskModal";
import { AuthModal } from "@/components/AuthModal";
import { ExecutiveReportModal } from "@/components/ExecutiveReportModal";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Modals & Drawers state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState(false);

  const [isResetting, setIsResetting] = useState(false);
  const [isApproving, setIsApproving] = useState<number | null>(null);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = getStoredUser();
    if (savedUser) {
      setCurrentUser(savedUser);
    }
  }, []);

  const loadAllData = async () => {
    try {
      const [dash, empList, projList, taskList, recList] = await Promise.all([
        fetchDashboard(),
        fetchEmployees(),
        fetchProjects(),
        fetchTasks(),
        fetchRecommendations("PENDING"),
      ]);

      setDashboardData(dash);
      setEmployees(empList);
      setProjects(projList);
      setTasks(taskList);
      setRecommendations(recList);
    } catch (err) {
      console.error("Failed to load backend data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleApproveRecommendation = async (id: number) => {
    setIsApproving(id);
    try {
      const res = await approveRecommendation(id);
      triggerToast(res.message || "Recommendation approved! Workload & risks updated.");
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      triggerToast(`Approval Error: ${err.message}`);
    } finally {
      setIsApproving(null);
    }
  };

  const handleRejectRecommendation = async (id: number) => {
    try {
      await rejectRecommendation(id);
      triggerToast("Recommendation rejected.");
      await loadAllData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await resetDemoData();
      triggerToast("Demo data successfully reset to baseline scenario.");
      await loadAllData();
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to reset demo data.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenCreateTask = (projectId?: number) => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navbar */}
      <Navbar
        onOpenChat={() => setIsChatOpen(true)}
        onOpenCSVModal={() => setIsCSVModalOpen(true)}
        onOpenCreateTask={() => handleOpenCreateTask()}
        onOpenExecutiveReport={() => setIsExecutiveReportOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
        currentUser={currentUser}
      />

      {/* Success / Alert Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 animate-bounce bg-slate-900 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Body Layout */}
      <div className="flex-1 flex">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingRecsCount={recommendations.length}
        />

        {/* Content Workspace Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">Loading WorkLens AI Intelligence Engine...</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && dashboardData && (
                <DashboardView
                  data={dashboardData}
                  onApproveRecommendation={handleApproveRecommendation}
                  onSelectTab={(tab) => setActiveTab(tab)}
                  isApproving={isApproving}
                />
              )}

              {activeTab === "team" && (
                <TeamView
                  employees={employees}
                  tasks={tasks}
                  onEditTask={handleOpenEditTask}
                  onCreateTask={() => handleOpenCreateTask()}
                />
              )}

              {activeTab === "projects" && (
                <ProjectsView
                  projects={projects}
                  onEditTask={handleOpenEditTask}
                  onCreateTask={handleOpenCreateTask}
                />
              )}

              {activeTab === "recommendations" && (
                <RecommendationsView
                  recommendations={recommendations}
                  onApprove={handleApproveRecommendation}
                  onReject={handleRejectRecommendation}
                  isApproving={isApproving}
                />
              )}

              {activeTab === "simulator" && (
                <SimulatorView
                  tasks={tasks}
                  employees={employees}
                  projects={projects}
                  onCommitSuccess={loadAllData}
                  onToast={triggerToast}
                />
              )}

              {activeTab === "activity-log" && (
                <ActivityLogView onRefresh={loadAllData} />
              )}
            </>
          )}
        </main>
      </div>

      {/* AI Assistant Chat Drawer */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onRefreshDashboard={loadAllData}
      />

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onSuccess={loadAllData}
      />

      {/* Task Create & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        onSuccess={(msg) => {
          triggerToast(msg);
          loadAllData();
        }}
        taskToEdit={taskToEdit}
        projects={projects}
        employees={employees}
      />

      {/* Auth & Persona Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthChange={(user) => {
          setCurrentUser(user);
          loadAllData();
        }}
        onSuccessToast={triggerToast}
      />

      {/* Executive Report & CSV Export Modal */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
        dashboardData={dashboardData}
        employees={employees}
        projects={projects}
        tasks={tasks}
        tenantId={currentUser?.tenant_id || "default_tenant"}
      />
    </div>
  );
}
