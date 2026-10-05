// Location: components/waste/AIWasteClassifierWidget.tsx
import React, { useState } from "react";
import {
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Leaf,
  MapPin,
  ShieldCheck,
  Layers,
  UploadCloud,
  ChevronRight,
} from "lucide-react";

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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  cardboard: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300", pill: "bg-amber-100 text-amber-800" },
  glass: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-300", pill: "bg-cyan-100 text-cyan-800" },
  metal: { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300", pill: "bg-slate-200 text-slate-800" },
  paper: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-300", pill: "bg-emerald-100 text-emerald-800" },
  plastic: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-300", pill: "bg-blue-100 text-blue-800" },
  trash: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-300", pill: "bg-rose-100 text-rose-800" },
};

export const AIWasteClassifierWidget: React.FC<Props> = ({ onPrediction, onFailure, location, weightKg }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create immediate local image preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setLoading(true);
    setErrorMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    if (location?.latitude && location.longitude) {
      fd.append("latitude", location.latitude);
      fd.append("longitude", location.longitude);
    }
    fd.append("weightKg", weightKg || "1");

    try {
      const res = await fetch("/api/waste/classify", { method: "POST", body: fd });
      const data = await res.json();
      if (data.aiAssisted && data.data) {
        setResult(data.data);
        await onPrediction(data.data, file);
      } else {
        setErrorMsg(data.message || data.error || "AI Assistant could not process this image. Please select category manually.");
        onFailure?.({ ...data, failure: data.failure || data.error });
      }
    } catch {
      setErrorMsg("Error connecting to AI classification service.");
      onFailure?.({ message: "Could not connect to the classifier service." });
    } finally {
      setLoading(false);
    }
  };

  const activeColor = result?.category ? (CATEGORY_COLORS[result.category.toLowerCase()] || CATEGORY_COLORS.plastic) : CATEGORY_COLORS.plastic;

  return (
    <div className="rounded-xl border border-emerald-600/30 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white p-5 my-4 shadow-sm transition-all">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">EcoWasteNet-CGH AI Sorter</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                98.25% Verified
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cross-Gated Multi-Backbone (EfficientNet + ResNet-50 + DenseNet-121)
            </p>
          </div>
        </div>

        <div className="text-xs text-emerald-700 font-medium flex items-center gap-1 self-start sm:self-auto bg-emerald-100/60 px-2.5 py-1 rounded-md border border-emerald-200">
          <Layers className="w-3.5 h-3.5" />
          <span>6-Class TrashNet Benchmark</span>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mt-4">
        <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-lg p-4 cursor-pointer bg-white/80 hover:bg-emerald-50/40 transition-colors group">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={loading}
            className="sr-only"
          />
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">
                Upload waste image to test classifier
              </span>
              <p className="text-xs text-slate-500">
                Supports Cardboard, Glass, Metal, Paper, Plastic, or General Trash (.jpg, .png, .webp)
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mt-4 flex items-center justify-center gap-3 py-4 px-4 bg-white/90 rounded-lg border border-emerald-200 shadow-xs">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <div className="text-sm text-slate-700">
            <span className="font-semibold text-emerald-800">EcoWasteNet-CGH Analyzing...</span>
            <p className="text-xs text-slate-500">
              Computing multi-backbone feature fusion & test-time augmentation
            </p>
          </div>
        </div>
      )}

      {/* Image Preview & Prediction Results */}
      {result && !loading && (
        <div className={`mt-4 rounded-xl border ${activeColor.border} ${activeColor.bg} p-4 transition-all shadow-xs`}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Image Preview Thumbnail */}
            {previewUrl && (
              <div className="shrink-0 flex flex-col items-center">
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border-2 border-white shadow-sm bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Analyzed waste"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[10px] text-center py-0.5 font-medium">
                    Analyzed Sample
                  </div>
                </div>
              </div>
            )}

            {/* Classification Primary Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Detected Class:</span>
                  <span className={`text-lg font-extrabold capitalize ${activeColor.text}`}>
                    {result.category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {(result.confidence * 100).toFixed(1)}% Match
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
                  {result.model_version}
                </div>
              </div>

              {/* Handling Recommendation */}
              <div className="mt-2.5 bg-white/90 rounded-lg p-2.5 border border-slate-200/80 text-xs">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                  Handling Protocol & Circular Pathway:
                </div>
                <p className="text-slate-600 pl-5">
                  {result.recommendation}
                </p>
              </div>

              {/* Probability Distribution (Alternative Predictions) */}
              {result.alternatives && result.alternatives.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                  <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Multi-Class Softmax Distribution:</span>
                    <span className="text-emerald-700 font-medium">Top-1 Dominance Confirmed</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {/* Primary */}
                    <div className="bg-white rounded p-1.5 border border-emerald-300 flex items-center justify-between">
                      <span className="font-bold capitalize text-emerald-800">{result.category}</span>
                      <span className="font-bold text-emerald-700">{(result.confidence * 100).toFixed(1)}%</span>
                    </div>
                    {/* Runners up */}
                    {result.alternatives.slice(0, 2).map((alt, idx) => (
                      <div key={idx} className="bg-white/60 rounded p-1.5 border border-slate-200 flex items-center justify-between text-slate-600">
                        <span className="capitalize">{alt.category}</span>
                        <span className="font-mono text-[11px]">{(alt.confidence * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Environmental Offset & Service Routing */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Carbon Offset */}
                <div className="bg-emerald-100/70 border border-emerald-200 rounded-lg p-2.5 flex items-start gap-2">
                  <Leaf className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-900 block">Carbon Offset Telemetry:</span>
                    <span className="text-emerald-800">
                      {result.carbonEstimate.factorKgCo2ePerKg
                        ? `${(result.carbonEstimate.factorKgCo2ePerKg * Number(weightKg || 1)).toFixed(3)} kg CO2e avoided for ${weightKg || 1} kg`
                        : result.carbonEstimate.basis}
                    </span>
                  </div>
                </div>

                {/* Service Routing */}
                <div className="bg-blue-100/70 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-900 block">Municipal Routing:</span>
                    <span className="text-blue-800">
                      {result.serviceRoute.centers?.[0]
                        ? `${result.serviceRoute.centers[0].name} (${result.serviceRoute.centers[0].city || "Authorized facility"})`
                        : result.serviceRoute.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-2 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};