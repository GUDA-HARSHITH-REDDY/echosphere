"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../../lib/useAuth"
import Loading from "../../../components/Loading"

export default function AgentLogPage() {
  const { user, loading } = useAuth()
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    fetch("/api/agent/logs", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then(setLogs)
  }, [user])

  if (loading) return <Loading />
  if (!user?.isAdmin) return <p className="text-center mt-24 text-gray-500">Admin access required.</p>

  const actionIcon: Record<string, string> = {
    classify_report: "🏷️",
    propose_event: "🌳",
  }

  return (
    <main className="max-w-3xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">EcoAgent Activity Log</h1>
      <p className="text-gray-500 mb-6">
        Autonomous decisions made by EcoAgent — classifications and proposed events.
      </p>

      <div className="flex flex-col gap-3">
        {logs.map((log) => (
          <div key={log.id} className="border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">{actionIcon[log.action] || "🤖"}</span>
              <span className="font-semibold text-sm capitalize">{log.action.replace("_", " ")}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm mt-2"><strong>Input:</strong> {log.input}</p>
            <p className="text-sm"><strong>Decision:</strong> {log.decision}</p>
            <p className="text-xs text-gray-500 mt-1 italic">"{log.reasoning}"</p>
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-500 text-sm">No agent activity yet.</p>}
      </div>
    </main>
  )
}