"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"

export default function EventsPage() {
  const { user, loading } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [joined, setJoined] = useState<string[]>([])
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then(setEvents)
  }, [])

  if (loading) return <Loading />

  const handleJoin = async (eventId: string) => {
    setMessage("")
    if (!user) {
      setMessage("Please login to join an event.")
      return
    }

    const res = await fetch("/api/events/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, userId: user.id }),
    })

    const data = await res.json()

    if (!res.ok) {
      setMessage(data.error)
      return
    }

    setJoined([...joined, eventId])
    setMessage("You've joined the event!")
  }

  const typeLabel: Record<string, string> = {
    tree_plantation: "🌳 Tree Plantation",
    cleanup_drive: "🧹 Cleanup Drive",
    campaign: "📢 Campaign",
  }

  return (
    <main className="max-w-3xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Community Events</h1>
      <p className="text-gray-600 mb-6">
        Join tree plantations, cleanup drives, and environmental campaigns near you.
      </p>

      {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

      <div className="flex flex-col gap-4">
        {events.map((e) => (
          <div key={e.id} className="border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-green-700">
                  {typeLabel[e.type] || e.type}
                </span>
                <h3 className="font-semibold text-lg mt-1">{e.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{e.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  📍 {e.location} &nbsp;•&nbsp; {new Date(e.eventDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleJoin(e.id)}
                disabled={joined.includes(e.id)}
                className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:bg-gray-400 text-sm shrink-0"
              >
                {joined.includes(e.id) ? "Joined" : "Join"}
              </button>
            </div>
          </div>
        ))}
        {events.length === 0 && <p className="text-gray-500">No events yet.</p>}
      </div>
    </main>
  )
}