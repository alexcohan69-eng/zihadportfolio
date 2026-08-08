'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/admin'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--background)' }}
    >
      {/* Background dot texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #f4a295 1.5px, transparent 1.5px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div
          className="rounded-3xl border border-border bg-card overflow-hidden"
          style={{ boxShadow: '0 0 0 1px #f4a29510, 0 24px 64px #00000040' }}
        >
          {/* Top accent strip */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(90deg, #f4a295 0%, #e8806f 100%)' }}
          />

          <div className="px-8 pt-8 pb-10">
            {/* Icon + title */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#f4a29518', border: '1.5px solid #f4a29530' }}
              >
                <ShieldCheck size={26} style={{ color: '#f4a295' }} />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Admin Access
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Sign in to manage your portfolio
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none transition-all"
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 3px #f4a29530'
                      e.currentTarget.style.borderColor = '#f4a295'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = ''
                      e.currentTarget.style.borderColor = ''
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Password
                </label>
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
                    onFocus={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 0 3px #f4a29530'
                      e.currentTarget.style.borderColor = '#f4a295'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.boxShadow = ''
                      e.currentTarget.style.borderColor = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: '#e8534420',
                    border: '1px solid #e8534430',
                    color: '#f87171',
                  }}
                >
                  <Lock size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password}
                className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#e8806f' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f4a295' }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-6">
          Protected admin area &mdash; Nextzd Portfolio
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
