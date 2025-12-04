// @ts-nocheck
"use client"

export default function HomePage() {
  // Middleware handles all redirects for this route
  // This component should never actually render
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
