"use client"

import { useEffect, useState } from "react"

export default function StatusPage() {
  const [health, setHealth] = useState<any>(null)

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then(setHealth)
  }, [])

  if (!health) return null

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">System Status</h1>
      <p className="text-gray-600 mb-6">
        Overall:{" "}
        <span
          className={`font-semibold ${
            health.overallStatus === "healthy" ? "text-green-700" : "text-red-600"
          }`}
        >
          {health.overallStatus.toUpperCase()}
        </span>
      </p>

      <div className="flex flex-col gap-2">
        {health.services.map((s: any) => (
          <div
            key={s.service}
            className="border rounded p-3 flex justify-between items-center"
          >
            <span>{s.service}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{s.responseTimeMs}ms</span>
              <span
                className={`text-xs px-2 py-1 rounded font-semibold ${
                  s.status === "up"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {s.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}