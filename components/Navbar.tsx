"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

const userLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/carbon", label: "Carbon Footprint Calculator" },
  { href: "/waste", label: "Report Waste" },
  { href: "/events", label: "Community Events" },
  { href: "/challenges", label: "Eco Challenges" },
  { href: "/rewards", label: "Rewards" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/recycling", label: "Recycling Centers" },
  { href: "/alerts", label: "Environmental Alerts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Profile" },
  { href: "/status", label: "Status" },
  { href: "/history", label: "My History" }
]

const adminLinks = [
  { href: "/admin", label: "Manage Users & Reports" },
  { href: "/analytics", label: "Analytics" },
  { href: "/profile", label: "Profile" },
]

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) setUser(JSON.parse(userData))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const links = user?.isAdmin ? adminLinks : userLinks

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setUser(null)
    setMenuOpen(false)
    router.push("/")
  }

  return (
    <nav className="bg-green-700 text-white relative">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold" onClick={() => setMenuOpen(false)}>
          🌱 EcoSphere
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <span className="text-green-100 text-sm hidden sm:inline">
              Hi, {user.name?.split(" ")[0]}
            </span>
          ) : (
            <div className="flex gap-3 text-sm">
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </div>
          )}

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 bg-green-800 hover:bg-green-900 px-4 py-2 rounded-lg text-sm"
            >
              Menu {menuOpen ? "▲" : "▼"}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-gray-800 rounded-lg shadow-xl border overflow-hidden z-50">
                <div className="flex flex-col py-2">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2 text-sm hover:bg-green-50"
                    >
                      {l.label}
                    </Link>
                  ))}
                  {user && (
                    <button
                      onClick={handleLogout}
                      className="text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 border-t mt-1 pt-2"
                    >
                      Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}