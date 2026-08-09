'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail, Eye, EyeOff, ArrowRight, UserCircle, Loader2, AlertCircle } from 'lucide-react'
import { loginSchema } from '@/lib/validation/auth'
import { SocialAuthButtons, OrDivider } from '@/components/auth/social-auth-buttons'
import { ToastStack } from '@/components/admin/shared'
import { useToast } from '@/hooks/use-toast'

type FieldErrors = Partial<Record<'email' | 'password', string>>

function ClientLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') ?? '/client/dashboard'
  const { toasts, addToast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthActive, setOauthActive] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const disabled = loading || oauthActive

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setFieldErrors({})

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const errors: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors
        if (key && !errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? 'Login failed. Please try again.')
        addToast(data.error ?? 'Login failed. Please try again.', false)
        return
      }
      addToast('Welcome back! Redirecting…')
      router.replace(from)
    } catch {
      setFormError('Network error. Please check your connection.')
      addToast('Network error. Please check your connection.', false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <ToastStack toasts={toasts} />

      {/* Native brand-tinted dot texture, matching the admin login treatment */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, var(--color-brand) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-[0_0_0_1px_var(--color-brand-muted)_,0_24px_64px_-24px_oklch(0_0_0/0.4)]">
          <div className="h-1 w-full bg-gradient-to-r from-brand to-[color:var(--color-brand-deep)]" />

          <div className="px-8 pt-8 pb-10">
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand/10 border border-brand/25">
                <UserCircle size={26} className="text-brand" />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Client Sign In</h1>
                <p className="text-sm text-muted-foreground mt-1">Access your dashboard &amp; orders</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    disabled={disabled}
                    aria-invalid={!!fieldErrors.email}
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 outline-none transition-all disabled:opacity-60 focus:ring-3 focus:ring-brand/30 focus:border-brand ${fieldErrors.email ? 'border-destructive' : 'border-border'}`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-destructive">
                    <AlertCircle size={12} />
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={disabled}
                    aria-invalid={!!fieldErrors.password}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-11 py-3 rounded-xl border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 outline-none transition-all disabled:opacity-60 focus:ring-3 focus:ring-brand/30 focus:border-brand ${fieldErrors.password ? 'border-destructive' : 'border-border'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={disabled}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs mt-1.5 flex items-center gap-1 text-destructive">
                    <AlertCircle size={12} />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {formError && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm bg-destructive/10 border border-destructive/25 text-destructive">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={disabled}
                aria-busy={loading}
                className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-primary-foreground bg-primary transition-all hover:bg-[color:var(--color-brand-deep)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6">
              <OrDivider />
            </div>
            <div className="mt-4">
              <SocialAuthButtons
                callbackUrl={from}
                onStart={() => setOauthActive(true)}
                onError={(provider, message) => {
                  setOauthActive(false)
                  addToast(message, false)
                }}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/client/register" className="font-semibold text-brand hover:underline">
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
