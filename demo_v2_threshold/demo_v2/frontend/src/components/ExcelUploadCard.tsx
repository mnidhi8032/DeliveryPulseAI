import React, { useRef, useState } from "react";
import { downloadExcelTemplate, uploadExcelFile } from "../services/excelService";
import type { ExcelImportBatch } from "../types/excel";

interface ExcelUploadCardProps {
  submissionId: string;
  onUploadSuccess: (batch: ExcelImportBatch) => void;
  onUploadError: (error: string) => void;
}

export function ExcelUploadCard({
  submissionId,
  onUploadSuccess,
  onUploadError,
}: ExcelUploadCardProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await downloadExcelTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "deliverypulse_governance_template.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      onUploadError("Failed to download template file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const isExcel =
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".xlsx");

    if (!isExcel) {
      onUploadError("Invalid file type. Only Excel spreadsheets (.xlsx) are allowed.");
      return;
    }

    setUploading(true);
    try {
      const batch = await uploadExcelFile(file, submissionId);
      onUploadSuccess(batch);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      onUploadError(detail ?? "Failed to upload and parse Excel file. Ensure the template schema is intact.");
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">Excel Upload Workflow</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Download the official metric report template, fill it offline, and import all scores at once.
          </p>
        </div>
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-60"
        >
          {downloading ? (
            <>
              <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Template
            </>
          )}
        </button>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all duration-300 cursor-pointer ${
          dragging
            ? "border-indigo-500 bg-indigo-50/40"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx"
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center py-4">
            <svg className="animate-spin h-10 w-10 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-semibold text-slate-700">Uploading and parsing file...</p>
            <p className="text-xs text-slate-400 mt-1">Reading headers, validation rules, and cell configurations.</p>
          </div>
        ) : (
          <>
            <div className={`rounded-full p-3 transition-colors duration-300 ${
              dragging ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            </div>
            
            <p className="mt-4 text-sm font-semibold text-slate-700">
              {dragging ? "Drop your Excel spreadsheet here" : "Drag & drop your populated Excel file here"}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">
              or <span className="text-indigo-600 font-semibold group-hover:text-indigo-700 underline">browse your local system</span>
            </p>
            <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              supports standard excel formats (.xlsx)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
