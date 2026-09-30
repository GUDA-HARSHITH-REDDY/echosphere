// Location: components/waste/AIWasteClassifierWidget.tsx
import React, { useState } from "react";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  onPrediction: (result: ClassificationResult, file: File) => void | Promise<void>;
  onFailure?: (failure: ClassificationFailure) => void;
  location?: { latitude: string; longitude: string };
  weightKg: string;
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  recommendation: string;
  alternatives: { category: string; confidence: number }[];
  workflowId: string;
  mappedCategory: string;
  confidenceThreshold: number;
  confidenceAccepted: boolean;
  model_version: string;
  carbonEstimate: {
    estimatedWeightKg: number;
    factorKgCo2ePerKg: number | null;
    estimatedCo2AvoidedKg: number | null;
    basis: string;
  };
  serviceRoute: {
    service: string;
    label: string;
    status: "routed" | "fallback";
    centers: Array<{
      id: string;
      name: string;
      address: string;
      city: string | null;
      type: string;
      distanceKm?: number;
    }>;
    fallbackReason?: string;
  };
}

export interface ClassificationFailure {
  workflowId?: string;
  failure?: string;
  message?: string;
}

export const AIWasteClassifierWidget: React.FC<Props> = ({ onPrediction, onFailure, location, weightKg }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    if (location?.latitude && location.longitude) {
      fd.append("latitude", location.latitude);
      fd.append("longitude", location.longitude);
    }
    fd.append("weightKg", weightKg);

    try {
      const res = await fetch("/api/waste/classify", { method: "POST", body: fd });
      const data = await res.json();
      if (data.aiAssisted && data.data) {
        setResult(data.data);
        await onPrediction(data.data, file);
      } else {
        setErrorMsg(data.message || data.error || "AI Assistant is offline. Please choose category manually.");
        onFailure?.({ ...data, failure: data.failure || data.error });
      }
    } catch {
      setErrorMsg("Error connecting to AI service.");
      onFailure?.({ message: "Could not connect to the classifier service." });
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
          <div className="text-xs text-slate-600 mt-1">
            Report category: <span className="capitalize">{result.mappedCategory}</span>
            {result.confidenceAccepted ? " · Prediction accepted" : " · Manual category required"}
          </div>
          {result.alternatives.length > 0 && (
            <div className="mt-1 text-xs text-slate-600">
              Other possible matches: {result.alternatives.map((match) =>
                `${match.category} (${(match.confidence * 100).toFixed(1)}%)`
              ).join(", ")}
            </div>
          )}
          <div className="text-xs text-slate-600 mt-1">{result.recommendation}</div>
          <div className="text-xs text-slate-700 mt-1">
            {result.carbonEstimate.estimatedCo2AvoidedKg === null
              ? result.carbonEstimate.basis
              : Number(weightKg) > 0
                ? `Illustrative potential avoided emissions: ${(result.carbonEstimate.factorKgCo2ePerKg! * Number(weightKg)).toFixed(3)} kg CO2e for ${weightKg} kg if recycled.`
                : "Enter a positive weight to estimate potential avoided emissions."}
          </div>
          <div className="text-xs text-slate-700 mt-2">
            Routed to: <span className="font-medium">{result.serviceRoute.label}</span>
          </div>
          {result.serviceRoute.centers.length > 0 && (
            <ul className="text-xs text-slate-600 mt-1 list-disc pl-4">
              {result.serviceRoute.centers.map((center) => (
                <li key={center.id}>
                  {center.name} · {center.address}{center.city ? `, ${center.city}` : ""}
                  {center.distanceKm !== undefined && ` · ${center.distanceKm.toFixed(1)} km`}
                </li>
              ))}
            </ul>
          )}
          {result.serviceRoute.fallbackReason && (
            <div className="text-xs text-amber-700 mt-1">{result.serviceRoute.fallbackReason}</div>
          )}
          <div className="text-xs text-slate-500 mt-1">
            {result.confidenceAccepted
              ? "Review the suggested category before submitting; you can change it below."
              : "Low confidence: choose the correct category manually before submitting."}
          </div>
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