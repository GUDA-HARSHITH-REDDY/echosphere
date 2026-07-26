"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex-1 flex items-center justify-center py-24">
      <div className="text-center">
        <p className="text-6xl mb-4">⚠️</p>
        <h1 className="text-2xl font-bold text-green-800 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-6">
          An unexpected error occurred. You can try again below.
        </p>
        <button
          onClick={reset}
          className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-800"
        >
          Try Again
        </button>
      </div>
    </main>
  )
}