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
        setError(data.error || "Unable to sign in. Please try again.")
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
    <main className="max-w-md mx-auto mt-16 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold text-green-800 mb-6">Login to EcoSphere</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="border p-2 rounded"
          required
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="bg-green-700 text-white py-2 rounded hover:bg-green-800"
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  )
}