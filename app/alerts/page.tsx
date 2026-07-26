"use client"

import { useEffect, useState } from "react"

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [live, setLive] = useState<any>(null)

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then(setAlerts)

    // try to use the browser's location for live AQI, fallback to default
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch(`/api/alerts/live?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
            .then((r) => r.json())
            .then(setLive)
        },
        () => {
          fetch("/api/alerts/live").then((r) => r.json()).then(setLive)
        }
      )
    } else {
      fetch("/api/alerts/live").then((r) => r.json()).then(setLive)
    }
  }, [])

  const severityColor: Record<string, string> = {
    low: "bg-yellow-100 text-yellow-800",
    moderate: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800",
  }

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Environmental Alerts</h1>
      <p className="text-gray-600 mb-6">
        Stay updated on air quality, heatwaves, and other environmental risks.
      </p>

      {live && (
        <div className="border-2 border-green-200 rounded-lg p-4 mb-8 bg-green-50">
          <h2 className="font-semibold text-green-800 mb-2">🌫️ Live Air Quality (your location)</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{live.aqi ?? "—"} <span className="text-sm font-normal">AQI</span></p>
              <p className="text-sm text-gray-600 mt-1">{live.message}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded capitalize ${severityColor[live.severity]}`}>
              {live.severity}
            </span>
          </div>
        </div>
      )}

      <h2 className="font-semibold mb-3">Posted Alerts</h2>
      <div className="flex flex-col gap-3">
        {alerts.map((a) => (
          <div key={a.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold capitalize">{a.type.replace("_", " ")}</h3>
                <p className="text-sm text-gray-600 mt-1">{a.message}</p>
                <p className="text-xs text-gray-400 mt-1">📍 {a.region}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded capitalize ${
                  severityColor[a.severity] || severityColor.moderate
                }`}
              >
                {a.severity}
              </span>
            </div>
          </div>
        ))}
        {alerts.length === 0 && <p className="text-gray-500 text-sm">No active alerts.</p>}
      </div>
    </main>
  )
}