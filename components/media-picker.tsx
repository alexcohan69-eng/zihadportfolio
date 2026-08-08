'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Upload, MonitorUp, Library, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MediaPickerModal } from './admin/media-picker-modal'
import { useToast } from '@/hooks/use-toast'

interface MediaFile {
  url: string
  type: 'image' | 'video' | 'audio'
}

interface MediaPickerProps {
  onSelect: (media: MediaFile[]) => void
  multiple?: boolean
  disabled?: boolean
}

export function MediaPicker({ onSelect, multiple = false, disabled = false }: MediaPickerProps) {
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false)
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const fileRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  // Hydration ও Portal এর জন্য
  useEffect(() => setMounted(true), [])

  // ── Handle Device Upload ──
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsOptionModalOpen(false)
    setIsUploading(true)
    
    const uploadedMedia: MediaFile[] = []
    const filesToUpload = multiple ? Array.from(files) : [files[0]]

    for (const file of filesToUpload) {
      const fd = new FormData()
      fd.append('file', file)
      
      const isVideoOrAudio = file.type.startsWith('video/') || file.type.startsWith('audio/')
      fd.append('format', isVideoOrAudio ? 'original' : 'webp')

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) {
          const fileType = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image'
          uploadedMedia.push({ url: data.url, type: fileType })
        }
      } catch (e) {
        console.error('Upload failed', e)
      }
    }

    if (uploadedMedia.length > 0) {
      onSelect(uploadedMedia)
      addToast(`Successfully uploaded ${uploadedMedia.length} file(s)`)
    } else {
      addToast('Upload failed', false)
    }
    
    setIsUploading(false)
    if (fileRef.current) fileRef.current.value = '' // Reset input
  }

  // ── Handle Existing Library Selection ──
  const handleLibrarySelect = (urls: string[]) => {
    const mappedMedia: MediaFile[] = urls.map(url => {
      const type = (/\.(mp4|webm|mov)$/i.test(url)) ? 'video' : (/\.(mp3|ogg|wav|aac)$/i.test(url)) ? 'audio' : 'image'
      return { url, type }
    })
    onSelect(mappedMedia)
    setIsLibraryModalOpen(false)
  }

  return (
    <>
      {/* ── 1. Main Trigger Button (Changed to Upload icon) ── */}
      <button
        type="button"
        onClick={() => !disabled && setIsOptionModalOpen(true)}
        disabled={disabled || isUploading}
        className={cn(
          "w-10 h-10 flex items-center justify-center rounded-xl bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm transition-all shrink-0",
          (disabled || isUploading) && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Add Media"
      >
        {isUploading ? <Loader2 size={18} className="animate-spin text-[#f4a295]" /> : <Upload size={18} />}
      </button>

      {/* ── 2. Hidden File Input ── */}
      <input 
        type="file" 
        ref={fileRef} 
        multiple={multiple}
        accept="image/*,video/mp4,video/webm,audio/*" 
        className="hidden" 
        onChange={e => handleFileUpload(e.target.files)} 
      />

      {/* ── 3. Center Option Modal (Using createPortal to escape relative/absolute traps) ── */}
      {mounted && isOptionModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <h3 className="font-bold text-foreground">Add Media</h3>
              <button 
                onClick={() => setIsOptionModalOpen(false)} 
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsOptionModalOpen(false)
                  fileRef.current?.click()
                }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-[#f4a295]/10 text-[#f4a295] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MonitorUp size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Upload from device</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a new file from your computer</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsOptionModalOpen(false)
                  setIsLibraryModalOpen(true)
                }}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:bg-muted/50 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Library size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Choose existing</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Select from site media library</p>
                </div>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 4. Existing Media Library Modal ── */}
      <MediaPickerModal 
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        onSelect={handleLibrarySelect}
        multiple={multiple}
      />
    </>
  )
}
