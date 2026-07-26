"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

const COLORS = ["#15803d", "#22c55e", "#86efac", "#166534", "#4ade80"]

export default function AnalyticsPage() {
  const [data, setData] = useState<any>({
    monthlyCarbon: [], emissionsByType: [], weeklyWasteTrend: [],
    topWasteCategories: [], mostActiveUsers: [], communityParticipation: [],
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    const user = userData ? JSON.parse(userData) : null
    const url = user ? `/api/analytics?userId=${user.id}` : "/api/analytics"
    fetch(url).then((r) => r.json()).then(setData)
  }, [])

  return (
    <main className="max-w-6xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-8">Analytics</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-semibold mb-3">Monthly Carbon (kg CO₂)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.monthlyCarbon}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="co2Kg" fill="#15803d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Weekly Waste Reports</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.weeklyWasteTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#15803d" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Most Active Users</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.mostActiveUsers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Bar dataKey="activityCount" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Top Waste Categories</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.topWasteCategories} dataKey="count" nameKey="category" outerRadius={90} label>
                {data.topWasteCategories.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="md:col-span-2">
          <h2 className="font-semibold mb-3">Community Participation (Events Joined)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.communityParticipation}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#166534" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  )
}