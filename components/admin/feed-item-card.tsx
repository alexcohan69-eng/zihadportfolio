'use client'

import { Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PostKind } from './type-picker-popover'

interface FeedItemCardData {
  id: string
  type: string
  title: string
  date: string
  image?: string
  media?: string[]
}

interface KindMeta {
  value: PostKind
  label: string
  description: string
  icon: React.ElementType
  color: string
}

interface FeedItemCardProps {
  item: FeedItemCardData
  kindMeta: KindMeta
  isDeleting: boolean
  onEdit: () => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}

export function FeedItemCard({
  item,
  kindMeta,
  isDeleting,
  onEdit,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: FeedItemCardProps) {
  const TypeIcon = kindMeta.icon
  const allMedia = item.media?.length ? item.media : item.image ? [item.image] : []

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
        isDeleting ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
      )}
    >
      {allMedia[0] ? (
        <img src={allMedia[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
      ) : (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: kindMeta.color + '18' }}>
          <TypeIcon size={15} style={{ color: kindMeta.color }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{item.title || '(no title)'}</p>
        <p className="text-xs text-muted-foreground">
          {kindMeta.label} · {item.date}
          {allMedia.length > 0 && ` · ${allMedia.length} media`}
        </p>
      </div>
      {isDeleting ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Delete?</span>
          <button onClick={onDeleteConfirm} className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:opacity-90 transition-opacity">Yes</button>
          <button onClick={onDeleteCancel} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">No</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 size={14} /></button>
          <button onClick={onDeleteRequest} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  )
}
