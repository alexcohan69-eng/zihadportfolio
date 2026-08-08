'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail, Eye, EyeOff, ArrowRight, UserCircle } from 'lucide-react'

function ClientLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/client/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Login failed. Please try again.')
        return
      }
      router.replace(from)
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--background)' }}>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, #9db8e8 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}
      />
      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-3xl border border-border bg-card overflow-hidden" style={{ boxShadow: '0 0 0 1px #9db8e810, 0 24px 64px #00000040' }}>
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #9db8e8 0%, #6f8fd6 100%)' }} />
          <div className="px-8 pt-8 pb-10">
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#9db8e818', border: '1.5px solid #9db8e830' }}>
                <UserCircle size={26} style={{ color: '#9db8e8' }} />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Client Sign In</h1>
                <p className="text-sm text-muted-foreground mt-1">Access your dashboard &amp; orders</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                    onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px #9db8e830'; e.currentTarget.style.borderColor = '#9db8e8' }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                    onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px #9db8e830'; e.currentTarget.style.borderColor = '#9db8e8' }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '' }}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#e8534420', border: '1px solid #e8534430', color: '#f87171' }}>
                  <Lock size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email || !password}
                className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#9db8e8', color: '#1a1a1a' }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#6f8fd6' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#9db8e8' }}
              >
                {loading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Signing in...</>
                ) : (
                  <>Sign In<ArrowRight size={15} /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/client/register" className="font-semibold hover:underline" style={{ color: '#9db8e8' }}>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientLoginPage() {
  return (
    <Suspense>
      <ClientLoginForm />
    </Suspense>
  )
}
