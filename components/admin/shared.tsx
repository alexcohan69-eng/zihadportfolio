'use client'

import { Settings2 } from 'lucide-react'
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

// ── Upload Format Picker ──────────────────────────────────────────────────────

export type UploadFormat = 'original' | 'webp' | 'avif'

interface UploadFormatPickerProps {
  value: UploadFormat
  onChange: (value: UploadFormat) => void
}

export function UploadFormatPicker({ value, onChange }: UploadFormatPickerProps) {
  return (
    <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-xl px-4 py-3 mb-6">
      <Settings2 size={18} className="text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Image Upload Format</p>
        <p className="text-[10px] text-muted-foreground">
          Automatically compress images to this format upon upload.
        </p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as UploadFormat)}
        className="text-xs px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-brand/30 shrink-0"
      >
        <option value="webp">WebP (Recommended)</option>
        <option value="avif">AVIF (Best Compression)</option>
        <option value="original">Original Format</option>
      </select>
    </div>
  )
}
