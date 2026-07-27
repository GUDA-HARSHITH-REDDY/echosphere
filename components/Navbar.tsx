"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/carbon", label: "Carbon Footprint Calculator" },
  { href: "/events", label: "Community Events" },
  { href: "/waste", label: "Report Waste" },
  { href: "/recycling", label: "Recycling Centers" },
  { href: "/alerts", label: "Environmental Alerts" },
  { href: "/rewards", label: "Rewards" },
  { href: "/analytics", label: "Analytics" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Profile" },
  { href: "/status", label: "Status" },
]

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) setUser(JSON.parse(userData))
  }, [])

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

        {/* Desktop links */}
        <div className="hidden lg:flex gap-4 text-sm items-center flex-wrap">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          {user?.isAdmin && <Link href="/admin">Admin</Link>}
          {user ? (
            <>
              <span className="text-green-100 text-xs">Hi, {user.name?.split(" ")[0]}</span>
              <button
                onClick={handleLogout}
                className="bg-white text-green-800 px-3 py-1 rounded text-xs font-semibold hover:bg-green-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          className="lg:hidden text-2xl"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden flex flex-col gap-3 px-6 pb-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}
          {user?.isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
          )}
          {user ? (
            <>
              <span className="text-green-100 text-xs">Hi, {user.name?.split(" ")[0]}</span>
              <button
                onClick={handleLogout}
                className="bg-white text-green-800 px-3 py-2 rounded text-xs font-semibold hover:bg-green-50 self-start"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}