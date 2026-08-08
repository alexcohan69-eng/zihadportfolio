'use client'

import { useState, useEffect } from 'react'
import type { SessionUser } from '@/lib/types'

export function useClientSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/auth/client/me')
      .then((res) => res.json())
      .then((data) => {
        if (active) setUser(data.user ?? null)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { user, loading }
}
