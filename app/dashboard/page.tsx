"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [data, setData] = useState<any>(null)

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
      <p className="text-gray-500 mb-8">Here's your EcoSphere summary.</p>

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
        {data.recentActivities.map((a: any) => (
          <div key={a.id} className="border p-3 rounded flex justify-between w-full">
            <span className="capitalize">{a.type}</span>
            <span>{a.value} units</span>
            <span className="text-green-700 font-semibold">{a.co2Kg} kg CO₂</span>
          </div>
        ))}
      </div>
    </main>
  )
}