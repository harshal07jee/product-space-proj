"use client";

import React, { useState, useEffect } from "react";
import { ActivityLog } from "@/lib/types";
import { fetchActivityLogs } from "@/lib/api";
import {
  History,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowRightLeft,
  PlusCircle,
  Edit3,
  Trash2,
  FileSpreadsheet,
  Cpu,
  Layers,
  Clock
} from "lucide-react";

interface ActivityLogViewProps {
  onRefresh?: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ onRefresh }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("ALL");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "APPROVE_RECOMMENDATION":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "REASSIGN_TASK":
        return <ArrowRightLeft className="h-4 w-4 text-indigo-400" />;
      case "CREATE_TASK":
        return <PlusCircle className="h-4 w-4 text-cyan-400" />;
      case "UPDATE_TASK":
        return <Edit3 className="h-4 w-4 text-amber-400" />;
      case "DELETE_TASK":
        return <Trash2 className="h-4 w-4 text-rose-400" />;
      case "IMPORT_CSV":
      case "IMPORT_EMPLOYEES":
      case "IMPORT_TASKS":
        return <FileSpreadsheet className="h-4 w-4 text-purple-400" />;
      case "WHAT_IF_COMMIT":
        return <Cpu className="h-4 w-4 text-pink-400" />;
      case "CREATE_DEPENDENCY":
      case "DELETE_DEPENDENCY":
        return <Layers className="h-4 w-4 text-blue-400" />;
      default:
        return <History className="h-4 w-4 text-slate-400" />;
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "APPROVE_RECOMMENDATION":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "REASSIGN_TASK":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "CREATE_TASK":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "UPDATE_TASK":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "DELETE_TASK":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "WHAT_IF_COMMIT":
        return "bg-pink-500/10 text-pink-400 border-pink-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tenant_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction =
      filterAction === "ALL" ||
      (filterAction === "APPROVALS" && log.action === "APPROVE_RECOMMENDATION") ||
      (filterAction === "REASSIGNMENTS" && log.action.includes("REASSIGN")) ||
      (filterAction === "TASKS" && (log.action.includes("TASK") || log.action.includes("DEPENDENCY"))) ||
      (filterAction === "SIMULATION" && log.action.includes("WHAT_IF")) ||
      (filterAction === "IMPORTS" && log.action.includes("IMPORT"));

    return matchesSearch && matchesAction;
  });

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <History className="h-5 w-5 text-indigo-400" />
            <span>Activity Log & Manager Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400">
            Immutable audit record of task redistributions, manager approvals, manual edits, and simulations
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-400" : "text-slate-400"}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search audit descriptions, actions, or tenants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: "All Events" },
            { id: "APPROVALS", label: "Approvals" },
            { id: "REASSIGNMENTS", label: "Reassignments" },
            { id: "TASKS", label: "Task CRUD" },
            { id: "SIMULATION", label: "What-If Commits" },
            { id: "IMPORTS", label: "Imports" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterAction(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterAction === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center space-y-2">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading chronological audit trail...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-2">
          <Clock className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No activity records found</h3>
          <p className="text-xs text-slate-500">
            {searchQuery ? "Try adjusting your search terms or filters." : "Activities will appear here as tasks and recommendations are managed."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="glass-card rounded-2xl p-4 border border-slate-800/90 hover:border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
            >
              <div className="flex items-start space-x-3.5">
                <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getActionBadgeColor(log.action)}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      Tenant: {log.tenant_id}
                    </span>
                    {log.entity_type && (
                      <span className="text-[10px] text-slate-400">
                        • {log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {log.description}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 pl-12 sm:pl-0">
                <span className="text-[11px] text-slate-400 font-mono flex items-center sm:justify-end space-x-1">
                  <Clock className="h-3 w-3 text-slate-500" />
                  <span>{formatTimestamp(log.created_at)}</span>
                </span>
                <span className="text-[10px] text-slate-500 block">Log ID #{log.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
