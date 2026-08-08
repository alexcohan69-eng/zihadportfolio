'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, User, Briefcase, Sparkles, Mail, Database, LogOut, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
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

const PUBLIC_NAV = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'About', href: '/about', icon: User },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Services', href: '/services', icon: Sparkles },
  { label: 'Contact', href: '/contact', icon: Mail },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = useAdminStatus()
  const { user: clientUser } = useClientSession()

  // Hydration mismatch ফিক্স করার জন্য mounted স্টেট
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
        {mounted && (isAdmin || clientUser) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-all outline-none"
              aria-label="Account menu"
            >
              <Avatar className="w-5 h-5 border border-border">
                <AvatarImage src={clientUser?.avatar} alt={clientUser?.name ?? 'Admin'} />
                <AvatarFallback className="bg-brand/20 text-brand text-[9px] font-bold">
                  {isAdmin ? 'AD' : clientUser!.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium">Account</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 mb-2">
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
        )}
      </div>
    </nav>
  )
}
