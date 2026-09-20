// Location: components/waste/AIWasteClassifierWidget.tsx
import React, { useState } from "react";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  onCategoryDetected: (category: string) => void;
}

export const AIWasteClassifierWidget: React.FC<Props> = ({ onCategoryDetected }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ category: string; confidence: number; recommendation: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/waste/classify", { method: "POST", body: fd });
      const data = await res.json();
      if (data.aiAssisted && data.data) {
        setResult(data.data);
        onCategoryDetected(data.data.category);
      } else {
        setErrorMsg("AI Assistant is offline. Please choose category manually.");
      }
    } catch {
      setErrorMsg("Error connecting to AI service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-4 my-3">
      <div className="flex items-center gap-2 mb-2 text-emerald-800 font-medium">
        <Sparkles className="w-4 h-4" />
        <span>EcoSphere AI Automated Sorter</span>
      </div>
      <input type="file" accept="image/*" onChange={handleUpload} className="text-sm" />
      {loading && (
        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          Analyzing material...
        </div>
      )}
      {result && (
        <div className="mt-2 text-sm bg-white p-2 rounded border border-slate-200">
          <div className="font-semibold text-slate-900">
            Detected: <span className="capitalize">{result.category}</span> ({(result.confidence * 100).toFixed(1)}%)
          </div>
          <div className="text-xs text-slate-600 mt-1">{result.recommendation}</div>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};