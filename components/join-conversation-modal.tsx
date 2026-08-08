'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { X, Loader2 } from 'lucide-react'
import type { SessionUser } from '@/lib/types'

interface JoinConversationModalProps {
  open: boolean
  onClose: () => void
  /** Fired once a session exists (OAuth bridge or fresh registration) — lets the
   *  caller resume the pending like/comment action without a page reload. */
  onAuthenticated: (user: SessionUser) => void
}

type OAuthProvider = 'google' | 'linkedin' | 'twitter'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.55-1.85.87-3.06.87-2.36 0-4.36-1.6-5.08-3.74H.9v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.92 10.69a5.4 5.4 0 0 1 0-3.38V5H.9a9 9 0 0 0 0 8l3.02-2.31Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.6 8.6 0 0 0 9 0 9 9 0 0 0 .9 5l3.02 2.31C4.64 5.18 6.64 3.58 9 3.58Z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.44-2.14 2.94v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM3.56 20.45h3.57V9H3.56v11.45Z" />
    </svg>
  )
}

function TwitterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.2 8.24L23.3 22h-6.7l-5.24-6.85L5 22H1.9l7.7-8.8L1 2h6.86l4.73 6.27L18.9 2Zm-2.35 18.13h1.86L7.55 3.77H5.56L16.55 20.13Z" />
    </svg>
  )
}

export function JoinConversationModal({ open, onClose, onAuthenticated }: JoinConversationModalProps) {
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleOAuth = (provider: OAuthProvider) => {
    setOauthLoading(provider)
    // OAuth requires leaving the page to the provider's consent screen; we send
    // the user right back to this same feed URL once the callback resolves.
    signIn(provider, { callbackUrl: window.location.href }).catch(() => setOauthLoading(null))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Please fill in every field. Password needs at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create account.')
        return
      }

      onAuthenticated(data.user as SessionUser)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3 className="font-bold text-xl text-foreground mb-1">Join the conversation</h3>
        <p className="text-xs text-muted-foreground mb-6">Sign in to like, comment, and follow along.</p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => handleOAuth('google')}
            disabled={oauthLoading !== null}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 bg-background border border-border text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-60"
          >
            {oauthLoading === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuth('linkedin')}
            disabled={oauthLoading !== null}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 bg-background border border-border text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-60"
          >
            {oauthLoading === 'linkedin' ? <Loader2 size={16} className="animate-spin" /> : <LinkedInIcon />}
            Continue with LinkedIn
          </button>
          <button
            onClick={() => handleOAuth('twitter')}
            disabled={oauthLoading !== null}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 bg-foreground text-background hover:opacity-90 transition-all active:scale-95 disabled:opacity-60"
          >
            {oauthLoading === 'twitter' ? <Loader2 size={16} className="animate-spin" /> : <TwitterIcon />}
            Continue with Twitter
          </button>
        </div>

        <div className="relative flex items-center py-5">
          <div className="flex-grow border-t border-border" />
          <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground">or</span>
          <div className="flex-grow border-t border-border" />
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-foreground uppercase tracking-wider mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full bg-muted/50 border border-border px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#f4a295] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground uppercase tracking-wider mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full bg-muted/50 border border-border px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#f4a295] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground uppercase tracking-wider mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full bg-muted/50 border border-border px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#f4a295] transition-colors"
            />
          </div>

          {error && <p className="text-xs text-red-500 -mt-1">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-1 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Create Account & Continue
          </button>
        </form>
      </div>
    </div>
  )
}
