'use client'

import { useEffect, useState } from 'react'

function readAdminHint(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((c) => c.trim().startsWith('admin_hint=1'))
}

/**
 * Returns `isAdmin` initialised synchronously from the non-HttpOnly hint cookie
 * so there is no flash/blink between SSR and first paint.
 * A one-time background fetch against /api/auth/me then verifies the real session.
 */
export function useAdminStatus(): boolean {
  // Initialise from the hint cookie synchronously — no hydration flash
  const [isAdmin, setIsAdmin] = useState<boolean>(() => readAdminHint())

  useEffect(() => {
    // Integrity check: verify against the real HttpOnly session cookie
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.authenticated === true))
      .catch(() => setIsAdmin(readAdminHint()))
    // Run once per mount; the hint cookie handles navigation changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return isAdmin
}
