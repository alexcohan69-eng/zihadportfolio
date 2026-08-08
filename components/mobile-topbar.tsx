'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sun, Moon, LogOut, LayoutDashboard } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useAdminStatus } from '@/hooks/use-admin-status'
import { useClientSession } from '@/hooks/use-client-session'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function MobileTopbar() {
  const { theme, toggle } = useTheme()
  const router = useRouter()
  const isAdmin = useAdminStatus()
  const { user: clientUser } = useClientSession()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleLogout() {
    if (isAdmin) {
      await fetch('/api/auth/logout', { method: 'POST' })
    } else {
      await fetch('/api/auth/client/logout', { method: 'POST' })
    }
    window.location.href = '/'
  }

  const isAuthed = mounted && (isAdmin || clientUser)

  return (
    <header className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
      {isAuthed ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 outline-none" aria-label="Account menu">
            <Avatar className="w-8 h-8 border-2 border-brand shrink-0">
              <AvatarImage src={clientUser?.avatar} alt={clientUser?.name ?? 'Admin'} />
              <AvatarFallback className="bg-brand/20 text-brand text-xs font-bold">
                {isAdmin ? 'AD' : clientUser!.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-bold text-base tracking-tight">
              {isAdmin ? 'Admin' : clientUser!.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-56">
            <DropdownMenuLabel className="truncate">
              {isAdmin ? 'Admin' : clientUser!.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin ? (
              <DropdownMenuItem onClick={() => router.push('/admin')}>
                <LayoutDashboard size={16} />
                Admin Dashboard
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => router.push('/client/dashboard')}>
                <LayoutDashboard size={16} />
                Client Dashboard
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut size={16} />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#f4a295' }}>
            <span className="font-mono font-bold text-xs text-white">ZI</span>
          </div>
          <span className="font-bold text-base tracking-tight">Zihad Imtiase</span>
        </Link>
      )}

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
