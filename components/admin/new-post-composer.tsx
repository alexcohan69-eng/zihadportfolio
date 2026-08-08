'use client'

/**
 * NewPostComposer
 * ───────────────
 * A fully self-contained modal/panel that handles creating Posts, Testimonials,
 * and Projects. Designed to be embedded anywhere (Quick Compose fab, Admin Feed page, etc.)
 *
 * Props:
 *  - open          : boolean to show/hide the modal
 *  - onClose       : called when the user dismisses
 *  - onSuccess     : called after a successful save (optional – e.g. to refresh lists)
 *  - defaultKind   : pre-select a post type on open (optional)
 *  - uploadFormat  : image compression format (optional, default 'webp')
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, Check, Upload, Loader2, Star,
  BookOpen, Quote, Briefcase, ChevronDown,
  Music, Film, ImagePlus, ExternalLink, Code,
  AlignLeft, Image, GripVertical, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MediaPickerModal } from '@/components/admin/media-picker-modal'
import { TechTagInput } from '@/components/admin/tech-tag-input'
import { CreatableSelect } from '@/components/admin/creatable-select'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedPayload {
  type: string
  title: string
  excerpt: string
  content: string
  category: string
  image?: string
  media?: string[]
  author: string
  clientName?: string
  clientRole?: string
  date: string
  likes: number
  replies: number
  rating?: number
  tech?: string[]
  link?: string
  featured?: boolean
  linkedProjectId?: string
}

interface ContentBlock {
  id: string
  type: 'paragraph' | 'heading' | 'image' | 'divider'
  text?: string
  url?: string
  caption?: string
}

interface ProjectPayload {
  title: string
  description: string
  category: string
  image?: string
  images?: string[]
  content?: ContentBlock[]
  tech: string[]
  results: Record<string, string>
  link?: string
  github?: string
  featured: boolean
}

export type PostKind = 'post' | 'testimonial' | 'project'

// ─── Constants ────────────────────────────────────────────────────────────────

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

const FEED_CATEGORY_MAP: Record<string, string> = {
  post: 'posts',
  testimonial: 'testimonials',
}

const FEED_EMPTY: Omit<FeedPayload, never> = {
  type: 'post',
  title: '',
  excerpt: '',
  content: '',
  category: 'posts',
  image: '',
  media: [],
  author: 'Zihad Imtiase',
  clientName: '',
  clientRole: '',
  date: new Date().toISOString().split('T')[0],
  likes: 0,
  replies: 0,
  rating: 5,
  tech: [],
  link: '',
  featured: false,
  linkedProjectId: '',
}

const PROJECT_EMPTY: ProjectPayload = {
  title: '',
  description: '',
  category: '',
  image: '',
  images: [],
  content: [],
  tech: [],
  results: { result: '' },
  link: '',
  github: '',
  featured: false,
}

function newBlockId() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function mediaTypeOf(url: string): 'image' | 'video' | 'audio' {
  if (/\.(mp4|webm|mov)$/i.test(url)) return 'video'
  if (/\.(mp3|ogg|wav|aac|flac|m4a)$/i.test(url)) return 'audio'
  return 'image'
}

// ─── Type Picker Popover ──────────────────────────────────────────────────────

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
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
        style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
      >
        <Plus size={16} />
        New Post
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Choose post type</p>
          </div>
          <div className="p-2 space-y-1">
            {KIND_OPTIONS.map(({ value, label, description, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => { setOpen(false); onSelect(value) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color + '18' }}
                >
                  <Icon size={15} style={{ color }} />
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

// ─── Media Thumb ──────────────────────────────────────────────────────────────

function MediaThumb({ url, onRemove }: { url: string; onRemove: () => void }) {
  const kind = mediaTypeOf(url)
  return (
    <div className="relative rounded-xl overflow-hidden bg-muted border border-border group/thumb">
      {kind === 'image' && <img src={url} alt="" className="w-full h-24 object-cover" />}
      {kind === 'video' && (
        <div className="w-full h-24 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <Film size={20} /><span className="text-[10px]">Video</span>
        </div>
      )}
      {kind === 'audio' && (
        <div className="w-full h-24 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <Music size={20} /><span className="text-[10px]">Audio</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors opacity-0 group-hover/thumb:opacity-100"
      >
        <X size={11} />
      </button>
      <div className="absolute bottom-1 left-1.5 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-black/60 text-white">{kind}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface NewPostComposerProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  defaultKind?: PostKind
  uploadFormat?: string
  /** Whether to render as a floating modal overlay (default: true). Set false to embed inline. */
  asModal?: boolean
}

export function NewPostComposer({
  open,
  onClose,
  onSuccess,
  defaultKind,
  uploadFormat = 'webp',
  asModal = true,
}: NewPostComposerProps) {
  // ── Kind ──
  const [activeKind, setActiveKind] = useState<PostKind>(defaultKind ?? 'post')

  // ── Feed form ──
  const [feedForm, setFeedFormState] = useState<FeedPayload>({ ...FEED_EMPTY })
  const [feedUploading, setFeedUploading] = useState(false)
  const [feedPickerOpen, setFeedPickerOpen] = useState(false)

  // ── Project form ──
  const [projectForm, setProjectFormState] = useState<ProjectPayload>({ ...PROJECT_EMPTY })
  const [techTags, setTechTags] = useState<string[]>([])
  const [techSuggestions, setTechSuggestions] = useState<string[]>([])
  const [resultKey, setResultKey] = useState('')
  const [resultVal, setResultVal] = useState('')
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  // ── Shared ──
  const [saving, setSaving] = useState(false)

  const feedFileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // Fetch suggestions on mount
  useEffect(() => {
    fetch('/api/technologies')
      .then((r) => r.json())
      .then((d) => setTechSuggestions(d.technologies ?? []))
      .catch(() => {})

    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {})
  }, [])

  // Reset when opened with a new kind or re-opened
  useEffect(() => {
    if (open) {
      const kind = defaultKind ?? 'post'
      setActiveKind(kind)
      if (kind === 'project') {
        setProjectFormState({ ...PROJECT_EMPTY })
        setTechTags([])
        setResultKey('')
        setResultVal('')
      } else {
        setFeedFormState({
          ...FEED_EMPTY,
          type: kind,
          category: FEED_CATEGORY_MAP[kind] ?? 'posts',
          date: new Date().toISOString().split('T')[0],
        })
      }
    }
  }, [open, defaultKind])

  // Switch kind and reset corresponding form
  function switchKind(kind: PostKind) {
    setActiveKind(kind)
    if (kind === 'project') {
      setProjectFormState({ ...PROJECT_EMPTY })
      setTechTags([])
      setResultKey('')
      setResultVal('')
    } else {
      setFeedFormState({
        ...FEED_EMPTY,
        type: kind,
        category: FEED_CATEGORY_MAP[kind] ?? 'posts',
        date: new Date().toISOString().split('T')[0],
      })
    }
  }

  function setFeed(key: string, value: unknown) {
    setFeedFormState((f) => ({ ...f, [key]: value }))
  }

  function setProject(key: string, value: unknown) {
    setProjectFormState((f) => ({ ...f, [key]: value }))
  }

  // ── Feed upload ──

  async function handleFeedUpload(files: FileList) {
    setFeedUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('format', uploadFormat)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) uploaded.push(data.url)
      } catch {}
    }
    if (uploaded.length > 0) {
      setFeedFormState((f) => ({ ...f, media: [...(f.media ?? []), ...uploaded] }))
    }
    setFeedUploading(false)
  }

  function handleFeedSelectExisting(urls: string[]) {
    const slots = 4 - (feedForm.media?.length || 0)
    const toAdd = urls.slice(0, slots)
    if (toAdd.length > 0) {
      setFeedFormState((f) => ({ ...f, media: [...(f.media ?? []), ...toAdd] }))
    }
  }

  function removeFeedMedia(index: number) {
    setFeedFormState((f) => ({ ...f, media: (f.media ?? []).filter((_, i) => i !== index) }))
  }

  // ── Gallery upload ──

  async function handleGalleryUpload(files: FileList) {
    setGalleryUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('format', uploadFormat)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) uploaded.push(data.url)
      } catch {}
    }
    if (uploaded.length > 0) {
      setProjectFormState((f) => ({ ...f, images: [...(f.images ?? []), ...uploaded] }))
    }
    setGalleryUploading(false)
  }

  function handleProjectSelectExisting(urls: string[]) {
    if (urls.length > 0) {
      setProjectFormState((f) => ({ ...f, images: [...(f.images ?? []), ...urls] }))
    }
  }

  function removeGalleryImage(index: number) {
    setProjectFormState((f) => ({ ...f, images: (f.images ?? []).filter((_, i) => i !== index) }))
  }

  // ── Content blocks ──

  function addBlock(type: ContentBlock['type']) {
    setProjectFormState((f) => ({ ...f, content: [...(f.content ?? []), { id: newBlockId(), type }] }))
  }

  function updateBlock(id: string, changes: Partial<ContentBlock>) {
    setProjectFormState((f) => ({
      ...f,
      content: (f.content ?? []).map((b) => (b.id === id ? { ...b, ...changes } : b)),
    }))
  }

  function removeBlock(id: string) {
    setProjectFormState((f) => ({ ...f, content: (f.content ?? []).filter((b) => b.id !== id) }))
  }

  // ── Category create ──

  async function handleCreateCategory(name: string): Promise<boolean> {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCategories((prev) => [...prev, name].sort())
        return true
      }
      return false
    } catch {
      return false
    }
  }

  // ── Submit: Feed ──

  async function handleFeedSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...feedForm,
      category: FEED_CATEGORY_MAP[feedForm.type] ?? 'posts',
      image: (feedForm.media ?? [])[0] ?? feedForm.image ?? '',
    }
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onSuccess?.()
        onClose()
      }
    } catch {}
    finally { setSaving(false) }
  }

  // ── Submit: Project ──

  async function handleProjectSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const results = resultKey.trim() ? { [resultKey.trim()]: resultVal.trim() } : {}
    const coverImage = projectForm.images?.[0] ?? projectForm.image ?? ''
    const payload = { ...projectForm, tech: techTags, results, image: coverImage }

    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const saved = await res.json()
        // Auto-sync to feed
        const projectData = saved.project ?? payload
        const feedPost = {
          type: 'project',
          category: 'projects',
          title: projectData.title,
          excerpt: projectData.description,
          content: projectData.description,
          author: 'Zihad Imtiase',
          image: coverImage,
          media: projectForm.images ?? [],
          tech: techTags,
          link: projectData.link ?? '',
          featured: projectData.featured ?? false,
          linkedProjectId: projectData.id ?? saved.project?.id ?? '',
        }
        try {
          await fetch('/api/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedPost),
          })
        } catch {}

        // Refresh tech suggestions with newly added tags
        setTechSuggestions((prev) => {
          const next = [...new Set([...prev, ...techTags])].sort()
          return next
        })

        onSuccess?.()
        onClose()
      }
    } catch {}
    finally { setSaving(false) }
  }

  // ─── Guard ───────────────────────────────────────────────────────────────────

  if (!open) return null

  const activeMeta = KIND_OPTIONS.find((k) => k.value === activeKind)!
  const feedMediaCount = (feedForm.media ?? []).length
  const galleryCount = (projectForm.images ?? []).length

  // ─── Inner content (shared by modal & inline modes) ───────────────────────────

  const innerContent = (
    <div
      className={cn(
        'bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col',
        asModal ? 'w-full max-w-xl' : 'w-full',
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b border-border"
        style={{ background: activeMeta.color + '10' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: activeMeta.color + '20' }}
          >
            <activeMeta.icon size={14} style={{ color: activeMeta.color }} />
          </div>
          <p className="text-sm font-bold text-foreground">
            {activeKind === 'project' ? 'Add Project' : activeKind === 'testimonial' ? 'New Testimonial' : 'New Post'}
          </p>
        </div>

        {/* Kind selector tabs */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted p-0.5 rounded-xl">
            {KIND_OPTIONS.map(({ value, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => switchKind(value)}
                title={KIND_OPTIONS.find((k) => k.value === value)?.label}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                  activeKind === value
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                )}
                style={activeKind === value ? { color } : {}}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── POST / TESTIMONIAL FORM ── */}
      {(activeKind === 'post' || activeKind === 'testimonial') && (
        <form onSubmit={handleFeedSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={feedForm.title}
              onChange={(e) => setFeed('title', e.target.value)}
              placeholder={activeKind === 'testimonial' ? 'What was the project about?' : 'Enter a compelling title...'}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              {activeKind === 'testimonial' ? 'Testimonial Text' : 'Excerpt / Short text'}
            </label>
            <textarea
              value={feedForm.excerpt}
              onChange={(e) => setFeed('excerpt', e.target.value)}
              placeholder={activeKind === 'testimonial' ? 'What the client said...' : 'Short preview shown in the feed...'}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors resize-none"
            />
          </div>

          {activeKind === 'post' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Content</label>
              <textarea
                value={feedForm.content}
                onChange={(e) => setFeed('content', e.target.value)}
                placeholder="Full post content..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors resize-none"
              />
            </div>
          )}

          {activeKind === 'testimonial' && (
            <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Client Name</label>
                  <input
                    type="text"
                    value={feedForm.clientName || ''}
                    onChange={(e) => setFeed('clientName', e.target.value)}
                    placeholder="Felix Johnson"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Role / Company</label>
                  <input
                    type="text"
                    value={feedForm.clientRole || ''}
                    onChange={(e) => setFeed('clientRole', e.target.value)}
                    placeholder="Founder, TechStart"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFeed('rating', n)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        size={22}
                        fill={(feedForm.rating ?? 5) >= n ? '#a8d5c2' : 'none'}
                        style={{ color: (feedForm.rating ?? 5) >= n ? '#a8d5c2' : 'var(--muted-foreground)' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Media */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Media <span className="font-normal normal-case text-muted-foreground/70">— up to 4</span>
              </label>
              {feedMediaCount > 0 && <span className="text-[11px] text-muted-foreground">{feedMediaCount}/4</span>}
            </div>
            {feedMediaCount > 0 && (
              <div className={cn('grid gap-2 mb-2', feedMediaCount === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                {(feedForm.media ?? []).map((url, i) => (
                  <MediaThumb key={url + i} url={url} onRemove={() => removeFeedMedia(i)} />
                ))}
              </div>
            )}
            {feedMediaCount < 4 && (
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={cn('border-2 border-dashed rounded-xl transition-colors cursor-pointer', feedUploading ? 'border-brand/40 bg-brand/5' : 'border-border hover:border-[#f4a295]/50 hover:bg-muted/30')}
                  onClick={() => !feedUploading && feedFileRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
                    {feedUploading ? <Loader2 size={18} className="animate-spin text-[#f4a295]" /> : <><Upload size={18} /><span className="text-xs">Upload New</span></>}
                  </div>
                </div>
                <div
                  className="border-2 border-dashed rounded-xl transition-colors cursor-pointer border-border hover:border-[#f4a295]/50 hover:bg-muted/30"
                  onClick={() => setFeedPickerOpen(true)}
                >
                  <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
                    <ImagePlus size={18} /><span className="text-xs">Choose Existing</span>
                  </div>
                </div>
                <input ref={feedFileRef} type="file" multiple accept="image/*,video/mp4,video/webm,audio/*" className="hidden" onChange={(e) => e.target.files && handleFeedUpload(e.target.files)} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              value={feedForm.date}
              onChange={(e) => setFeed('date', e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: activeMeta.color, color: '#1a1a1a' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Publish
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── PROJECT FORM ── */}
      {activeKind === 'project' && (
        <form onSubmit={handleProjectSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Category</label>
              <CreatableSelect
                value={projectForm.category}
                onChange={(val) => setProject('category', val)}
                categories={categories}
                onCreateCategory={handleCreateCategory}
                disabled={saving}
              />
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Featured</label>
              <button
                type="button"
                onClick={() => setProject('featured', !projectForm.featured)}
                className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all', projectForm.featured ? 'border-transparent' : 'border-border text-muted-foreground')}
                style={projectForm.featured ? { backgroundColor: '#9db8e820', color: '#9db8e8', borderColor: '#9db8e840' } : {}}
              >
                <Star size={13} fill={projectForm.featured ? '#9db8e8' : 'none'} style={{ color: projectForm.featured ? '#9db8e8' : undefined }} /> Featured
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Project Title <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={projectForm.title}
              onChange={(e) => setProject('title', e.target.value)}
              placeholder="e.g. SaaS Landing Page for TechStart"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={projectForm.description}
              onChange={(e) => setProject('description', e.target.value)}
              placeholder="What did you build and what problem did it solve?"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Technologies</label>
            <TechTagInput
              value={techTags}
              onChange={setTechTags}
              suggestions={techSuggestions}
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Key Result <span className="text-xs font-normal normal-case text-muted-foreground">(metric badge)</span>
            </label>
            <div className="flex gap-2">
              <input type="text" value={resultKey} onChange={(e) => setResultKey(e.target.value)} placeholder="Conversions" className="w-2/5 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              <input type="text" value={resultVal} onChange={(e) => setResultVal(e.target.value)} placeholder="+40% increase" className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Live URL</label>
              <div className="relative">
                <ExternalLink size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="url" value={projectForm.link || ''} onChange={(e) => setProject('link', e.target.value)} placeholder="https://example.com" className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">GitHub URL</label>
              <div className="relative">
                <Code size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="url" value={projectForm.github || ''} onChange={(e) => setProject('github', e.target.value)} placeholder="https://github.com/..." className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Project Images
                <span className="ml-1 font-normal normal-case text-muted-foreground/70">— first is cover</span>
              </label>
              {galleryCount > 0 && <span className="text-[11px] text-muted-foreground">{galleryCount} image{galleryCount !== 1 ? 's' : ''}</span>}
            </div>
            {galleryCount > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(projectForm.images ?? []).map((url, i) => (
                  <div key={url + i} className="relative group/img rounded-xl overflow-hidden bg-muted border border-border">
                    <img src={url} alt="" className="w-full h-20 object-cover" />
                    {i === 0 && <div className="absolute top-1 left-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/70 text-white">Cover</div>}
                    <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={10} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div onClick={() => !galleryUploading && galleryRef.current?.click()} className={cn('border-2 border-dashed rounded-xl transition-colors cursor-pointer', galleryUploading ? 'border-brand/40 bg-brand/5' : 'border-border hover:border-[#9db8e8]/50 hover:bg-muted/30')}>
                <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
                  {galleryUploading ? <Loader2 size={18} className="animate-spin text-[#9db8e8]" /> : <><Upload size={18} /><span className="text-xs">Upload New</span></>}
                </div>
              </div>
              <div onClick={() => setProjectPickerOpen(true)} className="border-2 border-dashed rounded-xl transition-colors cursor-pointer border-border hover:border-[#9db8e8]/50 hover:bg-muted/30">
                <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground"><ImagePlus size={18} /><span className="text-xs">Choose Existing</span></div>
              </div>
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleGalleryUpload(e.target.files)} />
            </div>
          </div>

          {/* Content blocks */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detailed Content</label>
            {(projectForm.content ?? []).length > 0 && (
              <div className="space-y-2 mb-2">
                {(projectForm.content ?? []).map((block) => (
                  <div key={block.id} className="flex gap-2 items-start group/block">
                    <div className="mt-2.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab transition-colors"><GripVertical size={14} /></div>
                    <div className="flex-1 min-w-0">
                      {block.type === 'heading' && <input type="text" value={block.text ?? ''} onChange={(e) => updateBlock(block.id, { text: e.target.value })} placeholder="Section heading..." className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />}
                      {block.type === 'paragraph' && <textarea value={block.text ?? ''} onChange={(e) => updateBlock(block.id, { text: e.target.value })} placeholder="Write a paragraph..." rows={3} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none" />}
                      {block.type === 'image' && (
                        <div className="space-y-1.5">
                          {(projectForm.images ?? []).length > 0 ? (
                            <div className="relative">
                              <select
                                value={block.url ?? ''}
                                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                className="w-full appearance-none px-3 py-2 pr-8 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                              >
                                <option value="">— Select a project image —</option>
                                {(projectForm.images ?? []).map((url, idx) => (
                                  <option key={url} value={url}>Image {idx + 1}{idx === 0 ? ' (Cover)' : ''}</option>
                                ))}
                              </select>
                              <Image size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                              <Image size={13} className="shrink-0" />
                              Upload images above to pick one here.
                            </div>
                          )}
                          {block.url && (
                            <div className="rounded-xl overflow-hidden bg-muted border border-border">
                              <img src={block.url} alt={block.caption ?? ''} className="w-full max-h-32 object-cover" />
                            </div>
                          )}
                          <input type="text" value={block.caption ?? ''} onChange={(e) => updateBlock(block.id, { caption: e.target.value })} placeholder="Caption (optional)..." className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                        </div>
                      )}
                      {block.type === 'divider' && <div className="flex items-center gap-2 py-2 text-muted-foreground"><div className="flex-1 h-px bg-border" /><span className="text-[10px] uppercase tracking-widest">divider</span><div className="flex-1 h-px bg-border" /></div>}
                    </div>
                    <button type="button" onClick={() => removeBlock(block.id)} className="mt-2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover/block:opacity-100"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addBlock('heading')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><span className="font-bold">H</span> Heading</button>
              <button type="button" onClick={() => addBlock('paragraph')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><AlignLeft size={12} /> Paragraph</button>
              <button type="button" onClick={() => addBlock('image')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Image size={12} /> Image</button>
              <button type="button" onClick={() => addBlock('divider')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">— Divider</button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: '#9db8e8', color: '#1a1a1a' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Add Project
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <MediaPickerModal isOpen={feedPickerOpen} onClose={() => setFeedPickerOpen(false)} multiple={true} onSelect={handleFeedSelectExisting} />
      <MediaPickerModal isOpen={projectPickerOpen} onClose={() => setProjectPickerOpen(false)} multiple={true} onSelect={handleProjectSelectExisting} />
    </div>
  )

  if (!asModal) return innerContent

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl animate-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200">
        {innerContent}
      </div>
    </div>
  )
}
