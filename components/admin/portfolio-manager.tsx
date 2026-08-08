'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Trash2, Edit2, Plus, X, Check, Upload, ExternalLink, Image,
  Code, Loader2, Star, TrendingUp, AlignLeft, GripVertical, ImagePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MediaPickerModal } from './media-picker-modal'
import { ToastStack, UploadFormatPicker, type UploadFormat } from './shared'
import { useToast } from '@/hooks/use-toast'
import { CreatableSelect } from './creatable-select'
import { TechTagInput } from './tech-tag-input'

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

const EMPTY: Omit<Project, 'id'> = {
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

export function PortfolioManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Project, 'id'>>(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploadFormat, setUploadFormat] = useState<UploadFormat>('webp')
  const { toasts, addToast } = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [techTags, setTechTags] = useState<string[]>([])
  const [techSuggestions, setTechSuggestions] = useState<string[]>([])
  const [resultKey, setResultKey] = useState('')
  const [resultVal, setResultVal] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  const galleryRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchProjects()
    fetchCategories()
    fetchTechSuggestions()
  }, [])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/portfolio')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch {
      addToast('Failed to load projects', false)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch {
      // Non-fatal
    }
  }

  async function fetchTechSuggestions() {
    try {
      const res = await fetch('/api/technologies')
      const data = await res.json()
      setTechSuggestions(data.technologies || [])
    } catch {
      // Non-fatal
    }
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
      } else {
        addToast(data.error || 'Failed to create category', false)
        return false
      }
    } catch {
      addToast('Failed to create category', false)
      return false
    }
  }

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openNew() {
    setEditingId(null)
    setForm(EMPTY)
    setTechTags([])
    setResultKey('')
    setResultVal('')
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function openEdit(project: Project) {
    setEditingId(project.id)
    setForm({ ...project, images: project.images ?? [], content: project.content ?? [] })
    setTechTags(Array.isArray(project.tech) ? project.tech : [])
    const firstEntry = Object.entries(project.results ?? {})[0]
    setResultKey(firstEntry?.[0] ?? '')
    setResultVal(firstEntry?.[1] ?? '')
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  async function handleGalleryUpload(files: FileList) {
    setGalleryUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('format', uploadFormat) // Compress format logic

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (data.success) uploaded.push(data.url)
        else addToast(`Upload failed: ${file.name}`, false)
      } catch {
        addToast(`Upload failed: ${file.name}`, false)
      }
    }
    if (uploaded.length > 0) {
      setForm((f) => ({ ...f, images: [...(f.images ?? []), ...uploaded] }))
      addToast(`${uploaded.length} image(s) added`)
    }
    setGalleryUploading(false)
  }

  function handleSelectExisting(urls: string[]) {
    if (urls.length > 0) {
      setForm((f) => ({ ...f, images: [...(f.images ?? []), ...urls] }))
      addToast(`${urls.length} media attached`)
    }
  }

  function removeGalleryImage(index: number) {
    setForm((f) => ({ ...f, images: (f.images ?? []).filter((_, i) => i !== index) }))
  }

  function addBlock(type: ContentBlock['type']) {
    const block: ContentBlock = { id: newBlockId(), type }
    setForm((f) => ({ ...f, content: [...(f.content ?? []), block] }))
  }

  function updateBlock(id: string, changes: Partial<ContentBlock>) {
    setForm((f) => ({
      ...f,
      content: (f.content ?? []).map((b) => (b.id === id ? { ...b, ...changes } : b)),
    }))
  }

  function removeBlock(id: string) {
    setForm((f) => ({ ...f, content: (f.content ?? []).filter((b) => b.id !== id) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const results = resultKey.trim() ? { [resultKey.trim()]: resultVal.trim() } : {}
    const coverImage = form.images?.[0] ?? form.image ?? ''
    const payload = { ...form, tech: techTags, results, image: coverImage }

    try {
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId ? { id: editingId, updates: payload } : payload
      const res = await fetch('/api/portfolio', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const saved = await res.json()
        addToast(editingId ? 'Project updated' : 'Project added')

        // Auto-sync: when creating a NEW project, publish a matching feed post
        if (!editingId) {
          const projectData = saved.project ?? payload
          const feedPost = {
            type: 'project',
            category: 'projects',
            title: projectData.title,
            excerpt: projectData.description,
            content: projectData.description,
            author: 'Zihad Imtiase',
            image: coverImage,
            media: form.images ?? [],
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
          } catch {
            // Non-fatal: project was saved, feed sync failed silently
          }
        }

        fetchProjects()
        closeForm()
      } else {
        addToast('Save failed', false)
      }
    } catch {
      addToast('Save failed', false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/portfolio', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        addToast('Project deleted')
        setProjects((prev) => prev.filter((p) => p.id !== id))
      } else {
        addToast('Delete failed', false)
      }
    } catch {
      addToast('Delete failed', false)
    } finally {
      setDeleteConfirm(null)
    }
  }

  const galleryCount = (form.images ?? []).length

  return (
    <div className="relative">
      <ToastStack toasts={toasts} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Projects</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} total
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      <UploadFormatPicker value={uploadFormat} onChange={setUploadFormat} />

      {showForm && (
        <div ref={formRef} className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border" style={{ background: '#f4a29510' }}>
            <h3 className="font-semibold text-foreground text-sm">{editingId ? 'Edit Project' : 'Add New Project'}</h3>
            <button onClick={closeForm} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Category</label>
                <CreatableSelect
                  value={form.category}
                  onChange={(val) => set('category', val)}
                  categories={categories}
                  onCreateCategory={handleCreateCategory}
                  disabled={saving}
                />
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Featured</label>
                <button type="button" onClick={() => set('featured', !form.featured)} className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all', form.featured ? 'border-transparent' : 'border-border text-muted-foreground')} style={form.featured ? { backgroundColor: '#f4a29520', color: '#f4a295', borderColor: '#f4a29540' } : {}}>
                  <Star size={13} fill={form.featured ? '#f4a295' : 'none'} style={{ color: form.featured ? '#f4a295' : undefined }} /> Featured
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Project Title <span className="text-destructive">*</span></label>
              <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. SaaS Landing Page for TechStart" required className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What did you build and what problem did it solve?" rows={3} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none" />
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
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Key Result <span className="text-xs font-normal normal-case text-muted-foreground">(shown as metric badge)</span></label>
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
                  <input type="url" value={form.link || ''} onChange={(e) => set('link', e.target.value)} placeholder="https://example.com" className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">GitHub URL</label>
                <div className="relative">
                  <Code size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="url" value={form.github || ''} onChange={(e) => set('github', e.target.value)} placeholder="https://github.com/..." className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Project Images
                  <span className="ml-1 font-normal normal-case text-muted-foreground/70">— first image used as cover</span>
                </label>
                {galleryCount > 0 && <span className="text-[11px] text-muted-foreground">{galleryCount} image{galleryCount !== 1 ? 's' : ''}</span>}
              </div>

              {galleryCount > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {(form.images ?? []).map((url, i) => (
                    <div key={url + i} className="relative group/img rounded-xl overflow-hidden bg-muted border border-border">
                      <img src={url} alt="" className="w-full h-20 object-cover" />
                      {i === 0 && <div className="absolute top-1 left-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/70 text-white">Cover</div>}
                      <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div onClick={() => !galleryUploading && galleryRef.current?.click()} className={cn('border-2 border-dashed rounded-xl transition-colors cursor-pointer', galleryUploading ? 'border-brand/40 bg-brand/5' : 'border-border hover:border-[#f4a295]/50 hover:bg-muted/30')}>
                  <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground">
                    {galleryUploading ? <Loader2 size={18} className="animate-spin text-[#f4a295]" /> : <><Upload size={18} /><span className="text-xs">Upload New</span></>}
                  </div>
                </div>
                <div onClick={() => setPickerOpen(true)} className="border-2 border-dashed rounded-xl transition-colors cursor-pointer border-border hover:border-[#f4a295]/50 hover:bg-muted/30">
                  <div className="flex flex-col items-center gap-1.5 py-4 text-muted-foreground"><ImagePlus size={18} /><span className="text-xs">Choose Existing</span></div>
                </div>
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleGalleryUpload(e.target.files)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detailed Content</label>
              {(form.content ?? []).length > 0 && (
                <div className="space-y-2 mb-2">
                  {(form.content ?? []).map((block) => (
                    <div key={block.id} className="flex gap-2 items-start group/block">
                      <div className="mt-2.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab transition-colors"><GripVertical size={14} /></div>
                      <div className="flex-1 min-w-0">
                        {block.type === 'heading' && <input type="text" value={block.text ?? ''} onChange={(e) => updateBlock(block.id, { text: e.target.value })} placeholder="Section heading..." className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />}
                        {block.type === 'paragraph' && <textarea value={block.text ?? ''} onChange={(e) => updateBlock(block.id, { text: e.target.value })} placeholder="Write a paragraph..." rows={3} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none" />}
                        {block.type === 'image' && (
                          <div className="space-y-1.5">
                            <input type="url" value={block.url ?? ''} onChange={(e) => updateBlock(block.id, { url: e.target.value })} placeholder="Image URL (from gallery above)..." className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                            <input type="text" value={block.caption ?? ''} onChange={(e) => updateBlock(block.id, { caption: e.target.value })} placeholder="Caption (optional)..." className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                            {block.url && <div className="rounded-xl overflow-hidden bg-muted border border-border"><img src={block.url} alt={block.caption ?? ''} className="w-full max-h-32 object-cover" /></div>}
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
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60" style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {editingId ? 'Save changes' : 'Add project'}
              </button>
              <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <div key={n} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-2xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><Plus size={20} className="text-muted-foreground" /></div>
          <p className="text-sm text-muted-foreground">No projects yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const isDeleting = deleteConfirm === project.id
            const coverImage = project.images?.[0] ?? project.image
            return (
              <div key={project.id} className={cn('group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all', isDeleting ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card hover:border-border/80 hover:bg-muted/30')}>
                {coverImage ? <img src={coverImage} alt={project.title} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-border" style={{ backgroundColor: '#f4a29515' }}><TrendingUp size={16} style={{ color: '#f4a295' }} /></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-sm font-semibold text-foreground truncate">{project.title}</p>{project.featured && <Star size={11} fill="#f4a295" style={{ color: '#f4a295' }} className="shrink-0" />}</div>
                  <p className="text-xs text-muted-foreground capitalize">{project.category}{project.tech?.length > 0 && ` · ${project.tech.slice(0, 2).join(', ')}`}{(project.images?.length ?? 0) > 0 && ` · ${project.images!.length} image${project.images!.length !== 1 ? 's' : ''}`}</p>
                </div>
                {isDeleting ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Delete?</span>
                    <button onClick={() => handleDelete(project.id)} className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:opacity-90">Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground">No</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(project)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => setDeleteConfirm(project.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MediaPickerModal 
        isOpen={pickerOpen} 
        onClose={() => setPickerOpen(false)} 
        multiple={true}
        onSelect={handleSelectExisting} 
      />
    </div>
  )
}
