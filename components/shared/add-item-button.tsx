'use client'

import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddItemButtonProps {
  onClick: () => void
  label: ReactNode
  className?: string
}

/**
 * Dashed-border "Add X" button used at the bottom of repeatable list
 * editors (values, stack items, timeline events, social links, etc.).
 */
export function AddItemButton({ onClick, label, className }: AddItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors',
        className
      )}
    >
      <Plus size={13} />
      {label}
    </button>
  )
}
