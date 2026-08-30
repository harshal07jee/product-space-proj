import React, { useState } from "react";
import { AuthUser } from "@/lib/types";
import {
  Brain,
  Sparkles,
  RefreshCw,
  Upload,
  Plus,
  FileDown,
  User,
  ShieldCheck,
  Building,
  Layers
} from "lucide-react";

interface NavbarProps {
  onOpenChat: () => void;
  onOpenCSVModal: () => void;
  onOpenCreateTask: () => void;
  onOpenExecutiveReport: () => void;
  onOpenAuthModal: () => void;
  onResetDemo: () => void;
  onSelectScenario?: (scenarioId: string) => void;
  isResetting: boolean;
  currentUser: AuthUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenChat,
  onOpenCSVModal,
  onOpenCreateTask,
  onOpenExecutiveReport,
  onOpenAuthModal,
  onResetDemo,
  onSelectScenario,
  isResetting,
  currentUser,
}) => {
  const [selectedScenario, setSelectedScenario] = useState("baseline");

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scenarioId = e.target.value;
    setSelectedScenario(scenarioId);
    if (onSelectScenario) {
      onSelectScenario(scenarioId);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
      {/* Brand & Subtitle */}
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
          <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Brain className="h-4 w-4 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              WorkLens AI
            </span>
            <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
              Orchestration
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium hidden md:block">
            Enterprise workload intelligence & delivery risk prevention
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Scenario Switcher Dropdown */}
        {onSelectScenario && (
          <div className="relative hidden md:flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
            <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <select
              value={selectedScenario}
              onChange={handleScenarioChange}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
              title="Select Workload Demo Scenario"
            >
              <option value="baseline" className="bg-slate-900 text-white">Scenario: Baseline Imbalance</option>
              <option value="crunch" className="bg-slate-900 text-white">Scenario: Deadline Crunch</option>
              <option value="outage" className="bg-slate-900 text-white">Scenario: Tech Lead Outage</option>
              <option value="skillgap" className="bg-slate-900 text-white">Scenario: Skill Deficit</option>
            </select>
          </div>
        )}

        {/* User Auth / Tenant Switcher Pill */}
        <button
          onClick={onOpenAuthModal}
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500/40 transition-all"
          title="Switch Tenant / Manager Persona"
        >
          <div className="h-6 w-6 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="text-left hidden lg:block">
            <span className="block text-[11px] font-bold text-white leading-tight">
              {currentUser ? currentUser.name : "Manager Alex"}
            </span>
            <span className="text-[9px] font-mono text-indigo-400 flex items-center space-x-1">
              <Building className="h-2.5 w-2.5" />
              <span>{currentUser ? currentUser.tenant_id : "default_tenant"}</span>
            </span>
          </div>
        </button>

        {/* Create Task Button */}
        <button
          onClick={onOpenCreateTask}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Task</span>
        </button>

        {/* Executive Report Button */}
        <button
          onClick={onOpenExecutiveReport}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all hover:border-slate-700"
          title="Export CSVs or Print Executive Report"
        >
          <FileDown className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Report</span>
        </button>

        {/* CSV Import Button */}
        <button
          onClick={onOpenCSVModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all hover:border-slate-700"
          title="Upload employees or tasks CSV"
        >
          <Upload className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden md:inline">Import</span>
        </button>

        {/* Reset Demo Data Button */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all hover:border-slate-700 disabled:opacity-50"
          title="Reset to baseline demo scenario"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
          <span className="hidden xl:inline">Reset</span>
        </button>

        {/* AI Assistant Drawer Trigger Button */}
        <button
          onClick={onOpenChat}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 transition-all transform active:scale-95"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
          <span className="hidden sm:inline">WorkLens AI</span>
        </button>
      </div>
    </header>
  );
};
