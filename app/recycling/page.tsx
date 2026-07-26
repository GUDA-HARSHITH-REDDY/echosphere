"use client"

import { useEffect, useState } from "react"

export default function RecyclingPage() {
  const [centers, setCenters] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/recycling")
      .then((res) => res.json())
      .then(setCenters)
  }, [])

  const typeIcon: Record<string, string> = {
    plastic: "♻️",
    "e-waste": "🔌",
    paper: "📄",
  }

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Recycling Centers</h1>
      <p className="text-gray-600 mb-6">Find nearby recycling centers by material type.</p>

      <div className="flex flex-col gap-3">
        {centers.map((c) => (
          <div key={c.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  {typeIcon[c.type] || "♻️"} {c.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{c.address}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded capitalize">
                {c.type}
              </span>
            </div>
          </div>
        ))}
        {centers.length === 0 && (
          <p className="text-gray-500 text-sm">No recycling centers listed yet.</p>
        )}
      </div>
    </main>
  )
}