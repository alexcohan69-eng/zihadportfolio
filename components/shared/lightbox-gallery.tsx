'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { SmartMedia } from '@/components/shared/smart-media'
import { pauseOtherVideos } from '@/lib/utils'

interface LightboxGalleryProps {
  media: string[]
  index: number
  alt?: string
  onIndexChange: (index: number) => void
  onClose: () => void
}

/**
 * Fullscreen media viewer supporting a single item or a multi-media
 * gallery. When `media.length > 1` it renders Prev/Next arrow controls,
 * a "current / total" counter, and listens for ArrowLeft/ArrowRight/Escape.
 */
export function LightboxGallery({ media, index, alt, onIndexChange, onClose }: LightboxGalleryProps) {
  const count = media.length
  const current = media[index]

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + count) % count)
  }, [index, count, onIndexChange])

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % count)
  }, [index, count, onIndexChange])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (count > 1) {
        if (e.key === 'ArrowLeft') goPrev()
        if (e.key === 'ArrowRight') goNext()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [count, goPrev, goNext, onClose])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black animate-in fade-in duration-200"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
        aria-label="Close lightbox"
      >
        <X size={22} />
      </button>

      {count > 1 && (
        <span className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
          {index + 1} / {count}
        </span>
      )}

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            goPrev()
          }}
          className="absolute left-2 sm:left-6 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          aria-label="Previous media"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {count > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            goNext()
          }}
          className="absolute right-2 sm:right-6 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
          aria-label="Next media"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <div
        className="relative flex h-full w-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          (e.currentTarget as HTMLDivElement).dataset.touchStartX = String(e.touches[0].clientX)
        }}
        onTouchEnd={(e) => {
          const startX = Number((e.currentTarget as HTMLDivElement).dataset.touchStartX || 0)
          const deltaX = e.changedTouches[0].clientX - startX
          if (count > 1 && Math.abs(deltaX) > 50) {
            if (deltaX > 0) goPrev()
            else goNext()
          }
        }}
      >
        <SmartMedia
          key={current}
          src={current}
          alt={alt}
          className="max-h-full max-w-full object-contain sm:max-h-[92vh] sm:max-w-[92vw]"
          controls
          autoPlay
          onPlay={(e) => pauseOtherVideos(e.currentTarget)}
        />
      </div>
    </div>
  )
}
