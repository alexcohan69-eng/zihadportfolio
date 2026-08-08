'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { NavSidebar } from '@/components/nav-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { MobileTopbar } from '@/components/mobile-topbar'
import { Database, Rss, Settings2, LogOut, ChevronRight, Briefcase, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const SECTIONS = [
  {
    id: 'feed',
    label: 'Feed Posts',
    description: 'Posts, testimonials & projects',
    href: '/admin/feed',
    icon: Rss,
    accent: '#f4a295',
  },
  {
    id: 'services',
    label: 'Services',
    description: 'Manage offered services',
    href: '/admin/services',
    icon: Briefcase,
    accent: '#9db8e8',
  },
  {
    id: 'site-settings',
    label: 'Site Settings',
    description: 'Hero & about page media',
    href: '/admin/site-settings',
    icon: Settings2,
    accent: '#a8d5c2',
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Chat with clients about their orders',
    href: '/admin/messages',
    icon: MessageCircle,
    accent: '#f9cdc5',
  },
] as const

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut] = useState(false)

  const current = SECTIONS.find((s) => pathname.startsWith(s.href)) ?? SECTIONS[0]

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.replace('/')
    }
  }

  return (
    <div className="flex min-h-screen max-w-[990px] mx-auto w-full">
      <NavSidebar />

      <main className="flex-1 min-w-0 flex flex-col">
        <MobileTopbar />

        {/* Page header */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-5 py-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#f4a29520' }}
          >
            <Database size={18} style={{ color: '#f4a295' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base text-foreground leading-tight">Admin</h1>
            <p className="text-xs text-muted-foreground">Manage your portfolio content &amp; settings</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50 shrink-0"
            title="Log out"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">{loggingOut ? 'Logging out...' : 'Log out'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Left sub-nav — md+ */}
          <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border py-4 px-3 gap-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
              Sections
            </p>
            {SECTIONS.map(({ href, label, description, icon: Icon, accent }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-all',
                    isActive ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isActive ? accent + '25' : 'transparent' }}
                  >
                    <Icon size={16} style={{ color: isActive ? accent : 'var(--muted-foreground)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn('text-sm font-semibold leading-tight truncate')}
                      style={{ color: isActive ? accent : 'var(--muted-foreground)' }}
                    >
                      {label}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 leading-tight mt-0.5 truncate">
                      {description}
                    </p>
                  </div>
                  {isActive && (
                    <ChevronRight size={13} style={{ color: accent, flexShrink: 0 }} />
                  )}
                </Link>
              )
            })}
          </aside>

          {/* Mobile bottom tab strip */}
          <div className="md:hidden fixed bottom-16 left-0 right-0 z-20 flex bg-background/95 backdrop-blur border-t border-border px-2 py-1.5 gap-1">
            {SECTIONS.map(({ href, label, icon: Icon, accent }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all',
                    !isActive && 'opacity-60'
                  )}
                >
                  <Icon size={17} style={{ color: isActive ? accent : 'var(--muted-foreground)' }} />
                  <span className="text-[10px] font-semibold" style={{ color: isActive ? accent : 'var(--muted-foreground)' }}>
                    {label}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Content pane */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {/* Section heading strip */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b border-border"
              style={{ background: current.accent + '08' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: current.accent + '20' }}
              >
                <current.icon size={16} style={{ color: current.accent }} />
              </div>
              <div>
                <h2 className="font-bold text-sm text-foreground">{current.label}</h2>
                <p className="text-[11px] text-muted-foreground">{current.description}</p>
              </div>
            </div>

            <div className="p-5 max-w-3xl">
              {children}
            </div>

            <div className="h-28 md:h-8" />
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
