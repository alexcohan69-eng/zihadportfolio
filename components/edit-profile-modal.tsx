'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Save, Loader2, User, Hash, Calendar, BarChart2,
  MapPin, Phone, ChevronDown, ChevronUp, CheckCircle2, MousePointerClick,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SiteSettings } from '@/lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }

const inputCls = cn(
  'w-full px-3 py-2.5 rounded-xl bg-muted/60 border border-border',
  'outline-none focus:border-[#f4a295] focus:bg-background transition-colors',
  'text-sm placeholder:text-muted-foreground/40 text-foreground'
)

const labelCls = 'block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5'

function Field({ label, hint, children, className }: {
  label: string; hint?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('space-y-0', className)}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{hint}</p>}
    </div>
  )
}

function SectionHeader({ icon: Icon, label, accent = '#f4a295', open, onToggle }: {
  icon: React.ElementType; label: string; accent?: string; open: boolean; onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 border-b border-border/60 group"
    >
      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon size={15} style={{ color: accent }} />
        {label}
      </span>
      {open
        ? <ChevronUp size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        : <ChevronDown size={15} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      }
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  settings: SiteSettings
  onSaved: (updated: SiteSettings) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditProfileModal({ isOpen, onClose, settings, onSaved }: EditProfileModalProps) {
  const [form, setForm] = useState<SiteSettings>(() => clone(settings))
  const [tagsInput, setTagsInput] = useState(settings.hero.tags.join(', '))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Accordion open state — all open by default
  const [openSections, setOpenSections] = useState({
    basic: true,
    talks: true,
    joined: true,
    status: true,
    location: true,
    contact: true,
    button: true,
  })

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Sync when parent settings change (e.g. initial load)
  useEffect(() => {
    setForm(clone(settings))
    setTagsInput(settings.hero.tags.join(', '))
  }, [settings, isOpen])

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const setHero = useCallback(<K extends keyof SiteSettings['hero']>(key: K, val: SiteSettings['hero'][K]) => {
    setForm(prev => ({ ...prev, hero: { ...prev.hero, [key]: val } }))
  }, [])

  const setContact = useCallback(<K extends keyof SiteSettings['contact']>(key: K, val: SiteSettings['contact'][K]) => {
    setForm(prev => ({ ...prev, contact: { ...prev.contact, [key]: val } }))
  }, [])

  const setStatField = useCallback((index: number, key: 'value' | 'label', val: string) => {
    setForm(prev => {
      const next = clone(prev)
      next.hero.stats[index] = { ...next.hero.stats[index], [key]: val }
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const tagsArray = tagsInput.split(',').map(t => t.trim()).filter(Boolean)

    // Derive composite name and location
    const firstName = form.hero.firstName.trim()
    const lastName = form.hero.lastName.trim()
    const nickname = form.hero.nickname.trim()
    const name = [firstName, lastName].filter(Boolean).join(' ') || form.hero.name
    const city = form.hero.city.trim()
    const country = form.hero.country.trim()
    const location = [city, country].filter(Boolean).join(', ')

    // Append + to stat values that are plain numbers
    const normalizedStats = form.hero.stats.map(s => ({
      ...s,
      value: s.value && !s.value.includes('+') && /^\d+$/.test(s.value.trim())
        ? `${s.value.trim()}+`
        : s.value,
    }))

    const payload: SiteSettings = {
      ...form,
      hero: {
        ...form.hero,
        name,
        firstName,
        lastName,
        nickname,
        tags: tagsArray,
        city,
        country,
        location,
        stats: normalizedStats,
      },
      contact: { ...form.contact, address: location || form.contact.address },
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onSaved(payload)
        setSaved(true)
        setTimeout(() => { setSaved(false); onClose() }, 900)
      }
    } catch {
      // silent — user retries
    } finally {
      setSaving(false)
    }
  }, [form, tagsInput, onSaved, onClose])

  if (!mounted || !isOpen) return null

  const statsLabels = ['Projects count', 'Clients count', 'Years of experience']

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn(
          'relative w-full sm:max-w-lg bg-card border border-border shadow-2xl flex flex-col',
          'rounded-t-3xl sm:rounded-2xl',
          'max-h-[96dvh] sm:max-h-[90vh]',
          'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250'
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground leading-tight">Edit Profile</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Changes save to your live profile instantly.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 shadow-sm',
                saved ? 'bg-green-500 text-white' : 'text-[#1a1a1a]'
              )}
              style={saved ? {} : { backgroundColor: '#f4a295' }}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : <Save size={13} />}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 px-5 py-4 space-y-1 overscroll-contain">

          {/* ── Basic Info ── */}
          <SectionHeader icon={User} label="Basic Info" open={openSections.basic} onToggle={() => toggleSection('basic')} />
          {openSections.basic && (
            <div className="pt-4 pb-5 grid grid-cols-2 gap-3">
              <Field label="First Name">
                <input
                  className={inputCls}
                  value={form.hero.firstName}
                  onChange={e => setHero('firstName', e.target.value)}
                  placeholder="Zihad"
                />
              </Field>
              <Field label="Last Name">
                <input
                  className={inputCls}
                  value={form.hero.lastName}
                  onChange={e => setHero('lastName', e.target.value)}
                  placeholder="Imtiase"
                />
              </Field>
              <Field label="Nickname / Additional name" className="col-span-2">
                <input
                  className={inputCls}
                  value={form.hero.nickname}
                  onChange={e => setHero('nickname', e.target.value)}
                  placeholder="e.g. Zihad the Dev"
                />
              </Field>
              <Field label="Headline / Professional Title" className="col-span-2">
                <input
                  className={inputCls}
                  value={form.hero.title}
                  onChange={e => setHero('title', e.target.value)}
                  placeholder="Frontend Developer & Webflow Specialist"
                />
              </Field>
              <Field label="Short Bio" className="col-span-2">
                <textarea
                  rows={3}
                  className={cn(inputCls, 'resize-y leading-relaxed')}
                  value={form.hero.bio}
                  onChange={e => setHero('bio', e.target.value)}
                  placeholder="Crafting websites that drive engagement…"
                />
              </Field>
            </div>
          )}

          {/* ── Talks About ── */}
          <SectionHeader icon={Hash} label="Talks About" accent="#9db8e8" open={openSections.talks} onToggle={() => toggleSection('talks')} />
          {openSections.talks && (
            <div className="pt-4 pb-5">
              <Field label="Hashtag / Tag titles" hint="Comma-separated. Prefix with # or leave plain — both work.">
                <input
                  className={inputCls}
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="#frontend, #webflow, #react"
                />
              </Field>
            </div>
          )}

          {/* ── Joined Date ── */}
          <SectionHeader icon={Calendar} label="Joined Date" accent="#a8d5c2" open={openSections.joined} onToggle={() => toggleSection('joined')} />
          {openSections.joined && (
            <div className="pt-4 pb-5">
              <Field label="Join Date" hint='Pick a date — displayed as "Joined Month YYYY" on the profile.'>
                <input
                  type="date"
                  className={inputCls}
                  value={(() => {
                    // Convert stored "Joined March 2022" → YYYY-MM-DD for the input
                    const raw = form.hero.joinDate
                    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
                    const parsed = new Date(raw.replace('Joined ', ''))
                    if (!isNaN(parsed.getTime())) {
                      return parsed.toISOString().split('T')[0]
                    }
                    return ''
                  })()}
                  onChange={e => {
                    const d = new Date(e.target.value)
                    if (!isNaN(d.getTime())) {
                      const formatted = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      setHero('joinDate', `Joined ${formatted}`)
                    } else {
                      setHero('joinDate', e.target.value)
                    }
                  }}
                />
              </Field>
            </div>
          )}

          {/* ── Current Status (Stats) ── */}
          <SectionHeader icon={BarChart2} label="Current Status" open={openSections.status} onToggle={() => toggleSection('status')} />
          {openSections.status && (
            <div className="pt-4 pb-5 grid grid-cols-1 gap-3">
              <p className="text-[11px] text-muted-foreground -mt-1">Enter numbers only — a <span className="text-foreground font-semibold">+</span> sign is appended automatically on the public profile.</p>
              {(form.hero.stats.length > 0 ? form.hero.stats : [
                { value: '', label: 'Projects' },
                { value: '', label: 'Clients' },
                { value: '', label: 'Years' },
              ]).map((stat, i) => (
                <div key={i} className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className={labelCls}>{statsLabels[i] ?? stat.label}</p>
                    <input
                      type="number"
                      min={0}
                      className={cn(inputCls, 'mt-0')}
                      // Strip any trailing + for the number input display
                      value={stat.value.replace(/\+$/, '')}
                      onChange={e => setStatField(i, 'value', e.target.value)}
                      placeholder={i === 0 ? '50' : i === 1 ? '40' : '4'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Location ── */}
          <SectionHeader icon={MapPin} label="Location" accent="#f4a295" open={openSections.location} onToggle={() => toggleSection('location')} />
          {openSections.location && (
            <div className="pt-4 pb-5 grid grid-cols-2 gap-3">
              <Field label="Country">
                <input
                  className={inputCls}
                  value={form.hero.country}
                  onChange={e => setHero('country', e.target.value)}
                  placeholder="Bangladesh"
                />
              </Field>
              <Field label="City">
                <input
                  className={inputCls}
                  value={form.hero.city}
                  onChange={e => setHero('city', e.target.value)}
                  placeholder="Dhaka Cantonment"
                />
              </Field>
            </div>
          )}

          {/* ── Contact Info ── */}
          <SectionHeader icon={Phone} label="Contact Info" accent="#a8d5c2" open={openSections.contact} onToggle={() => toggleSection('contact')} />
          {openSections.contact && (
            <div className="pt-4 pb-6 grid grid-cols-1 gap-3">
              <Field label="Email Address">
                <input
                  type="email"
                  className={inputCls}
                  value={form.contact.email}
                  onChange={e => setContact('email', e.target.value)}
                  placeholder="hello@domain.com"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone No">
                  <input
                    className={inputCls}
                    value={form.contact.phone}
                    onChange={e => setContact('phone', e.target.value)}
                    placeholder="+880 1…"
                  />
                </Field>
                <Field label="WhatsApp No">
                  <input
                    className={inputCls}
                    value={form.contact.whatsapp}
                    onChange={e => setContact('whatsapp', e.target.value)}
                    placeholder="+880 1…"
                  />
                </Field>
              </div>
              <Field label="Contact Heading">
                <input
                  className={inputCls}
                  value={form.contact.contactHeading}
                  onChange={e => setContact('contactHeading', e.target.value)}
                  placeholder="Got a project in mind?"
                />
              </Field>
              <Field label="Contact Sub-details Heading">
                <textarea
                  rows={2}
                  className={cn(inputCls, 'resize-y leading-relaxed')}
                  value={form.contact.contactSubHeading}
                  onChange={e => setContact('contactSubHeading', e.target.value)}
                  placeholder="Let's build something great together…"
                />
              </Field>
            </div>
          )}

          {/* ── Profile Button ── */}
          <SectionHeader icon={MousePointerClick} label="Profile Button" accent="#f4a295" open={openSections.button} onToggle={() => toggleSection('button')} />
          {openSections.button && (
            <div className="pt-4 pb-6 grid grid-cols-1 gap-3">
              <p className="text-[11px] text-muted-foreground -mt-1">This button appears prominently on your public profile. Leave blank to hide it.</p>
              <Field label="Button Text">
                <input
                  className={inputCls}
                  value={form.hero.profileButtonText ?? ''}
                  onChange={e => setHero('profileButtonText', e.target.value)}
                  placeholder="Hire Me"
                />
              </Field>
              <Field label="Button Link / URL" hint="Use a full URL (https://…), mailto:, or an internal path like /contact.">
                <input
                  className={inputCls}
                  value={form.hero.profileButtonLink ?? ''}
                  onChange={e => setHero('profileButtonLink', e.target.value)}
                  placeholder="/contact  or  https://wa.me/…"
                />
              </Field>
            </div>
          )}
        </div>

        {/* ── Sticky Footer Save (mobile) ── */}
        <div className="shrink-0 px-5 py-3 border-t border-border bg-card sm:hidden">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] shadow-sm',
              saved ? 'bg-green-500 text-white' : 'text-[#1a1a1a]'
            )}
            style={saved ? {} : { backgroundColor: '#f4a295' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
