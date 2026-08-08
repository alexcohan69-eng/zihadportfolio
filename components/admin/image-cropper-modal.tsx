'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageCropperModalProps {
  isOpen: boolean
  file: File | null
  aspectRatio: number
  onClose: () => void
  onCropConfirm: (croppedFile: File) => void
}

// Canvas-এর মাধ্যমে ইমেজ ক্রপ করার ইউটিলিটি ফাংশন
async function getCroppedImg(imageSrc: string, pixelCrop: any, fileName: string): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => resolve(img)
    img.onerror = (error) => reject(error)
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('No 2d context')

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) throw new Error('Canvas is empty')
      resolve(new File([blob], fileName, { type: 'image/webp' }))
    }, 'image/webp', 1)
  })
}

export function ImageCropperModal({ isOpen, file, aspectRatio, onClose, onCropConfirm }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setImageSrc(url)
      return () => URL.revokeObjectURL(url)
    }
    setImageSrc(null)
  }, [file])

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !file) return
    setIsProcessing(true)
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, `cropped-${file.name}`)
      onCropConfirm(croppedFile)
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen || !imageSrc) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
          <div>
            <h2 className="font-bold text-foreground">Adjust Image</h2>
            <p className="text-xs text-muted-foreground">Drag and zoom to crop your image</p>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-[60vh] sm:h-[400px] bg-black/10">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid={true}
          />
        </div>

        {/* Controls & Footer */}
        <div className="px-5 py-4 border-t border-border bg-muted/30 space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut size={18} className="text-muted-foreground" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#f4a295]"
            />
            <ZoomIn size={18} className="text-muted-foreground" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={isProcessing} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              {isProcessing ? 'Processing...' : <><Check size={16} /> Apply Crop</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
