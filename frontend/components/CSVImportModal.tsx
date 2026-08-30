"use client";

import React, { useState } from "react";
import { uploadCSV } from "@/lib/api";
import { Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"employees" | "tasks">("employees");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResultMessage(null);

    try {
      const res = await uploadCSV(activeTab, file);
      if (res.success) {
        setResultMessage(
          `Success! Imported/updated records. (${res.created_count || 0} created, ${res.updated_count || 0} updated).`
        );
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setResultMessage(`Import Warning: ${res.errors.join("; ")}`);
      }
    } catch (e: any) {
      setResultMessage(`Upload Error: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">CSV Data Importer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => {
              setActiveTab("employees");
              setFile(null);
              setResultMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "employees"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            employees.csv
          </button>
          <button
            onClick={() => {
              setActiveTab("tasks");
              setFile(null);
              setResultMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "tasks"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            tasks.csv
          </button>
        </div>

        {/* Format Spec */}
        <div className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800 text-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-indigo-400 block">
            Expected Headers ({activeTab}.csv)
          </span>
          <code className="text-slate-300 block font-mono text-[11px] bg-slate-950 p-2 rounded-lg">
            {activeTab === "employees"
              ? "name,role,skills,weekly_capacity"
              : "title,project,assigned_employee,estimated_hours,remaining_hours,priority,deadline,required_skills"}
          </code>
        </div>

        {/* File Picker */}
        <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center space-y-3 bg-slate-950/40">
          <FileText className="h-8 w-8 text-slate-500 mx-auto" />
          <div>
            <label className="cursor-pointer text-xs font-bold text-indigo-400 hover:underline">
              Choose a CSV File
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <p className="text-[11px] text-slate-500 mt-1">
              {file ? file.name : "Select employees.csv or tasks.csv from your system"}
            </p>
          </div>
        </div>

        {resultMessage && (
          <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs text-indigo-300">
            {resultMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all flex items-center space-x-1.5"
          >
            {uploading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload & Import</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
