"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"

export default function RewardsPage() {
  const { user, loading } = useAuth()
  const [data, setData] = useState<{ points: number; badges: any[] }>({ points: 0, badges: [] })
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!user) return
    fetch(`/api/rewards/${user.id}`).then((r) => r.json()).then(setData)
    fetch("/api/rewards/leaderboard").then((r) => r.json()).then(setLeaderboard)
  }, [user])

  if (loading) return <Loading />

  const redeem = async (badgeId: string) => {
    if (!user) return
    setMessage("")
    const res = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, badgeId }),
    })
    const result = await res.json()
    if (!res.ok) {
      setMessage(result.error)
      return
    }
    setMessage("Badge redeemed!")
    fetch(`/api/rewards/${user.id}`).then((r) => r.json()).then(setData)
  }

  return (
    <main className="max-w-3xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Rewards</h1>
      <p className="text-lg mb-6">
        Your Green Points: <span className="font-bold text-green-700">{data.points}</span>
      </p>

      {message && <p className="text-sm text-green-700 mb-4">{message}</p>}

      <h2 className="font-semibold mb-3">Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {data.badges.map((b) => (
          <div key={b.id} className={`border rounded-lg p-4 text-center ${b.earned ? "bg-green-50" : ""}`}>
            <div className="text-3xl">{b.icon}</div>
            <p className="font-semibold mt-1">{b.name}</p>
            <p className="text-xs text-gray-500">{b.description}</p>
            {b.earned ? (
              <p className="text-xs text-green-700 mt-2 font-semibold">Earned</p>
            ) : (
              <button
                onClick={() => redeem(b.id)}
                className="mt-2 text-xs bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800"
              >
                Redeem ({b.pointsCost} pts)
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-3">Leaderboard</h2>
      <div className="flex flex-col gap-2">
        {leaderboard.map((l, i) => (
          <div key={l.id} className="flex justify-between border-b py-2 text-sm">
            <span>#{i + 1} {l.userId === user?.id ? "(You)" : l.userId.slice(0, 8)}</span>
            <span className="font-semibold text-green-700">{l.points} pts</span>
          </div>
        ))}
      </div>
    </main>
  )
}