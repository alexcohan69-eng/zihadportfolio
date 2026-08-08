'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center max-w-sm gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f4a29520' }}
        >
          <AlertTriangle size={28} style={{ color: '#f4a295' }} />
        </div>

        <div className="space-y-2">
          <h1 className="font-bold text-xl text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            An unexpected error occurred. This has been noted. Try refreshing the
            page — if the problem persists, come back shortly.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/50 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 w-full">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold border border-border hover:bg-muted transition-colors"
          >
            <RotateCcw size={14} />
            Try again
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
