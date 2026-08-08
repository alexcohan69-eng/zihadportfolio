'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, Loader2, Image as ImageIcon, Film, Music, Library, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface MediaResource {
  asset_id: string
  public_id: string
  secure_url: string
  resource_type: string
  format: string
  created_at: string
}

interface MediaPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (urls: string[]) => void
  multiple?: boolean
}

function getMediaIcon(resourceType: string, format: string) {
  if (resourceType === 'video' && ['mp3', 'wav', 'ogg'].includes(format)) return <Music size={24} />
  if (resourceType === 'video') return <Film size={24} />
  return <ImageIcon size={24} />
}

export function MediaPickerModal({ isOpen, onClose, onSelect, multiple = false }: MediaPickerModalProps) {
  const [resources, setResources] = useState<MediaResource[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const { addToast } = useToast()

  useEffect(() => {
    setMounted(true)
    if (isOpen) {
      fetchMedia()
      setSelected(new Set())
    }
  }, [isOpen])

  async function fetchMedia() {
    setLoading(true)
    try {
      const res = await fetch('/api/media')
      const data = await res.json()
      if (data.success) {
        setResources(data.resources)
      }
    } catch {
      addToast('Failed to load media library', false)
    } finally {
      setLoading(false)
    }
  }

  // ── Handle Media Deletion ──
  async function handleDelete(e: React.MouseEvent, public_id: string, secure_url: string, resource_type: string) {
    e.stopPropagation() // কার্ড সিলেক্ট হওয়া আটকাতে
    
    if (!confirm('Are you sure you want to delete this media? This action cannot be undone.')) return
    
    setDeletingId(public_id)
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_id, resource_type })
      })
      
      const data = await res.json()
      
      if (data.success) {
        // UI থেকে রিমুভ করা
        setResources(prev => prev.filter(r => r.public_id !== public_id))
        
        // যদি আইটেমটি সিলেক্টেড থাকে, তবে সিলেকশন থেকেও রিমুভ করা
        if (selected.has(secure_url)) {
          const next = new Set(selected)
          next.delete(secure_url)
          setSelected(next)
        }
        
        addToast('Media deleted successfully')
      } else {
        addToast(data.error || 'Failed to delete media', false)
      }
    } catch (error) {
      addToast('Network error while deleting', false)
    } finally {
      setDeletingId(null)
    }
  }

  function toggleSelection(url: string) {
    const next = new Set(selected)
    if (next.has(url)) {
      next.delete(url)
    } else {
      if (!multiple) next.clear()
      next.add(url)
    }
    setSelected(next)
  }

  function handleConfirm() {
    onSelect(Array.from(selected))
    onClose()
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#f4a295]/10 flex items-center justify-center">
              <Library size={16} className="text-[#f4a295]" />
            </div>
            <div>
              <h2 className="font-bold text-foreground leading-none">Site Media Library</h2>
              <p className="text-[11px] text-muted-foreground mt-1">Select or manage existing uploads</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body / Grid */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-[#f4a295]" />
              <p className="text-sm text-muted-foreground">Loading your media...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">No media found in library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {resources.map((res) => {
                const isSelected = selected.has(res.secure_url)
                const isDeleting = deletingId === res.public_id
                
                return (
                  <div
                    key={res.asset_id}
                    onClick={() => !isDeleting && toggleSelection(res.secure_url)}
                    className={cn(
                      'group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-muted/30',
                      isSelected ? 'border-[#f4a295] shadow-md' : 'border-border hover:border-border/80',
                      isDeleting && 'opacity-50 pointer-events-none'
                    )}
                  >
                    {res.resource_type === 'image' ? (
                      <img src={res.secure_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground">
                        {getMediaIcon(res.resource_type, res.format)}
                        <span className="text-[10px] mt-2 font-bold uppercase tracking-wider">{res.format}</span>
                      </div>
                    )}
                    
                    {/* Delete Button (Visible on Hover) */}
                    <button
                      onClick={(e) => handleDelete(e, res.public_id, res.secure_url, res.resource_type)}
                      disabled={isDeleting}
                      className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center z-20"
                      title="Delete media"
                    >
                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                    
                    {/* Checkbox Overlay */}
                    <div className={cn(
                      "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 z-10",
                      isSelected ? "bg-[#f4a295] text-[#1a1a1a] scale-100 opacity-100" : "bg-black/40 border border-white/50 scale-90 opacity-0 group-hover:opacity-100"
                    )}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            <strong className="text-foreground">{selected.size}</strong> file(s) selected
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 transition-colors active:scale-95"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              Insert Selected
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
