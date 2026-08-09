'use client'

import { cn } from '@/lib/utils'
import type { Toast } from '@/hooks/use-toast'

// ── Toast Stack ───────────────────────────────────────────────────────────────

interface ToastStackProps {
  toasts: Toast[]
}

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg pointer-events-auto transition-all',
            t.ok ? 'bg-foreground text-background' : 'bg-destructive text-white',
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}

