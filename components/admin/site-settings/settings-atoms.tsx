import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SiteSettings } from '@/lib/types'

// ─── Shared Types ─────────────────────────────────────────────────────────────
export type UpdateFieldFn = <S extends keyof SiteSettings>(section: S, field: keyof SiteSettings[S], value: any) => void
export type UpdateArrayItemFn = <S extends 'hero' | 'about' | 'contact'>(section: S, field: string, index: number, key: string, val: any) => void
export type AddArrayItemFn = <S extends 'hero' | 'about' | 'contact'>(section: S, field: string, emptyItem: any) => void
export type RemoveArrayItemFn = <S extends 'hero' | 'about' | 'contact'>(section: S, field: string, index: number) => void

// ─── Shared Helpers ───────────────────────────────────────────────────────────
export function mediaKind(url: string): 'image' | 'video' | 'audio' | 'none' {
  if (!url) return 'none'
  if (/\.(mp4|webm|mov)$/i.test(url)) return 'video'
  if (/\.(mp3|ogg|wav|aac|flac|m4a)$/i.test(url)) return 'audio'
  return 'image'
}

export const inputCls = (accent = '#f4a295') =>
  `w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border outline-none focus:border-[${accent}] focus:bg-background transition-colors text-sm min-w-0 placeholder:text-muted-foreground/40`

// ─── Shared Components ────────────────────────────────────────────────────────
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  )
}

export function SectionHeading({ icon: Icon, label, accent }: { icon: React.ElementType; label: string; accent: string }) {
  return (
    <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
      <Icon size={15} style={{ color: accent }} />
      {label}
    </h3>
  )
}

export function DeleteBtn({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn('p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0', className)}>
      <Trash2 size={14} />
    </button>
  )
}

export function ArraySection({ title, accent, onAdd, addLabel, children }: { title: string; accent: string; onAdd: () => void; addLabel: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <button onClick={onAdd} className="text-xs font-semibold hover:underline flex items-center gap-1 shrink-0" style={{ color: accent }}>
          <Plus size={13} /> {addLabel}
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
