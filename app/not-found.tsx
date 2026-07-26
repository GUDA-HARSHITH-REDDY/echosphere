import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center py-24">
      <div className="text-center">
        <p className="text-6xl mb-4">🌱</p>
        <h1 className="text-2xl font-bold text-green-800 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">
          This page doesn't exist — maybe it wandered off to compost.
        </p>
        <Link
          href="/"
          className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-800"
        >
          Back to Home
        </Link>
      </div>
    </main>
  )
}