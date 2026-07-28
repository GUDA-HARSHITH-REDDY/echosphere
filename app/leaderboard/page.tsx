"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/rewards/leaderboard").then((r) => r.json()).then(setLeaderboard)
  }, [])

  const medals = ["🥇", "🥈", "🥉"]

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Top Eco Champions</h1>
      <p className="text-gray-600 mb-6">Ranked by Green Points earned.</p>

      <div className="flex flex-col gap-2">
        {leaderboard.map((l, i) => (
          <div
            key={l.userId}
            className={`flex justify-between items-center p-3 rounded-lg border ${
              l.userId === user?.id ? "bg-green-50 border-green-300" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg w-8">{medals[i] || `#${i + 1}`}</span>
              <span className="font-medium">
                {l.name} {l.userId === user?.id && "(You)"}
              </span>
            </div>
            <span className="font-semibold text-green-700">{l.points} pts</span>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <p className="text-gray-500 text-sm">No points earned yet — be the first!</p>
        )}
      </div>
    </main>
  )
}