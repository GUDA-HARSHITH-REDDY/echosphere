"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const fillDemo = () => {
    setForm({ email: "test@example.com", password: "password123" })
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error || "Unable to sign in. Please check your credentials.")
        return
      }

      if (!data.token || !data.user) {
        setError("The login service returned an invalid response. Please try again.")
        return
      }

      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      router.push("/")
    } catch {
      setError("Could not reach the login service. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-md mx-auto mt-16 p-6 border rounded-lg shadow bg-white">
      <h1 className="text-2xl font-bold text-green-800 mb-2">Login to EcoSphere</h1>
      <p className="text-xs text-slate-500 mb-6">
        Sign in to report waste, access AI classifier, and track environmental offset.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            name="email"
            placeholder="test@example.com"
            value={form.email}
            onChange={handleChange}
            className="border p-2 rounded w-full text-sm focus:outline-emerald-600"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            placeholder="••••••••••••"
            value={form.password}
            onChange={handleChange}
            className="border p-2 rounded w-full text-sm focus:outline-emerald-600"
            required
          />
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="bg-green-700 text-white py-2.5 rounded font-medium text-sm hover:bg-green-800 transition-colors disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Login"}
        </button>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={fillDemo}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-medium underline"
          >
            Fill Demo Account (test@example.com)
          </button>
          <span className="text-xs text-slate-400">Default: password123</span>
        </div>
      </form>
    </main>
  )
}