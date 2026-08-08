'use client'

import type { RefObject } from 'react'
import { Loader2, Upload, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadDropzoneProps {
  /** Ref for the hidden file input this dropzone controls. */
  inputRef: RefObject<HTMLInputElement | null>
  /** True while an upload request is in flight. */
  uploading: boolean
  /** Opens the "choose existing media" picker modal. */
  onChooseExisting: () => void
  /** Called with the selected FileList when new files are picked. */
  onFilesSelected: (files: FileList) => void
  /** Accepted file types for the hidden input. */
  accept?: string
  /** Allow selecting multiple files at once. */
  multiple?: boolean
  /** Accent color used for the uploading spinner. */
  accentColor?: string
}

/**
 * Paired "Upload New" / "Choose Existing" dropzone tiles used across the
 * admin feed, portfolio, and post-composer forms.
 */
export function UploadDropzone({
  inputRef,
  uploading,
  onChooseExisting,
  onFilesSelected,
  accept = 'image/*',
  multiple = true,
  accentColor = '#f4a295',
}: UploadDropzoneProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div
        className={cn(
          'border-2 border-dashed rounded-xl transition-colors cursor-pointer',
          uploading ? 'border-brand/40 bg-brand/5' : 'border-border hover:bg-muted/30',
        )}
        style={!uploading ? { '--hover-color': accentColor } as React.CSSProperties : undefined}
        onClick={() => !uploading && inputRef.current?.click()}
        onMouseEnter={(e) => !uploading && (e.currentTarget.style.borderColor = accentColor + '80')}
        onMouseLeave={(e) => !uploading && (e.currentTarget.style.borderColor = '')}
      >
        <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
          {uploading ? (
            <Loader2 size={18} className="animate-spin" style={{ color: accentColor }} />
          ) : (
            <>
              <Upload size={18} />
              <span className="text-xs">Upload New</span>
            </>
          )}
        </div>
      </div>
      <div
        className="border-2 border-dashed rounded-xl transition-colors cursor-pointer border-border hover:bg-muted/30"
        onClick={onChooseExisting}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = accentColor + '80')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
      >
        <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
          <ImagePlus size={18} />
          <span className="text-xs">Choose Existing</span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
      />
    </div>
  )
}
