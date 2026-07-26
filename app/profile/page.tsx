"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../../lib/useAuth"
import Loading from "../../components/Loading"

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    fetch(`/api/profile/${user.id}`)
      .then((res) => res.json())
      .then(setProfile)
  }, [user])

  if (loading || !profile) return <Loading />

  return (
    <main className="max-w-2xl mx-auto mt-16 p-6">
      <div className="border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-green-800">{profile.name}</h1>
        <p className="text-gray-500">{profile.email}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xl font-bold text-green-800">
              {profile.totalCarbonSaved.toFixed(2)} kg
            </p>
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
            <p className="text-xl font-bold text-green-800">
              {profile.wasteReportsSubmitted}
            </p>
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
    </main>
  )
}