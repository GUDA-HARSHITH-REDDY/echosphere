"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"

export default function HistoryPage() {
  const { user, loading } = useAuth()
  const [data, setData] = useState<any>({ items: [], totalPoints: 0 })
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    if (!user) return
    fetch(`/api/history?userId=${user.id}`)
      .then((r) => r.json())
      .then(setData)
  }, [user])

  if (loading) return <Loading />

  const typeColor: Record<string, string> = {
    carbon: "border-green-300 bg-green-50",
    waste: "border-yellow-300 bg-yellow-50",
    event: "border-blue-300 bg-blue-50",
    challenge: "border-purple-300 bg-purple-50",
  }

  const filtered = filter === "all" ? data.items : data.items.filter((i: any) => i.type === filter)

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-1">Your Activity History</h1>
      <p className="text-gray-600 mb-6">
        Everything you've done on EcoSphere — {data.totalPoints} total points earned.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "carbon", "waste", "event", "challenge"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`text-xs px-3 py-1 rounded-full border capitalize ${
              filter === t ? "bg-green-700 text-white border-green-700" : "bg-white text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((item: any, i: number) => (
          <div key={i} className={`border-l-4 rounded p-3 ${typeColor[item.type]}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-2">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  {item.detail && <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.date).toLocaleDateString()} at{" "}
                    {new Date(item.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-green-700 shrink-0">+{item.points} pts</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-500 text-sm">No activity yet — get started on the Dashboard!</p>
        )}
      </div>
    </main>
  )
}