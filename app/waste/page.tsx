"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"
import { uploadImage } from "../../lib/uploadImage"
import { SkeletonList } from "../../components/Skeleton"
import { EmptyState } from "../../components/EmptyState"
import { AchievementToast } from "../../components/AchievementToast"

export default function WastePage() {
  const { user, loading } = useAuth()
  const [form, setForm] = useState({
    title: "",
    description: "",
    latitude: "",
    longitude: "",
    category: "plastic",
    priority: "medium",
  })
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reports, setReports] = useState<any[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [locating, setLocating] = useState(false)
  const [filters, setFilters] = useState({ search: "", category: "", status: "" })
  const [toast, setToast] = useState<{ message: string; points: number } | null>(null)

  const loadReports = () => {
    setReportsLoading(true)
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
  }

  useEffect(() => {
    loadReports()
  }, [filters])

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

  const handleUseLocation = () => {
    setMessage("")
    if (!navigator.geolocation) {
      setMessage("Geolocation isn't supported — enter manually.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm({
          ...form,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        })
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

    const res = await fetch("/api/waste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        imageUrl: imageUrl,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
      }),
    })

    if (!res.ok) {
      setMessage("Something went wrong")
      return
    }

    setMessage("Report submitted — thank you!")
    setToast({ message: `Report "${form.title}" submitted successfully!`, points: 15 })
    setForm({ title: "", description: "", latitude: "", longitude: "", category: "plastic", priority: "medium" })
    setImageUrl(null)
    loadReports()
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

        <div className="flex gap-4">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border p-2 rounded flex-1"
          >
            <option value="plastic">Plastic</option>
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
          disabled={uploading}
        >
          Submit Report
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