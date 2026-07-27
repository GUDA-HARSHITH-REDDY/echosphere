"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import { uploadImage } from "../../lib/uploadImage"
import Loading from "../../components/Loading"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" })
  const [pwMessage, setPwMessage] = useState("")

  const loadProfile = () => {
    if (!user) return
    fetch(`/api/profile/${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProfile(data)
        setName(data.name || "")
      })
  }

  useEffect(() => {
    loadProfile()
  }, [user])

  if (loading || !profile) return <Loading />

  const handleSaveName = async () => {
    setMessage("")
    const res = await fetch("/api/profile/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, name }),
    })
    if (!res.ok) {
      setMessage("Failed to update name")
      return
    }
    setMessage("Profile updated!")
    setEditing(false)
    loadProfile()
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      const url = await uploadImage(file)
      await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, profileImageUrl: url }),
      })
      loadProfile()
    } catch {
      setMessage("Photo upload failed")
    }
    setUploading(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMessage("")

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setPwMessage(data.error)
      return
    }
    setPwMessage("Password changed successfully!")
    setPwForm({ currentPassword: "", newPassword: "" })
  }

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <div className="border rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={profile.profileImageUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + profile.name}
              alt="profile"
              className="h-16 w-16 rounded-full object-cover border"
            />
            <label className="absolute -bottom-1 -right-1 bg-green-700 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center cursor-pointer">
              📷
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </div>
          <div>
            {editing ? (
              <div className="flex gap-2 items-center">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border p-1 rounded text-sm"
                />
                <button onClick={handleSaveName} className="text-xs bg-green-700 text-white px-2 py-1 rounded">
                  Save
                </button>
              </div>
            ) : (
              <h1
                className="text-2xl font-bold text-green-800 cursor-pointer"
                onClick={() => setEditing(true)}
                title="Click to edit"
              >
                {profile.name} ✏️
              </h1>
            )}
            <p className="text-gray-500">{profile.email}</p>
          </div>
        </div>

        {uploading && <p className="text-xs text-gray-500 mt-2">Uploading photo...</p>}
        {message && <p className="text-xs text-green-700 mt-2">{message}</p>}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xl font-bold text-green-800">{profile.totalCarbonSaved.toFixed(2)} kg</p>
            <p className="text-xs text-gray-500 mt-1">Carbon Saved</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xl font-bold text-green-800">{profile.greenPoints}</p>
            <p className="text-xs text-gray-500 mt-1">Green Points</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xl font-bold text-green-800">{profile.eventsJoined}</p>
            <p className="text-xs text-gray-500 mt-1">Events Joined</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xl font-bold text-green-800">{profile.wasteReportsSubmitted}</p>
            <p className="text-xs text-gray-500 mt-1">Waste Reports</p>
          </div>
        </div>

        <h2 className="font-semibold mt-8 mb-3">Badges Earned</h2>
        {profile.badges.length === 0 ? (
          <p className="text-sm text-gray-500">No badges earned yet.</p>
        ) : (
          <div className="flex gap-4 flex-wrap">
            {profile.badges.map((b: any) => (
              <div key={b.id} className="text-center">
                <div className="text-3xl">{b.icon}</div>
                <p className="text-xs mt-1">{b.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border rounded-lg p-6 shadow-sm">
        <h2 className="font-semibold mb-3">Change Password</h2>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-sm">
          <input
            type="password"
            placeholder="Current password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            className="border p-2 rounded"
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            className="border p-2 rounded"
            required
          />
          {pwMessage && <p className="text-xs text-green-700">{pwMessage}</p>}
          <button type="submit" className="bg-green-700 text-white py-2 rounded hover:bg-green-800 text-sm">
            Change Password
          </button>
        </form>
      </div>
    </main>
  )
}