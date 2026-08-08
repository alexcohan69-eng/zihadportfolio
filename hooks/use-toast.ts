'use client'

import { useState, useCallback } from 'react'

export interface Toast {
  id: number
  msg: string
  ok: boolean
}

const TOAST_DURATION_MS = 3_000

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((msg: string, ok = true) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg, ok }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION_MS)
  }, [])

  return { toasts, addToast }
}
