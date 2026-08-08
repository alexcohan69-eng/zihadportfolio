'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  User,
  Briefcase,
  Sparkles,
  Mail,
  Sun,
  Moon,
  MessageCircle,
  Database,
  LogOut,
  LayoutDashboard,
} from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
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

export function NavSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const isAdmin = useAdminStatus()
  const { user: clientUser } = useClientSession()

  async function handleLogout() {
    if (isAdmin) {
      await fetch('/api/auth/logout', { method: 'POST' })
    } else {
      await fetch('/api/auth/client/logout', { method: 'POST' })
    }
    window.location.href = '/'
  }

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

  // Hydration ফিক্স: theme আইকন যাতে সার্ভার-ক্লায়েন্ট মিসম্যাচ না করে
  // মাউন্ট না হওয়া পর্যন্ত ডিফল্ট কোনো আইকন বা স্পেস দেখাতে পারেন। 
  // এখানে আমরা মাউন্ট হওয়ার আগ পর্যন্ত Moon দেখাচ্ছি সার্ভারের জন্য।
  const ThemeIcon = mounted && theme === 'dark' ? Sun : Moon
  const themeText = mounted && theme === 'dark' ? 'Light mode' : 'Dark mode'

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

        {/* Bottom: theme toggle + small profile */}
        <div className="flex flex-col gap-3">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all w-full"
          >
            {/* Theme 아이কন এবং টেক্সট */}
            <ThemeIcon size={18} />
            {themeText}
          </button>

          {mounted && (isAdmin || clientUser) ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-all w-full text-left outline-none">
                <Avatar className="w-8 h-8 border-2 border-brand shrink-0">
                  <AvatarImage src={clientUser?.avatar} alt={clientUser?.name ?? 'Admin'} />
                  <AvatarFallback className="bg-brand/20 text-brand text-xs font-bold">
                    {isAdmin ? 'AD' : clientUser!.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {isAdmin ? 'Admin' : clientUser!.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {isAdmin ? 'Administrator' : 'Client'}
                  </p>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
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
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-all cursor-default">
              <Avatar className="w-8 h-8 border-2 border-brand shrink-0">
                <AvatarImage src="/icon.svg" alt="Guest" />
                <AvatarFallback className="bg-brand/20 text-brand text-xs font-bold">
                  <Image src="/icon.svg" alt="" width={16} height={16} />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">Guest</p>
                <p className="text-xs text-muted-foreground truncate">Not signed in</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
