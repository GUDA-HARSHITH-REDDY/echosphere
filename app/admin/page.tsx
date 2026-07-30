"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"
import Link from "next/link"

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [wasteReports, setWasteReports] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [tab, setTab] = useState<"users" | "waste" | "events" | "rewards">("users")
  const [message, setMessage] = useState("")

  const [newAlert, setNewAlert] = useState({ type: "flood", message: "", region: "", severity: "moderate" })
  const [newEvent, setNewEvent] = useState({ title: "", description: "", type: "tree_plantation", location: "", eventDate: "" })
  const [newBadge, setNewBadge] = useState({ name: "", description: "", icon: "", pointsCost: 0 })
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null)

  const authHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  })

  const loadAll = () => {
    fetch("/api/admin/users", { headers: authHeader() }).then((r) => r.json()).then(setUsers)
    fetch("/api/waste").then((r) => r.json()).then(setWasteReports)
    fetch("/api/events").then((r) => r.json()).then(setEvents)
    fetch("/api/badges").then((r) => r.json()).then(setBadges)
  }

  useEffect(() => {
    if (user) loadAll()
  }, [user])

  if (loading) return <Loading />
  if (!user) return null
  if (!user.isAdmin) {
    return (
      <main className="max-w-xl mx-auto mt-24 p-6 text-center">
        <p className="text-gray-500">You don't have admin access.</p>
      </main>
    )
  }

  const resolveReport = async (id: string) => {
    await fetch(`/api/admin/waste/${id}`, { method: "PATCH", headers: authHeader() })
    loadAll()
  }

  const deleteEvent = async (id: string) => {
    await fetch(`/api/events/${id}`, { method: "DELETE", headers: authHeader() })
    loadAll()
  }

  const submitAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    const res = await fetch("/api/alerts", { method: "POST", headers: authHeader(), body: JSON.stringify(newAlert) })
    if (!res.ok) {
      setMessage("Failed to create alert")
      return
    }
    setMessage("Alert posted!")
    setNewAlert({ type: "flood", message: "", region: "", severity: "moderate" })
  }

  const submitEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    const res = await fetch("/api/events", { method: "POST", headers: authHeader(), body: JSON.stringify(newEvent) })
    if (!res.ok) {
      setMessage("Failed to create event")
      return
    }
    setMessage("Event created!")
    setNewEvent({ title: "", description: "", type: "tree_plantation", location: "", eventDate: "" })
    loadAll()
  }

  const submitBadge = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")

    if (editingBadgeId) {
      const res = await fetch(`/api/badges/${editingBadgeId}`, {
        method: "PUT",
        headers: authHeader(),
        body: JSON.stringify(newBadge),
      })
      if (!res.ok) {
        setMessage("Failed to update badge")
        return
      }
      setMessage("Badge updated!")
      setEditingBadgeId(null)
    } else {
      const res = await fetch("/api/badges", {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify(newBadge),
      })
      if (!res.ok) {
        setMessage("Failed to create badge")
        return
      }
      setMessage("Badge created!")
    }

    setNewBadge({ name: "", description: "", icon: "", pointsCost: 0 })
    loadAll()
  }

  const startEditBadge = (b: any) => {
    setEditingBadgeId(b.id)
    setNewBadge({ name: b.name, description: b.description, icon: b.icon, pointsCost: b.pointsCost })
  }

  const cancelEditBadge = () => {
    setEditingBadgeId(null)
    setNewBadge({ name: "", description: "", icon: "", pointsCost: 0 })
  }

  const deleteBadge = async (id: string) => {
    await fetch(`/api/badges/${id}`, { method: "DELETE", headers: authHeader() })
    loadAll()
  }

  return (
    <main className="max-w-4xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Admin Dashboard</h1>
      <p className="text-gray-500 mb-6">
        Manage users, waste reports, events, and alerts. See full{" "}
        <Link href="/analytics" className="text-green-700 underline">Analytics</Link>.
      </p>

      {message && <p className="text-sm text-green-700 mb-4">{message}</p>}

      <div className="flex gap-4 mb-6 border-b">
        {(["users", "waste", "events", "rewards"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm capitalize ${tab === t ? "border-b-2 border-green-700 font-semibold text-green-800" : "text-gray-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="border rounded p-3 flex justify-between items-center text-sm">
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-gray-500">{u.email}</p>
              </div>
              {u.isAdmin && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Admin</span>}
            </div>
          ))}
        </div>
      )}

      {tab === "waste" && (
        <div className="flex flex-col gap-2">
          {wasteReports.map((r) => (
            <div key={r.id} className="border rounded p-3 flex justify-between items-start text-sm">
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-gray-500">{r.description}</p>
                <p className="text-xs text-gray-400 mt-1">{r.category} • {r.status}</p>
              </div>
              {r.status !== "resolved" && (
                <button
                  onClick={() => resolveReport(r.id)}
                  className="text-xs bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 shrink-0"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "events" && (
        <div>
          <form onSubmit={submitEvent} className="border rounded p-4 mb-6 flex flex-col gap-3">
            <h3 className="font-semibold text-sm">Create Event</h3>
            <input
              placeholder="Title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="border p-2 rounded text-sm"
              required
            />
            <textarea
              placeholder="Description"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              className="border p-2 rounded text-sm"
              required
            />
            <div className="flex gap-3">
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                className="border p-2 rounded text-sm flex-1"
              >
                <option value="tree_plantation">Tree Plantation</option>
                <option value="cleanup_drive">Cleanup Drive</option>
                <option value="campaign">Campaign</option>
              </select>
              <input
                placeholder="Location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="border p-2 rounded text-sm flex-1"
                required
              />
              <input
                type="date"
                value={newEvent.eventDate}
                onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                className="border p-2 rounded text-sm"
                required
              />
            </div>
            <button type="submit" className="bg-green-700 text-white py-2 rounded text-sm hover:bg-green-800">
              Create Event
            </button>
          </form>

          <div className="flex flex-col gap-2">
            {events.map((e) => (
              <div key={e.id} className="border rounded p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-gray-500">{e.location} • {new Date(e.eventDate).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => deleteEvent(e.id)}
                  className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "rewards" && (
        <div>
          <form onSubmit={submitBadge} className="border rounded p-4 mb-6 flex flex-col gap-3">
            <h3 className="font-semibold text-sm">
              {editingBadgeId ? "Edit Badge" : "Create Badge"}
            </h3>
            <div className="flex gap-3">
              <input
                placeholder="Name"
                value={newBadge.name}
                onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                className="border p-2 rounded text-sm flex-1"
                required
              />
              <input
                placeholder="Icon (emoji)"
                value={newBadge.icon}
                onChange={(e) => setNewBadge({ ...newBadge, icon: e.target.value })}
                className="border p-2 rounded text-sm w-24"
                required
              />
            </div>
            <input
              placeholder="Description"
              value={newBadge.description}
              onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
              className="border p-2 rounded text-sm"
              required
            />
            <input
              type="number"
              placeholder="Points Cost"
              value={newBadge.pointsCost}
              onChange={(e) => setNewBadge({ ...newBadge, pointsCost: parseInt(e.target.value) || 0 })}
              className="border p-2 rounded text-sm w-32"
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-green-700 text-white py-2 px-4 rounded text-sm hover:bg-green-800">
                {editingBadgeId ? "Save Changes" : "Create Badge"}
              </button>
              {editingBadgeId && (
                <button
                  type="button"
                  onClick={cancelEditBadge}
                  className="bg-gray-200 text-gray-700 py-2 px-4 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="flex flex-col gap-2">
            {badges.map((b) => (
              <div key={b.id} className="border rounded p-3 flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-gray-500 text-xs">{b.description} • {b.pointsCost} pts</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEditBadge(b)}
                    className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded hover:bg-green-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBadge(b.id)}
                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {badges.length === 0 && <p className="text-gray-500 text-sm">No badges yet.</p>}
          </div>
        </div>
      )}

      <div className="mt-10 border-t pt-6">
        <h3 className="font-semibold text-sm mb-3">Post Environmental Alert</h3>
        <form onSubmit={submitAlert} className="flex flex-col gap-3 max-w-md">
          <select
            value={newAlert.type}
            onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })}
            className="border p-2 rounded text-sm"
          >
            <option value="flood">Flood</option>
            <option value="air_quality">Air Quality</option>
            <option value="heatwave">Heatwave</option>
          </select>
          <textarea
            placeholder="Message"
            value={newAlert.message}
            onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
            className="border p-2 rounded text-sm"
            required
          />
          <input
            placeholder="Region"
            value={newAlert.region}
            onChange={(e) => setNewAlert({ ...newAlert, region: e.target.value })}
            className="border p-2 rounded text-sm"
            required
          />
          <select
            value={newAlert.severity}
            onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
            className="border p-2 rounded text-sm"
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="bg-green-700 text-white py-2 rounded text-sm hover:bg-green-800">
            Post Alert
          </button>
        </form>
      </div>
    </main>
  )
}