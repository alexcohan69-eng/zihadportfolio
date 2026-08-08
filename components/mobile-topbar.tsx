'use client'

import Link from 'next/link'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export function MobileTopbar() {
  const { theme, toggle } = useTheme()

  return (
    <header className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#f4a295' }}>
          <span className="font-mono font-bold text-xs text-white">ZI</span>
        </div>
        <span className="font-bold text-base tracking-tight">Zihad Imtiase</span>
      </Link>

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}
