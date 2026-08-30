"use client";

import React from "react";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Sparkles,
  Cpu,
  History
} from "lucide-react";

export type NavTab = "dashboard" | "team" | "projects" | "recommendations" | "simulator" | "activity-log";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  pendingRecsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingRecsCount,
}) => {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "team", label: "Team Workload", icon: Users },
    { id: "projects", label: "Projects & Risk", icon: FolderKanban },
    {
      id: "recommendations",
      label: "AI Recommendations",
      icon: Sparkles,
      badge: pendingRecsCount > 0 ? pendingRecsCount : null,
    },
    { id: "simulator", label: "What-If Simulator", icon: Cpu },
    { id: "activity-log", label: "Activity & Audit", icon: History },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Orchestration Hub
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-indigo-400" : "text-slate-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-500 text-white shadow-sm shadow-indigo-500/50 animate-pulse">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Live System Status Widget */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Risk Engine</span>
          <span className="flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Active</span>
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Continuous workload analysis & redistribution recommendation engine running.
        </p>
      </div>
    </aside>
  );
};
