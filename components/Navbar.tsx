"use client"

import Link from "next/link"

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-green-700 text-white">
      <Link href="/" className="text-xl font-bold">
        🌱 EcoSphere
      </Link>
      <div className="flex gap-4 text-sm">
        <Link href="/carbon">Carbon Tracker</Link>
        <Link href="/waste">Report Waste</Link>
        <Link href="/recycling">Recycling Centers</Link>
        <Link href="/alerts">Alerts</Link>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
        <Link href="/events">Community Events</Link>
        <Link href="/notifications">Notifications</Link>
      </div>
    </nav>
  )
}