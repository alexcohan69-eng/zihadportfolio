'use client'

import { Music, Film, X } from 'lucide-react'

export function mediaType(url: string): 'image' | 'video' | 'audio' {
  if (/\.(mp4|webm|mov)$/i.test(url)) return 'video'
  if (/\.(mp3|ogg|wav|aac|flac|m4a)$/i.test(url)) return 'audio'
  return 'image'
}

export function MediaThumb({ url, onRemove, label }: { url: string; onRemove: () => void; label?: string }) {
  const kind = mediaType(url)
  return (
    <div className="relative rounded-xl overflow-hidden bg-muted border border-border group/thumb">
      {kind === 'image' && (
        <img
          src={url || '/placeholder.svg'}
          alt={label ? `${label} preview` : 'Uploaded media preview'}
          className="w-full h-24 object-cover"
        />
      )}
      {kind === 'video' && (
        <div className="w-full h-24 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <Film size={20} aria-hidden="true" />
          <span className="text-[10px]">Video</span>
        </div>
      )}
      {kind === 'audio' && (
        <div className="w-full h-24 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <Music size={20} aria-hidden="true" />
          <span className="text-[10px]">Audio</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove media"
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors opacity-0 group-hover/thumb:opacity-100"
      >
        <X size={11} aria-hidden="true" />
      </button>
      <div className="absolute bottom-1 left-1.5 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-black/60 text-white">
        {kind}
      </div>
    </div>
  )
}
