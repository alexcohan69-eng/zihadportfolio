'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  User,
  Briefcase,
  Sparkles,
  Mail,
  MessageCircle,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStatus } from '@/hooks/use-admin-status'

const PUBLIC_NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '/about', icon: User },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Services', href: '/services', icon: Sparkles },
  { label: 'Contact', href: '/contact', icon: Mail },
]

export function NavSidebar() {
  const pathname = usePathname()
  const isAdmin = useAdminStatus()

  // Hydration mismatch ফিক্স করার জন্য mounted স্টেট
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // সার্ভার এবং ক্লায়েন্ট প্রথমবার শুধুমাত্র PUBLIC_NAV দেখবে
  // মাউন্ট হওয়ার পর যদি isAdmin ট্রু হয়, তবেই Admin লিংকটি যোগ হবে
  const navItems = mounted && isAdmin
    ? [...PUBLIC_NAV, { label: 'Admin', href: '/admin', icon: Database }]
    : PUBLIC_NAV

  return (
    <>
      {/* ── Desktop left sidebar ──────────────────────────── */}
      <aside className="hidden md:flex flex-col justify-between w-64 min-h-screen sticky top-0 border-r border-border px-4 py-6 shrink-0">
        {/* Logo */}
        <div>
          <Link href="/" className="flex items-center gap-2 mb-8 group">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shrink-0">
              <span className="font-mono font-bold text-sm text-white">ZI</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground group-hover:text-brand transition-colors">
              Zihad Imtiase
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex flex-col gap-1">
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
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    active
                      ? 'bg-brand/10 text-brand'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon
                    size={18}
                    className={cn(active ? 'text-brand' : 'text-current')}
                  />
                  {label}
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* CTA */}
          <div className="mt-6">
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              <MessageCircle size={16} />
              Hire Me
            </Link>
          </div>
        </div>
      </aside>
    </>
  )
}
