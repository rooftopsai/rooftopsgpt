"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function WorkspaceError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">
        Something went wrong
      </h2>
      <p className="mb-6 max-w-md text-gray-600">
        We hit an unexpected error. Our team has been notified and is looking
        into it.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-600"
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}
