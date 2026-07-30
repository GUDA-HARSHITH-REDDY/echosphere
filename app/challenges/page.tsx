"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"
import { AchievementToast } from "../../components/AchievementToast"

export default function ChallengesPage() {
  const { user, loading } = useAuth()
  const [challenges, setChallenges] = useState<any[]>([])
  const [message, setMessage] = useState("")
  const [toast, setToast] = useState<{ message: string; points: number } | null>(null)

  const load = () => {
    if (!user) return
    fetch(`/api/challenges?userId=${user.id}`)
      .then((r) => r.json())
      .then(setChallenges)
  }

  useEffect(() => {
    load()
  }, [user])

  if (loading) return <Loading />

  const join = async (challengeId: string) => {
    if (!user) return
    await fetch("/api/challenges/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, challengeId }),
    })
    load()
  }

  const complete = async (challenge: any) => {
    if (!user) return
    setMessage("")
    const res = await fetch("/api/challenges/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, challengeId: challenge.id }),
    })
    const data = await res.json()
    if (!res.ok) {
      setMessage(data.error)
      return
    }
    setMessage("Challenge completed — points awarded!")
    setToast({ message: `You completed "${challenge.title}"!`, points: challenge.pointsReward })
    load()
  }

  const statusBadge: Record<string, { label: string; color: string }> = {
    not_joined: { label: "Not Joined", color: "bg-gray-100 text-gray-600" },
    joined: { label: "In Progress", color: "bg-yellow-100 text-yellow-800" },
    completed: { label: "Completed", color: "bg-green-100 text-green-800" },
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

      <h1 className="text-2xl font-bold text-green-800 mb-2">Eco Challenges</h1>
      <p className="text-gray-600 mb-6">
        Complete challenges to earn bonus Green Points.
      </p>

      {message && <p className="text-sm text-green-700 mb-4">{message}</p>}

      <div className="flex flex-col gap-4">
        {challenges.map((c) => (
          <div key={c.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{c.description}</p>
                <p className="text-xs text-green-700 font-semibold mt-2">
                  🏆 {c.pointsReward} Green Points
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded shrink-0 ${statusBadge[c.status].color}`}>
                {statusBadge[c.status].label}
              </span>
            </div>

            <div className="mt-3">
              {c.status === "not_joined" && (
                <button
                  onClick={() => join(c.id)}
                  className="text-xs bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800"
                >
                  Join Challenge
                </button>
              )}
              {c.status === "joined" && (
                <button
                  onClick={() => complete(c)}
                  className="text-xs bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800"
                >
                  Mark as Complete
                </button>
              )}
            </div>
          </div>
        ))}
        {challenges.length === 0 && (
          <p className="text-gray-500 text-sm">No active challenges right now.</p>
        )}
      </div>
    </main>
  )
}