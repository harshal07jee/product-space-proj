"use client";

import React from "react";
import { Recommendation } from "@/lib/types";
import { Sparkles, CheckCircle2, XCircle, ArrowRight, ShieldAlert, Check, Clock, UserCheck } from "lucide-react";

interface RecommendationsViewProps {
  recommendations: Recommendation[];
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isApproving: number | null;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  recommendations,
  onApprove,
  onReject,
  isApproving,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <span>AI Task Redistribution Recommendations</span>
        </h2>
        <p className="text-xs text-slate-400">
          Automated workload balancing suggestions to resolve employee overload and prevent project delivery delays
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Workload is Currently Balanced!</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No active employees are critically overloaded. All team members are operating within healthy capacity thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="glass-panel rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/30 space-y-5 transition-all"
            >
              {/* Header Badge */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {rec.project_name}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Recommendation ID #{rec.id}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-rose-400">Risk Before: {rec.risk_before}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs font-bold text-emerald-400">Risk After: {rec.risk_after}</span>
                </div>
              </div>

              {/* Problem & Action Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Problem */}
                <div className="glass-card rounded-xl p-4 border border-rose-500/20 bg-rose-500/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Detected Workload Problem
                  </span>
                  <p className="text-sm font-bold text-white">
                    {rec.from_employee_name} is critically overloaded at{" "}
                    <span className="text-rose-400">{rec.from_employee_util_before}% workload</span>.
                  </p>
                </div>

                {/* Suggested Action */}
                <div className="glass-card rounded-xl p-4 border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Suggested Redistribution Action
                  </span>
                  <p className="text-sm font-bold text-white">
                    Reassign task <span className="text-indigo-300">'{rec.task_title}'</span> to{" "}
                    <span className="text-emerald-400">{rec.to_employee_name}</span>.
                  </p>
                </div>
              </div>

              {/* Rationale / Why */}
              <div className="glass-card rounded-xl p-4 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  AI Rationale & Evidence
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {rec.reason}
                </p>
              </div>

              {/* Expected Impact Comparison Box */}
              <div className="glass-card rounded-xl p-4 border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
                  Expected Workload Impact
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* From Employee Impact */}
                  <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{rec.from_employee_name}</span>
                      <span className="text-[11px] text-slate-400">Current Assignee</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-rose-400">
                        {rec.from_employee_util_before}% <span className="text-slate-400 text-xs">→</span>{" "}
                        <span className="text-emerald-400">{rec.from_employee_util_after}%</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium">Safe Healthy Range</span>
                    </div>
                  </div>

                  {/* To Employee Impact */}
                  <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{rec.to_employee_name}</span>
                      <span className="text-[11px] text-slate-400">Target Assignee</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-indigo-400">
                        {rec.to_employee_util_before}% <span className="text-slate-400 text-xs">→</span>{" "}
                        <span className="text-emerald-400">{rec.to_employee_util_after}%</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium">Utilizes Spare Capacity</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => onReject(rec.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all flex items-center space-x-1.5"
                >
                  <XCircle className="h-4 w-4 text-slate-500" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => onApprove(rec.id)}
                  disabled={isApproving === rec.id}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 active:scale-95 disabled:opacity-50"
                >
                  {isApproving === rec.id ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Redistribution</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
