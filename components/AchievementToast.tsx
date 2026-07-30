"use client"

import { useEffect, useState } from "react"

export function AchievementToast({
  message,
  points,
  onClose,
}: {
  message: string
  points: number
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-6 right-6 z-50 bg-white border-2 border-green-400 rounded-xl shadow-2xl p-4 w-72 animate-bounce-in">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🎉</span>
        <div>
          <p className="font-bold text-green-800">Congratulations!</p>
          <p className="text-sm text-gray-600">{message}</p>
          <p className="text-sm font-semibold text-green-700 mt-1">+{points} Green Points</p>
        </div>
      </div>
    </div>
  )
}