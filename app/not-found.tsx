import Link from 'next/link'
import { Search } from 'lucide-react'

export const metadata = {
  title: '404 — Page not found',
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center text-center max-w-sm gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#f4a29520' }}
        >
          <Search size={28} style={{ color: '#f4a295' }} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#f4a295' }}>
            404
          </p>
          <h1 className="font-bold text-xl text-foreground">Page not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This page does not exist or has been moved. Head back home to
            find what you are looking for.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full">
          <Link
            href="/portfolio"
            className="flex-1 flex items-center justify-center py-2.5 rounded-full text-sm font-semibold border border-border hover:bg-muted transition-colors"
          >
            Portfolio
          </Link>
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
