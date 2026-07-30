"use client"

import { useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"
import { AchievementToast } from "../../components/AchievementToast"

export default function CarbonPage() {
  const { user, loading } = useAuth()
  const [form, setForm] = useState({ type: "commute", value: "" })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [toast, setToast] = useState<{ message: string; points: number } | null>(null)

  if (loading) return <Loading />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResult(null)

    if (!user) {
      setError("Please login first")
      return
    }

    const res = await fetch("/api/carbon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        type: form.type,
        value: parseFloat(form.value),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      return
    }

    setResult(data)
    setToast({ message: `Activity logged — ${data.co2Kg} kg CO₂ tracked!`, points: 10 })
    setForm({ ...form, value: "" })
  }

  return (
    <main className="max-w-md mx-auto mt-16 p-6 border rounded-lg shadow">
      {toast && (
        <AchievementToast
          message={toast.message}
          points={toast.points}
          onClose={() => setToast(null)}
        />
      )}

      <h1 className="text-2xl font-bold text-green-800 mb-6">Log an Activity</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="commute">Commute (km)</option>
          <option value="electricity">Electricity (kWh)</option>
          <option value="waste">Waste (kg)</option>
        </select>

        <input
          type="number"
          placeholder="Value"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          className="border p-2 rounded"
          required
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="bg-green-700 text-white py-2 rounded hover:bg-green-800"
        >
          Log Activity
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded">
          <p className="text-green-800 font-semibold">
            Logged! Estimated CO₂: {result.co2Kg} kg
          </p>
        </div>
      )}
    </main>
  )
}