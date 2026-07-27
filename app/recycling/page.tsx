"use client"

import { useEffect, useState } from "react"

export default function RecyclingPage() {
  const [centers, setCenters] = useState<any[]>([])
  const [filters, setFilters] = useState({ search: "", city: "", type: "" })

  const loadCenters = () => {
    const params = new URLSearchParams()
    if (filters.search) params.set("search", filters.search)
    if (filters.city) params.set("city", filters.city)
    if (filters.type) params.set("type", filters.type)

    fetch(`/api/recycling?${params.toString()}`)
      .then((res) => res.json())
      .then(setCenters)
  }

  useEffect(() => {
    loadCenters()
  }, [filters])

  const typeIcon: Record<string, string> = {
    plastic: "♻️",
    "e-waste": "🔌",
    paper: "📄",
  }

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Recycling Centers</h1>
      <p className="text-gray-600 mb-6">Find nearby recycling centers by material type.</p>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="border p-2 rounded text-sm flex-1 min-w-[150px]"
        />
        <input
          type="text"
          placeholder="City..."
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          className="border p-2 rounded text-sm w-32"
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="border p-2 rounded text-sm"
        >
          <option value="">All Types</option>
          <option value="plastic">Plastic</option>
          <option value="e-waste">E-waste</option>
          <option value="paper">Paper</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        {centers.map((c) => (
          <div key={c.id} className="border rounded p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">
                  {typeIcon[c.type] || "♻️"} {c.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{c.address}</p>
                {c.city && <p className="text-xs text-gray-400 mt-1">📍 {c.city}</p>}
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded capitalize">
                {c.type}
              </span>
            </div>
          </div>
        ))}
        {centers.length === 0 && (
          <p className="text-gray-500 text-sm">No recycling centers found.</p>
        )}
      </div>
    </main>
  )
}