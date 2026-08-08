'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, User, Briefcase, Sparkles, Mail, Database, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStatus } from '@/hooks/use-admin-status'
import { useClientSession } from '@/hooks/use-client-session'

const PUBLIC_NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '/about', icon: User },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Services', href: '/services', icon: Sparkles },
  { label: 'Contact', href: '/contact', icon: Mail },
]

export function MobileNav() {
  const pathname = usePathname()
  const isAdmin = useAdminStatus()
  const { user: clientUser } = useClientSession()

  // Hydration mismatch ফিক্স করার জন্য mounted স্টেট
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleClientLogout() {
    await fetch('/api/auth/client/logout', { method: 'POST' })
    window.location.href = '/'
  }

  // সার্ভার এবং ক্লায়েন্ট প্রথমবার শুধুমাত্র PUBLIC_NAV দেখবে
  // মাউন্ট হওয়ার পর যদি isAdmin ট্রু হয়, তবেই Admin লিংকটি যোগ হবে
  const navItems = mounted && isAdmin
    ? [...PUBLIC_NAV, { label: 'Admin', href: '/admin', icon: Database }]
    : PUBLIC_NAV

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t border-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            href === '/'
              ? pathname === '/'
              : href === '/admin'
              ? pathname.startsWith('/admin')
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all',
                active ? 'text-brand' : 'text-muted-foreground hover:text-foreground'
              )}
              style={active ? { color: '#f4a295' } : {}}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        {mounted && clientUser && (
          <button
            onClick={handleClientLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-all"
            aria-label="Log out"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        )}
      </div>
    </nav>
  )
}
