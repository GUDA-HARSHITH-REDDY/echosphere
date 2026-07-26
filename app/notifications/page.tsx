"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"

export default function NotificationsPage() {
  const { user, loading } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])

  const load = () => {
    if (!user) return
    fetch(`/api/notifications?userId=${user.id}`)
      .then((res) => res.json())
      .then(setNotifications)
  }

  useEffect(() => {
    load()
  }, [user])

  if (loading) return <Loading />

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" })
    load()
  }

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-6">Notifications</h1>

      <div className="flex flex-col gap-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`border rounded p-3 flex justify-between items-center ${
              n.read ? "bg-white" : "bg-green-50"
            }`}
          >
            <div>
              <p className="text-sm">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {!n.read && (
              <button
                onClick={() => markRead(n.id)}
                className="text-xs bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 shrink-0"
              >
                Mark read
              </button>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-gray-500 text-sm">No notifications yet.</p>
        )}
      </div>
    </main>
  )
}