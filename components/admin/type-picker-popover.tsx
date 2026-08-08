'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronDown, BookOpen, Quote, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PostKind = 'post' | 'testimonial' | 'project'

export const KIND_OPTIONS: {
  value: PostKind
  label: string
  description: string
  icon: React.ElementType
  color: string
}[] = [
  { value: 'post', label: 'Post', description: 'General update or article', icon: BookOpen, color: '#f4a295' },
  { value: 'testimonial', label: 'Testimonial', description: 'Client review with rating', icon: Quote, color: '#a8d5c2' },
  { value: 'project', label: 'Project', description: 'Portfolio project with gallery', icon: Briefcase, color: '#9db8e8' },
]

export function TypePickerPopover({ onSelect }: { onSelect: (kind: PostKind) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
        style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
      >
        <Plus size={16} aria-hidden="true" />
        New Post
        <ChevronDown size={13} aria-hidden="true" className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Choose post type</p>
          </div>
          <div className="p-2 space-y-1">
            {KIND_OPTIONS.map(({ value, label, description, icon: Icon, color }) => (
              <button
                key={value}
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSelect(value)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                  style={{ backgroundColor: color + '18' }}
                >
                  <Icon size={15} style={{ color }} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
