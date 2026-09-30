"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"

type DashboardData = {
  name: string | null
  totalCarbonSaved: number
  greenPoints: number
  eventsJoined: number
  wasteReportsCount: number
  unreadNotifications: number
  recentActivities: Array<{
    id: string
    type: string
    value: number
    co2Kg: number
  }>
  recentWasteReports: Array<{
    id: string
    title: string
    description: string
    category: string
    status: string
    createdAt: string
    estimatedWeightKg: number | null
    estimatedCo2AvoidedKg: number | null
  }>
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (!user) return
    fetch(`/api/gateway/dashboard?userId=${user.id}`)
      .then((res) => res.json())
      .then(setData)
  }, [user])

  if (loading || !data) return <Loading />

  return (
    <main className="max-w-3xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-1">
        Welcome back, {data.name?.split(" ")[0]}
      </h1>
      <p className="text-gray-500 mb-8">Here&apos;s your EcoSphere summary.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-green-800">
            {data.totalCarbonSaved.toFixed(2)} kg
          </p>
          <p className="text-xs text-gray-500 mt-1">CO₂ Logged</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-green-800">{data.greenPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Green Points</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-green-800">{data.eventsJoined}</p>
          <p className="text-xs text-gray-500 mt-1">Events Joined</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-green-800">{data.wasteReportsCount}</p>
          <p className="text-xs text-gray-500 mt-1">Waste Reports</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-xl font-bold text-green-800">{data.unreadNotifications}</p>
          <p className="text-xs text-gray-500 mt-1">New Alerts</p>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Recent Activity</h2>
      <div className="flex flex-col gap-3">
        {data.recentActivities.length === 0 && (
          <p className="text-gray-500 text-sm">No activities logged yet.</p>
        )}
        {data.recentActivities.map((a) => (
          <div key={a.id} className="border p-3 rounded flex justify-between w-full">
            <span className="capitalize">{a.type}</span>
            <span>{a.value} units</span>
            <span className="text-green-700 font-semibold">{a.co2Kg} kg CO₂</span>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mt-8 mb-3">Recent Waste Reports</h2>
      <div className="flex flex-col gap-3">
        {data.recentWasteReports.length === 0 && (
          <p className="text-gray-500 text-sm">No waste reports submitted yet.</p>
        )}
        {data.recentWasteReports.map((report) => (
          <div key={report.id} className="border p-3 rounded">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-semibold">{report.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {report.category} · {new Date(report.createdAt).toLocaleDateString()}
                </p>
                {report.estimatedCo2AvoidedKg !== null && (
                  <p className="text-xs text-green-700 mt-1">
                    Potential CO2e avoided if recycled: {report.estimatedCo2AvoidedKg} kg
                    {report.estimatedWeightKg !== null && ` at ${report.estimatedWeightKg} kg waste`}
                  </p>
                )}
              </div>
              <span className="text-xs capitalize shrink-0">{report.status}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}