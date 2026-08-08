'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Trash2, Edit2, Plus, X, Check, Loader2, Briefcase, Clock, DollarSign, ListChecks, Power, ImagePlus, Film, Music,
  MessageSquareQuote, Share2, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastStack } from './shared'
import { useToast } from '@/hooks/use-toast'
import { MediaPickerModal } from './media-picker-modal'
import { shareServiceToFeed } from '@/lib/data-actions'
import type { FeedItem, Service } from '@/lib/types'

const EMPTY: Omit<Service, 'id' | 'slug'> = {
  title: '',
  description: '',
  price: '',
  deliveryTime: '',
  features: [],
  media: [],
  isActive: true,
  linkedTestimonials: [],
}

function mediaKind(url: string): 'image' | 'video' | 'audio' {
  if (/\.(mp4|webm|mov)$/i.test(url)) return 'video'
  if (/\.(mp3|ogg|wav|aac|flac|m4a)$/i.test(url)) return 'audio'
  return 'image'
}

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Service, 'id' | 'slug'>>(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [featureInput, setFeatureInput] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [testimonials, setTestimonials] = useState<FeedItem[]>([])
  const [shareTarget, setShareTarget] = useState<Service | null>(null)
  const [shareCaption, setShareCaption] = useState('')
  const [sharing, setSharing] = useState(false)
  const { toasts, addToast } = useToast()
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchServices()
    fetchTestimonials()
  }, [])

  async function fetchServices() {
    try {
      const res = await fetch('/api/services?all=true')
      const data = await res.json()
      setServices(data.services || [])
    } catch {
      addToast('Failed to load services', false)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTestimonials() {
    try {
      const res = await fetch('/api/feed')
      const data = await res.json()
      setTestimonials((data.items || []).filter((item: FeedItem) => item.type === 'testimonial'))
    } catch {
      // Non-critical — testimonial linking simply stays empty.
    }
  }

  function toggleTestimonial(id: string) {
    setForm((f) => {
      const current = f.linkedTestimonials ?? []
      return {
        ...f,
        linkedTestimonials: current.includes(id)
          ? current.filter((t) => t !== id)
          : [...current, id],
      }
    })
  }

  function openShare(service: Service) {
    setShareTarget(service)
    setShareCaption('')
  }

  async function handleShare() {
    if (!shareTarget) return
    setSharing(true)
    try {
      const result = await shareServiceToFeed(shareTarget.id, shareCaption)
      if (result.success) {
        addToast('Shared to feed')
        setShareTarget(null)
        setShareCaption('')
      } else {
        addToast(result.error || 'Failed to share', false)
      }
    } catch {
      addToast('Failed to share', false)
    } finally {
      setSharing(false)
    }
  }

  function set(key: keyof Omit<Service, 'id' | 'slug'>, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function addMedia(urls: string[]) {
    setForm((f) => ({ ...f, media: [...f.media, ...urls.filter((u) => !f.media.includes(u))] }))
  }

  function removeMedia(url: string) {
    setForm((f) => ({ ...f, media: f.media.filter((m) => m !== url) }))
  }

  function openNew() {
    setEditingId(null)
    setForm(EMPTY)
    setFeatureInput('')
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function openEdit(service: Service) {
    setEditingId(service.id)
    const { id, slug, testimonials: _testimonials, ...rest } = service
    setForm({
      ...rest,
      features: service.features ?? [],
      media: service.media ?? [],
      linkedTestimonials: service.linkedTestimonials ?? [],
    })
    setFeatureInput('')
    setShowForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  function addFeature() {
    const val = featureInput.trim()
    if (!val) return
    setForm((f) => ({ ...f, features: [...f.features, val] }))
    setFeatureInput('')
  }

  function removeFeature(index: number) {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== index) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/services/${editingId}` : '/api/services'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        addToast(editingId ? 'Service updated' : 'Service added')
        fetchServices()
        closeForm()
      } else {
        const data = await res.json().catch(() => ({}))
        addToast(data.error || 'Save failed', false)
      }
    } catch {
      addToast('Save failed', false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' })
      if (res.ok) {
        addToast('Service deleted')
        setServices((prev) => prev.filter((s) => s.id !== id))
      } else {
        addToast('Delete failed', false)
      }
    } catch {
      addToast('Delete failed', false)
    } finally {
      setDeleteConfirm(null)
    }
  }

  async function toggleActive(service: Service) {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive }),
      })
      if (res.ok) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, isActive: !s.isActive } : s)),
        )
      }
    } catch {
      addToast('Failed to update status', false)
    }
  }

  return (
    <div className="relative">
      <ToastStack toasts={toasts} />

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Services</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {services.length} {services.length === 1 ? 'service' : 'services'} total
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {showForm && (
        <div ref={formRef} className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4 border-b border-border"
            style={{ background: '#f4a29510' }}
          >
            <h3 className="font-semibold text-foreground text-sm">
              {editingId ? 'Edit Service' : 'Add New Service'}
            </h3>
            <button
              onClick={closeForm}
              className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Service Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Landing Page Design"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What does this service include?"
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Price</label>
                <div className="relative">
                  <DollarSign size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="Starting at $500"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Delivery Time</label>
                <div className="relative">
                  <Clock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.deliveryTime}
                    onChange={(e) => set('deliveryTime', e.target.value)}
                    placeholder="5-7 days"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Gallery Media
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                {form.media.map((url) => {
                  const kind = mediaKind(url)
                  return (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group/media">
                      {kind === 'image' ? (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          {kind === 'video' ? <Film size={18} /> : <Music size={18} />}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(url)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-brand/40 transition-colors"
                >
                  <ImagePlus size={18} />
                  <span className="text-[10px] font-medium">Add</span>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">First item is used as the cover on the services list.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Deliverables / Features
              </label>
              {form.features.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {form.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                      <ListChecks size={13} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 text-sm text-foreground truncate">{feat}</span>
                      <button type="button" onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      addFeature()
                    }
                  }}
                  placeholder="e.g. 2 rounds of revisions"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Linked Testimonials
              </label>
              {testimonials.length === 0 ? (
                <p className="text-xs text-muted-foreground px-3.5 py-2.5 rounded-xl border border-dashed border-border">
                  No testimonials yet. Add one from the Feed manager to link it here.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {testimonials.map((t) => {
                    const checked = (form.linkedTestimonials ?? []).includes(t.id)
                    return (
                      <label
                        key={t.id}
                        className={cn(
                          'flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                          checked ? 'border-brand bg-brand/5' : 'border-border hover:bg-muted/50',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTestimonial(t.id)}
                          className="mt-0.5 accent-[#f4a295]"
                        />
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <MessageSquareQuote size={12} className="text-muted-foreground shrink-0" />
                            {t.clientName || 'Anonymous'}
                            {t.clientRole && <span className="text-xs text-muted-foreground">· {t.clientRole}</span>}
                          </span>
                          <span className="block text-xs text-muted-foreground line-clamp-1">{t.excerpt}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1.5">Selected testimonials appear in the Client Reviews section on this service&apos;s page.</p>
            </div>

            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Visible on the public services page</p>
              </div>
              <button
                type="button"
                onClick={() => set('isActive', !form.isActive)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors shrink-0',
                  form.isActive ? 'bg-[#f4a295]' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                    form.isActive && 'translate-x-5',
                  )}
                />
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingId ? 'Save changes' : 'Add service'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => <div key={n} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 rounded-2xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Briefcase size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No services yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((service) => {
            const isDeleting = deleteConfirm === service.id
            return (
              <div
                key={service.id}
                className={cn(
                  'group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                  isDeleting ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card hover:border-border/80 hover:bg-muted/30',
                )}
              >
                {service.media?.[0] && mediaKind(service.media[0]) === 'image' ? (
                  <img src={service.media[0]} alt={service.title} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-border" style={{ backgroundColor: '#f4a29515' }}>
                    <Briefcase size={16} style={{ color: '#f4a295' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{service.title}</p>
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0',
                        service.isActive ? 'bg-[#a8d5c2]/20 text-[#4f8a6d]' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {service.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {service.price || 'No price set'}
                    {service.deliveryTime && ` · ${service.deliveryTime}`}
                    {service.features?.length > 0 && ` · ${service.features.length} feature${service.features.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                {isDeleting ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">Delete?</span>
                    <button onClick={() => handleDelete(service.id)} className="px-3 py-1.5 rounded-lg bg-destructive text-white text-xs font-semibold hover:opacity-90">Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground">No</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openShare(service)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Share to feed">
                      <Share2 size={14} />
                    </button>
                    <button onClick={() => toggleActive(service)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Toggle active">
                      <Power size={14} />
                    </button>
                    <button onClick={() => openEdit(service)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm(service.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={addMedia}
        multiple
      />

      {shareTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Share &ldquo;{shareTarget.title}&rdquo; to Feed</h3>
              <button
                onClick={() => setShareTarget(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Custom caption
                </label>
                <textarea
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                  placeholder={shareTarget.description}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Leave blank to use the service description. The feed post links directly to this service.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                  style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
                >
                  {sharing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Share to feed
                </button>
                <button
                  onClick={() => setShareTarget(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
