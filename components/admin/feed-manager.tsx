'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Trash2, Edit2, Plus, X, Check, Upload,
  BookOpen, Quote, Briefcase, Loader2, Star,
  ImagePlus, ExternalLink, Code,
  AlignLeft, Image, GripVertical, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MediaPickerModal } from './media-picker-modal'
import { ToastStack } from './shared'
import { useToast } from '@/hooks/use-toast'
import { TechTagInput } from './tech-tag-input'
import { CreatableSelect } from './creatable-select'
import { MediaThumb } from './media-thumb'
import { TypePickerPopover, KIND_OPTIONS, type PostKind } from './type-picker-popover'
import { uploadFileDirect } from '@/lib/upload-client'
import { RelativeTime } from '@/components/shared/relative-time'

// ─── Feed item types ──────────────────────────────────────────────────────────

interface FeedItem {
  id: string
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

const FEED_EMPTY: Omit<FeedItem, 'id'> = {
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

const FEED_CATEGORY_MAP: Record<string, string> = {
  post: 'posts',
  testimonial: 'testimonials',
}

// ─── Project (portfolio) types ────────────────────────────────────────────────

interface ContentBlock {
  id: string
  type: 'paragraph' | 'heading' | 'image' | 'divider'
  text?: string
  url?: string
  caption?: string
}

interface Project {
  id: string
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

const PROJECT_EMPTY: Omit<Project, 'id'> = {
  title: '',
  description: '',
  category: 'development',
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

// ─── Main component ───────────────────────────────────────────────────────────

export function FeedManager() {
  // ── Feed state ──
  const [items, setItems] = useState<FeedItem[]>([])
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null)
  const [feedForm, setFeedForm] = useState<Omit<FeedItem, 'id'>>(FEED_EMPTY)
  const [feedUploading, setFeedUploading] = useState(false)
  const [feedPickerOpen, setFeedPickerOpen] = useState(false)

  // ── Project state ──
  const [projects, setProjects] = useState<Project[]>([])
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState<Omit<Project, 'id'>>(PROJECT_EMPTY)
  const [techTags, setTechTags] = useState<string[]>([])
  const [techSuggestions, setTechSuggestions] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [resultKey, setResultKey] = useState('')
  const [resultVal, setResultVal] = useState('')
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [projectPickerOpen, setProjectPickerOpen] = useState(false)

  // ── Shared state ──
  const [activeKind, setActiveKind] = useState<PostKind | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toasts, addToast } = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const feedFileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchItems(); fetchProjects(); fetchTechSuggestions(); fetchCategories() }, [])

  // ── Data fetchers ──

  async function fetchItems() {
    try {
      const res = await fetch('/api/feed')
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      addToast('Failed to load posts', false)
    } finally {
      setLoading(false)
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch('/api/portfolio')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch { /* non-fatal */ }
  }

  async function fetchTechSuggestions() {
    try {
      const res = await fetch('/api/technologies')
      const data = await res.json()
      setTechSuggestions(data.technologies || [])
    } catch { /* non-fatal */ }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch { /* non-fatal */ }
  }

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
        addToast(`Category "${name}" created`)
        return true
      }
      addToast(data.error || 'Failed to create category', false)
      return false
    } catch {
      addToast('Failed to create category', false)
      return false
    }
  }

  // ── Open/close helpers ──

  function openNew(kind: PostKind) {
    setActiveKind(kind)
    if (kind === 'project') {
      setEditingProjectId(null)
      setProjectForm(PROJECT_EMPTY)
      setTechTags([])
      setResultKey('')
      setResultVal('')
    } else {
      setEditingFeedId(null)
      setFeedForm({ ...FEED_EMPTY, type: kind, category: FEED_CATEGORY_MAP[kind] ?? 'posts', date: new Date().toISOString().split('T')[0] })
    }
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function openEditFeed(item: FeedItem) {
    const kind: PostKind = item.type === 'project' ? 'project' : item.type === 'testimonial' ? 'testimonial' : 'post'
    if (kind === 'project') {
      // Find matching project record and open project form
      const proj = projects.find((p) => p.id === item.linkedProjectId)
      if (proj) {
        openEditProject(proj)
        return
      }
    }
    setActiveKind(kind)
    setEditingFeedId(item.id)
    setFeedForm({ ...item, media: item.media ?? [] })
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function openEditProject(project: Project) {
    setActiveKind('project')
    setEditingProjectId(project.id)
    setProjectForm({ ...project, images: project.images ?? [], content: project.content ?? [] })
    setTechTags(Array.isArray(project.tech) ? project.tech : [])
    const firstEntry = Object.entries(project.results ?? {})[0]
    setResultKey(firstEntry?.[0] ?? '')
    setResultVal(firstEntry?.[1] ?? '')
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function closeForm() {
    setActiveKind(null)
    setEditingFeedId(null)
    setEditingProjectId(null)
  }

  // ── Feed form helpers ──

  function setFeed(key: string, value: unknown) {
    setFeedForm((f) => ({ ...f, [key]: value }))
  }

  async function handleFeedUpload(files: FileList) {
    setFeedUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      try {
        // Direct-to-Cloudinary signed upload — bypasses Vercel's 4.5MB
        // serverless payload limit so large videos upload reliably.
        const result = await uploadFileDirect(file, { entityType: 'feed-posts' })
        uploaded.push(result.url)
      } catch (e) {
        addToast(e instanceof Error ? e.message : `Upload failed: ${file.name}`, false)
      }
    }
    if (uploaded.length > 0) {
      setFeedForm((f) => ({ ...f, media: [...(f.media ?? []), ...uploaded] }))
      addToast(`${uploaded.length} file(s) uploaded`)
    }
    setFeedUploading(false)
  }

  function handleFeedSelectExisting(urls: string[]) {
    const slots = 4 - (feedForm.media?.length || 0)
    const toAdd = urls.slice(0, slots)
    if (toAdd.length > 0) {
      setFeedForm((f) => ({ ...f, media: [...(f.media ?? []), ...toAdd] }))
      addToast(`${toAdd.length} media attached`)
    }
  }

  function removeFeedMedia(index: number) {
    setFeedForm((f) => ({ ...f, media: (f.media ?? []).filter((_, i) => i !== index) }))
  }

  async function handleFeedSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      ...feedForm,
      category: FEED_CATEGORY_MAP[feedForm.type] ?? 'posts',
      image: (feedForm.media ?? [])[0] ?? feedForm.image ?? '',
    }
    try {
      const method = editingFeedId ? 'PUT' : 'POST'
      const body = editingFeedId ? { id: editingFeedId, updates: payload } : payload
      const res = await fetch('/api/feed', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        addToast(editingFeedId ? 'Post updated' : 'Post published')
        fetchItems()
        closeForm()
      } else { addToast('Save failed', false) }
    } catch { addToast('Save failed', false) }
    finally { setSaving(false) }
  }

  // ── Project form helpers ──

  function setProject(key: string, value: unknown) {
    setProjectForm((f) => ({ ...f, [key]: value }))
  }

  async function handleGalleryUpload(files: FileList) {
    setGalleryUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      try {
        // Direct-to-Cloudinary signed upload — bypasses Vercel's 4.5MB
        // serverless payload limit so large videos upload reliably.
        const result = await uploadFileDirect(file, { entityType: 'portfolio-projects' })
        uploaded.push(result.url)
      } catch (e) {
        addToast(e instanceof Error ? e.message : `Upload failed: ${file.name}`, false)
      }
    }
    if (uploaded.length > 0) {
      setProjectForm((f) => ({ ...f, images: [...(f.images ?? []), ...uploaded] }))
      addToast(`${uploaded.length} image(s) added`)
    }
    setGalleryUploading(false)
  }

  function handleProjectSelectExisting(urls: string[]) {
    if (urls.length > 0) {
      setProjectForm((f) => ({ ...f, images: [...(f.images ?? []), ...urls] }))
      addToast(`${urls.length} media attached`)
    }
  }

  function removeGalleryImage(index: number) {
    setProjectForm((f) => ({ ...f, images: (f.images ?? []).filter((_, i) => i !== index) }))
  }

  function addBlock(type: ContentBlock['type']) {
    const block: ContentBlock = { id: newBlockId(), type }
    setProjectForm((f) => ({ ...f, content: [...(f.content ?? []), block] }))
  }

  function updateBlock(id: string, changes: Partial<ContentBlock>) {
    setProjectForm((f) => ({
      ...f,
      content: (f.content ?? []).map((b) => (b.id === id ? { ...b, ...changes } : b)),
    }))
  }

  function removeBlock(id: string) {
    setProjectForm((f) => ({ ...f, content: (f.content ?? []).filter((b) => b.id !== id) }))
  }

  async function handleProjectSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const results = resultKey.trim() ? { [resultKey.trim()]: resultVal.trim() } : {}
    const coverImage = projectForm.images?.[0] ?? projectForm.image ?? ''
    const payload = { ...projectForm, tech: techTags, results, image: coverImage }

    try {
      const method = editingProjectId ? 'PUT' : 'POST'
      const body = editingProjectId ? { id: editingProjectId, updates: payload } : payload
      const res = await fetch('/api/portfolio', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const saved = await res.json()
        addToast(editingProjectId ? 'Project updated' : 'Project added')

        if (!editingProjectId) {
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
          } catch { /* non-fatal */ }
        }

        fetchProjects()
        fetchItems()
        closeForm()
      } else { addToast('Save failed', false) }
    } catch { addToast('Save failed', false) }
    finally { setSaving(false) }
  }

  // ── Delete ──

  async function handleDeleteFeed(id: string) {
    try {
      const res = await fetch('/api/feed', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        addToast('Post deleted')
        setItems((prev) => prev.filter((i) => i.id !== id))
      } else { addToast('Delete failed', false) }
    } catch { addToast('Delete failed', false) }
    finally { setDeleteConfirm(null) }
  }

  const feedMediaCount = (feedForm.media ?? []).length
  const galleryCount = (projectForm.images ?? []).length

  const activeMeta = activeKind ? KIND_OPTIONS.find((k) => k.value === activeKind) : null
  const formTitle = (() => {
    if (!activeKind) return ''
    if (activeKind === 'project') return editingProjectId ? 'Edit Project' : 'Add New Project'
    if (activeKind === 'testimonial') return editingFeedId ? 'Edit Testimonial' : 'New Testimonial'
    return editingFeedId ? 'Edit Post' : 'New Post'
  })()

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <ToastStack toasts={toasts} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Feed Posts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} {items.length === 1 ? 'post' : 'posts'} total
          </p>
        </div>
        <TypePickerPopover onSelect={openNew} />
      </div>

      {/* ── Unified form panel ── */}
      {activeKind && (
        <div ref={formRef} className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
          {/* Form header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b border-border"
            style={{ background: (activeMeta?.color ?? '#f4a295') + '10' }}
          >
            <div className="flex items-center gap-2.5">
              {activeMeta && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: activeMeta.color + '20' }}
                >
                  <activeMeta.icon size={14} style={{ color: activeMeta.color }} />
                </div>
              )}
              <h3 className="font-semibold text-foreground text-sm">{formTitle}</h3>
            </div>
            <button
              onClick={closeForm}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── POST / TESTIMONIAL FORM ── */}
          {(activeKind === 'post' || activeKind === 'testimonial') && (
            <form onSubmit={handleFeedSubmit} className="p-5 space-y-4">
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

              {/* Media upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Media
                    <span className="ml-1 font-normal normal-case text-muted-foreground/70">— up to 4 files</span>
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
                    <input ref={feedFileRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => e.target.files && handleFeedUpload(e.target.files)} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={feedForm.date ? feedForm.date.slice(0, 10) : ''}
                  onChange={(e) => setFeed('date', e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                  style={{ backgroundColor: activeMeta?.color ?? '#f4a295', color: '#1a1a1a' }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editingFeedId ? 'Save changes' : 'Publish'}
                </button>
                <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* ── PROJECT FORM ── */}
          {activeKind === 'project' && (
            <form onSubmit={handleProjectSubmit} className="p-5 space-y-4">
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
                    <span className="ml-1 font-normal normal-case text-muted-foreground/70">— first image is cover</span>
                  </label>
                  {galleryCount > 0 && <span className="text-[11px] text-muted-foreground">{galleryCount} image{galleryCount !== 1 ? 's' : ''}</span>}
                </div>

                {galleryCount > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {(projectForm.images ?? []).map((url, i) => (
                      <div key={url + i} className="relative group/img rounded-xl overflow-hidden bg-muted border border-border">
                        {/\.(mp4|webm|mov)$/i.test(url) ? (
                          <video src={url} muted className="w-full h-20 object-cover" />
                        ) : (
                          <img src={url} alt="" className="w-full h-20 object-cover" />
                        )}
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
                  <input ref={galleryRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => e.target.files && handleGalleryUpload(e.target.files)} />
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
                              {/* Media picker — choose from uploaded project images */}
                              {(projectForm.images ?? []).length > 0 ? (
                                <div className="relative">
                                  <select
                                    value={block.url ?? ''}
                                    onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                                    className="w-full appearance-none px-3 py-2 pr-8 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                                  >
                                    <option value="">— Select a project image —</option>
                                    {(projectForm.images ?? []).map((url, idx) => (
                                      <option key={url} value={url}>
                                        Image {idx + 1}{idx === 0 ? ' (Cover)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  <Image size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                </div>
                              ) : (
                                /* Fallback: no gallery images yet — show thumbnail strip hint */
                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                                  <Image size={13} className="shrink-0" />
                                  Upload images in the &quot;Project Images&quot; section above to pick one here.
                                </div>
                              )}
                              {/* Visual thumbnail strip for quick reference */}
                              {(projectForm.images ?? []).length > 0 && (
                                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                                  {(projectForm.images ?? []).map((url, idx) => (
                                    <button
                                      key={url}
                                      type="button"
                                      onClick={() => updateBlock(block.id, { url })}
                                      title={`Image ${idx + 1}`}
                                      className={cn(
                                        'shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-all',
                                        block.url === url ? 'border-[#9db8e8] ring-1 ring-[#9db8e8]/40' : 'border-transparent hover:border-border',
                                      )}
                                    >
                                      <img src={url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              )}
                              {/* Caption */}
                              <input
                                type="text"
                                value={block.caption ?? ''}
                                onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                                placeholder="Caption (optional)..."
                                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                              />
                              {/* Preview */}
                              {block.url && (
                                <div className="rounded-xl overflow-hidden bg-muted border border-border">
                                  <img src={block.url} alt={block.caption ?? ''} className="w-full max-h-32 object-cover" />
                                </div>
                              )}
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
                  {editingProjectId ? 'Save changes' : 'Add project'}
                </button>
                <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Feed list ── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <div key={n} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-2xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Plus size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No posts yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const kindMeta =
              item.type === 'project'
                ? KIND_OPTIONS[2]
                : item.type === 'testimonial'
                ? KIND_OPTIONS[1]
                : KIND_OPTIONS[0]
            const TypeIcon = kindMeta.icon
            const isDeleting = deleteConfirm === item.id
            const allMedia = item.media?.length ? item.media : item.image ? [item.image] : []

            return (
              <div
                key={item.id}
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
                    {kindMeta.label} · <RelativeTime date={item.date} />
                    {allMedia.length > 0 && ` · ${allMedia.length} media`}
                  </p>
                </div>
                {isDeleting ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Delete?</span>
                    <button onClick={() => handleDeleteFeed(item.id)} className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:opacity-90 transition-opacity">Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">No</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditFeed(item)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MediaPickerModal isOpen={feedPickerOpen} onClose={() => setFeedPickerOpen(false)} multiple={true} onSelect={handleFeedSelectExisting} />
      <MediaPickerModal isOpen={projectPickerOpen} onClose={() => setProjectPickerOpen(false)} multiple={true} onSelect={handleProjectSelectExisting} />
    </div>
  )
}
