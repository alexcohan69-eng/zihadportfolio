'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

export type OAuthProvider = 'google' | 'linkedin' | 'twitter'

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

const PROVIDERS: { id: OAuthProvider; label: string; icon: () => React.JSX.Element; className: string }[] = [
  {
    id: 'google',
    label: 'Google',
    icon: GoogleIcon,
    className: 'bg-background border border-border text-foreground hover:bg-muted',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: LinkedInIcon,
    className: 'bg-background border border-border text-foreground hover:bg-muted',
  },
  {
    id: 'twitter',
    label: 'Twitter',
    icon: TwitterIcon,
    className: 'bg-foreground text-background hover:opacity-90',
  },
]

interface SocialAuthButtonsProps {
  /** Where the OAuth provider should send the user back to after consenting. Defaults to the current page. */
  callbackUrl?: string
  /** Called right before the redirect fires, e.g. to disable the credentials form. */
  onStart?: (provider: OAuthProvider) => void
  /** Called if `signIn` rejects before ever redirecting (e.g. misconfigured provider, offline). */
  onError?: (provider: OAuthProvider, message: string) => void
}

/**
 * Native-feeling "Continue with ..." OAuth row shared by the login and register
 * pages. Each button tracks its own pending state so only the clicked provider
 * shows a spinner while the others stay interactive-looking (matching the
 * pattern already used in `join-conversation-modal.tsx`).
 */
export function SocialAuthButtons({ callbackUrl, onStart, onError }: SocialAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null)

  async function handleClick(provider: OAuthProvider) {
    if (pending) return
    setPending(provider)
    onStart?.(provider)
    try {
      await signIn(provider, { callbackUrl: callbackUrl ?? window.location.href })
    } catch {
      setPending(null)
      onError?.(provider, `Could not start ${provider} sign-in. Please try again.`)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {PROVIDERS.map(({ id, label, icon: Icon, className }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleClick(id)}
          disabled={pending !== null}
          aria-busy={pending === id}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        >
          {pending === id ? <Loader2 size={16} className="animate-spin" /> : <Icon />}
          Continue with {label}
        </button>
      ))}
    </div>
  )
}

interface OrDividerProps {
  label?: string
}

export function OrDivider({ label = 'OR CONTINUE WITH' }: OrDividerProps) {
  return (
    <div className="relative flex items-center py-1">
      <div className="flex-grow border-t border-border" />
      <span className="flex-shrink-0 mx-4 text-[11px] font-semibold tracking-wider text-muted-foreground">{label}</span>
      <div className="flex-grow border-t border-border" />
    </div>
  )
}
