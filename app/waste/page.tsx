"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"
import { uploadImage } from "../../lib/uploadImage"
import { SkeletonList } from "../../components/Skeleton"
import { EmptyState } from "../../components/EmptyState"
import { AchievementToast } from "../../components/AchievementToast"
import {
  AIWasteClassifierWidget,
  type ClassificationFailure,
  type ClassificationResult,
} from "@/components/waste/AIWasteClassifierWidget"

type WasteReport = {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  createdAt: string
  imageUrl?: string | null
  estimatedWeightKg?: number | null
  estimatedCo2AvoidedKg?: number | null
}

type ClassificationWorkflow = {
  workflowId: string
  status: "classified" | "fallback"
  prediction?: ClassificationResult
  failure?: string
}

async function downloadReportPdf(report: {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  latitude: number
  longitude: number
  createdAt: string
  workflowId?: string
  estimatedWeightKg?: number | null
  estimatedCo2AvoidedKg?: number | null
}) {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const descriptionLines = pdf.splitTextToSize(report.description, pageWidth - 40)

  pdf.setFontSize(18)
  pdf.text("EcoSphere Waste Report", 20, 24)
  pdf.setFontSize(11)
  pdf.text(`Report ID: ${report.id}`, 20, 38)
  pdf.text(`Title: ${report.title}`, 20, 48)
  pdf.text(`Category: ${report.category}`, 20, 58)
  pdf.text(`Priority: ${report.priority}`, 20, 68)
  pdf.text(`Status: ${report.status}`, 20, 78)
  pdf.text(`Submitted: ${new Date(report.createdAt).toLocaleString()}`, 20, 88)
  pdf.text(`Location: ${report.latitude}, ${report.longitude}`, 20, 98)
  if (report.workflowId) pdf.text(`Workflow ID: ${report.workflowId}`, 20, 108)
  pdf.text(`Estimated weight: ${report.estimatedWeightKg ?? "Unknown"} kg`, 20, 118)
  pdf.text(
    `Potential CO2e avoided if recycled: ${report.estimatedCo2AvoidedKg ?? "Not available"} kg`,
    20,
    128
  )
  pdf.text("Description:", 20, 142)
  pdf.text(descriptionLines, 20, 150)
  pdf.save(`waste-report-${report.id}.pdf`)
}

export default function WastePage() {
  const { user, loading } = useAuth()
  const [form, setForm] = useState({
    title: "",
    description: "",
    latitude: "",
    longitude: "",
    category: "plastic",
    priority: "medium",
    estimatedWeightKg: "1",
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reports, setReports] = useState<WasteReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [locating, setLocating] = useState(false)
  const [filters, setFilters] = useState({ search: "", category: "", status: "" })
  const [toast, setToast] = useState<{ message: string; points: number } | null>(null)
  const [classificationWorkflow, setClassificationWorkflow] = useState<ClassificationWorkflow | null>(null)

  const loadReports = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set("search", filters.search)
    if (filters.category) params.set("category", filters.category)
    if (filters.status) params.set("status", filters.status)

    fetch(`/api/waste?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setReports(data)
        setReportsLoading(false)
      })
  }, [filters])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  if (loading) return <Loading />

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadImage(file)
      setImageUrl(url)
    } catch {
      setMessage("Image upload failed — try again.")
    }
    setUploading(false)
  }

  const handleAiPrediction = async (prediction: ClassificationResult, file: File) => {
    setClassificationWorkflow({ workflowId: prediction.workflowId, status: "classified", prediction })
    if (prediction.confidenceAccepted) {
      setForm((prev) => ({
        ...prev,
        category: prediction.mappedCategory,
        title: prev.title || `Reported ${prediction.mappedCategory} waste`,
      }))
    } else {
      setMessage("AI confidence is low. Choose the correct category manually before submitting.")
    }

    setUploading(true)
    try {
      setImageUrl(await uploadImage(file))
    } catch {
      setMessage("The photo could not be saved. You can still submit the report without it.")
    } finally {
      setUploading(false)
    }
  }

  const handleAiFailure = (failure: ClassificationFailure) => {
    setClassificationWorkflow({
      workflowId: failure.workflowId || crypto.randomUUID(),
      status: "fallback",
      failure: failure.failure || failure.message || "AI classification failed.",
    })
  }

  const handleUseLocation = () => {
    setMessage("")
    if (!navigator.geolocation) {
      setMessage("Geolocation isn't supported — enter manually.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }))
        setLocating(false)
      },
      () => {
        setLocating(false)
        setMessage("Couldn't get your location — enter it manually.")
      }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")

    if (!user) {
      setMessage("Please login to report waste.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          priority: form.priority,
          imageUrl,
          estimatedWeightKg: Number(form.estimatedWeightKg),
          classificationWorkflow,
          latitude: form.latitude ? Number(form.latitude) : 0,
          longitude: form.longitude ? Number(form.longitude) : 0,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || "Unable to submit the report. Please try again.")
        return
      }

      let receiptError = ""
      try {
        await downloadReportPdf(data)
      } catch {
        receiptError = " The report was saved, but its PDF could not be downloaded."
      }
      const impactSummary = Number.isFinite(data.estimatedCo2AvoidedKg)
        ? ` Estimated potential avoided emissions if recycled: ${Number(data.estimatedCo2AvoidedKg).toFixed(3)} kg CO2e for ${data.estimatedWeightKg} kg.`
        : " A carbon estimate is unavailable for this material."

      if (data.agentReasoning) {
        setMessage(`Report submitted — EcoAgent classified this as ${data.category}/${data.priority}. ${data.agentReasoning}${impactSummary}${receiptError}`)
      } else {
        setMessage(`Report submitted — thank you!${impactSummary}${receiptError}`)
      }
      setToast({ message: `Report "${form.title}" submitted successfully!`, points: 15 })
      setForm({ title: "", description: "", latitude: "", longitude: "", category: "plastic", priority: "medium", estimatedWeightKg: "1" })
      setImageUrl(null)
      setClassificationWorkflow(null)
      loadReports()
    } catch {
      setMessage("Unable to reach the server. Check that EcoSphere is running and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const priorityColor: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  }

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      {toast && (
        <AchievementToast
          message={toast.message}
          points={toast.points}
          onClose={() => setToast(null)}
        />
      )}

      <h1 className="text-2xl font-bold text-green-800 mb-2">Report Waste</h1>
      <p className="text-gray-600 mb-6">
        Spotted illegal dumping or an overflowing bin? Report it here.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-10">
        <input
          type="text"
          placeholder="Title (e.g. Overflowing bin on Main Road)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="border p-2 rounded"
          required
        />

        <textarea
          placeholder="Describe the issue in detail"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="border p-2 rounded"
          required
        />

        {/* EcoSphere AI Waste Classification Research Module */}
        <AIWasteClassifierWidget
          onPrediction={handleAiPrediction}
          onFailure={handleAiFailure}
          location={{ latitude: form.latitude, longitude: form.longitude }}
          weightKg={form.estimatedWeightKg}
        />

        <div className="flex gap-4">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border p-2 rounded flex-1 capitalize"
          >
            {/* Standard & AI Research categories */}
            <option value="plastic">Plastic</option>
            <option value="cardboard">Cardboard</option>
            <option value="paper">Paper</option>
            <option value="glass">Glass</option>
            <option value="metal">Metal</option>
            <option value="trash">General Trash</option>
            <option value="organic">Organic</option>
            <option value="e-waste">E-waste</option>
            <option value="construction">Construction Debris</option>
            <option value="other">Other</option>
          </select>

          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="border p-2 rounded flex-1"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        <label className="text-sm text-gray-600">
          Estimated waste weight (kg)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={form.estimatedWeightKg}
            onChange={(e) => setForm({ ...form, estimatedWeightKg: e.target.value })}
            className="border p-2 rounded w-full mt-1"
            required
          />
        </label>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Photo (optional)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} />
          {uploading && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
          {imageUrl && !uploading && (
            <img src={imageUrl} alt="preview" className="mt-2 h-24 rounded border" />
          )}
        </div>

        <button
          type="button"
          onClick={handleUseLocation}
          disabled={locating}
          className="self-start text-sm bg-green-100 text-green-800 px-3 py-2 rounded hover:bg-green-200 disabled:opacity-50"
        >
          {locating ? "Getting your location..." : "📍 Use my current location"}
        </button>

        <div className="flex gap-4">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            className="border p-2 rounded flex-1"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            className="border p-2 rounded flex-1"
          />
        </div>

        {message && <p className="text-sm text-green-700">{message}</p>}

        <button
          type="submit"
          className="bg-green-700 text-white py-2 rounded hover:bg-green-800"
          disabled={uploading || submitting}
        >
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </form>

      <h2 className="font-semibold mb-3">Recent Reports</h2>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search reports..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border p-2 rounded text-sm flex-1 min-w-[150px]"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Categories</option>
          <option value="plastic">Plastic</option>
          <option value="cardboard">Cardboard</option>
          <option value="paper">Paper</option>
          <option value="glass">Glass</option>
          <option value="metal">Metal</option>
          <option value="trash">Trash</option>
          <option value="organic">Organic</option>
          <option value="e-waste">E-waste</option>
          <option value="construction">Construction</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {reportsLoading ? (
        <SkeletonList count={3} />
      ) : reports.length === 0 ? (
        <EmptyState icon="📦" title="No reports yet. Report your first waste issue." />
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="border rounded p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {r.category} • Status: {r.status} • {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  {r.estimatedCo2AvoidedKg != null && (
                    <p className="text-xs text-green-700 mt-1">
                      Potential CO2e avoided if recycled: {r.estimatedCo2AvoidedKg} kg
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded capitalize shrink-0 ${priorityColor[r.priority]}`}>
                  {r.priority}
                </span>
              </div>
              {r.imageUrl && (
                <img src={r.imageUrl} alt={r.title} className="mt-2 h-20 rounded border" />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}