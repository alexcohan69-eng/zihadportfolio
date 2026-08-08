'use client'

import Link from 'next/link'
import { MapPin, Calendar, MessageCircle, Mail, Briefcase, Pencil, Trash2 } from 'lucide-react'
import { MediaPicker } from '@/components/media-picker'

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Testimonials', value: 'testimonials' },
  { label: 'Projects', value: 'projects' },
]

export interface HeroData {
  coverMedia?: string
  profileMedia?: string
  firstName?: string
  lastName?: string
  nickname?: string
  name?: string
  title?: string
  bio?: string
  tags?: string[]
  location?: string
  joinDate?: string
  stats?: { value: string; label: string }[]
  hireMeLink?: string
  profileButtonText?: string
  profileButtonLink?: string
}

export interface ContactData {
  email?: string
}

interface ProfileHeroProps {
  activeFilter?: string
  onFilterChange?: (value: string) => void
  heroData?: HeroData
  contactData?: ContactData
  isAdmin?: boolean
  onCoverChange?: (url: string) => void
  onCoverDelete?: () => void
  onAvatarChange?: (url: string) => void
  onAvatarDelete?: () => void
  onEditProfile?: () => void
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)$/i.test(url)
}

// Small floating action button used for media edit overlays
function EditChip({
  onPickMedia,
  onDelete,
  hasMedia,
  label,
}: {
  onPickMedia: (url: string) => void
  onDelete: () => void
  hasMedia: boolean
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      {/* MediaPicker wrapped in a styled chip */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded-full bg-background/90 backdrop-blur border border-border shadow-sm hover:bg-background transition-colors"
        title={`Change ${label}`}
      >
        <MediaPicker onSelect={(m) => onPickMedia(m[0].url)} />
      </div>
      {hasMedia && (
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/90 backdrop-blur text-white shadow-sm hover:bg-destructive transition-colors"
          title={`Remove ${label}`}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

export function ProfileHero({
  activeFilter = 'all',
  onFilterChange,
  heroData = {},
  contactData = {},
  isAdmin = false,
  onCoverChange,
  onCoverDelete,
  onAvatarChange,
  onAvatarDelete,
  onEditProfile,
}: ProfileHeroProps) {
  const coverMedia = heroData.coverMedia || ''
  const profileMedia = heroData.profileMedia || ''
  const firstName = heroData.firstName || ''
  const lastName = heroData.lastName || ''
  const nickname = heroData.nickname || ''
  const name = heroData.name || 'Zihad Imtiase'
  // Build display name: "First Last (Nickname)" if nickname exists
  const displayName = (() => {
    const base = [firstName, lastName].filter(Boolean).join(' ') || name
    return nickname ? `${base} (${nickname})` : base
  })()
  const title = heroData.title || 'Frontend Developer & Webflow Specialist'
  const bio = heroData.bio || 'Crafting websites that drive engagement, conversions & success.'
  const tags = heroData.tags?.length ? heroData.tags : ['#frontend', '#webflow', '#react', '#landingpage', '#CRO']
  const location = heroData.location || 'Dhaka Cantonment, Bangladesh'
  const joinDate = heroData.joinDate || 'Joined March 2022'
  const rawStats = heroData.stats?.length ? heroData.stats : [
    { value: '50+', label: 'Projects' },
    { value: '40+', label: 'Clients' },
    { value: '4+', label: 'Years' },
  ]
  // Auto-append + to pure numeric values
  const stats = rawStats.map(s => ({
    ...s,
    value: /^\d+$/.test(s.value.trim()) ? `${s.value.trim()}+` : s.value,
  }))
  const email = contactData.email || ''

  // Dynamic profile button
  const btnText = heroData.profileButtonText?.trim() || 'Hire Me'
  const btnLink = heroData.profileButtonLink?.trim() || heroData.hireMeLink || '/contact'
  const isBtnMail = btnLink.startsWith('mailto:')
  const isBtnWhatsApp = btnLink.includes('wa.me') || btnLink.includes('whatsapp')
  const BtnIcon = isBtnMail ? Mail : isBtnWhatsApp ? MessageCircle : Briefcase
  const isBtnExternal = btnLink.startsWith('http') || btnLink.startsWith('mailto:')

  return (
    <div className="border-b border-border">
      {/* Banner */}
      <div className="h-28 md:h-36 w-full relative overflow-hidden">
        {coverMedia ? (
          isVideo(coverMedia) ? (
            <video src={coverMedia} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <img src={coverMedia} alt={`${displayName} — cover photo`} className="absolute inset-0 w-full h-full object-cover" />
          )
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #f4a29520 0%, #e8806f18 50%, #f4a29508 100%)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#f4a295]/30 via-background/10 to-background/60 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: 'radial-gradient(circle, #f4a295 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Admin: Cover edit controls */}
        {isAdmin && (
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
            <EditChip
              onPickMedia={(url) => onCoverChange?.(url)}
              onDelete={() => onCoverDelete?.()}
              hasMedia={!!coverMedia}
              label="cover"
            />
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-border text-muted-foreground leading-tight whitespace-nowrap">
              Recommended: 16:9 &bull; 1500&times;500px
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {/* Avatar Row */}
        <div className="flex items-end justify-between -mt-9 mb-3 relative z-10">
          <div className="relative">
            {profileMedia ? (
              isVideo(profileMedia) ? (
                <video src={profileMedia} autoPlay muted loop playsInline className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-background object-cover shadow-md" />
              ) : (
                <img src={profileMedia} alt={displayName} className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-background object-cover shadow-md" />
              )
            ) : (
              <div
                className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-background flex items-center justify-center font-bold text-2xl shadow-md uppercase"
                style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
              >
                {name.slice(0, 2)}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />

            {/* Admin: Avatar edit pencil overlay */}
            {isAdmin && (
              <div className="absolute -bottom-1 -right-1 z-20">
                <div className="w-7 h-7 rounded-full bg-background/95 border border-border shadow-sm flex items-center justify-center overflow-hidden">
                  <MediaPicker onSelect={(m) => onAvatarChange?.(m[0].url)} />
                </div>
              </div>
            )}
          </div>

          {/* Profile Button + Admin Edit Profile button */}
          <div className="flex items-center gap-2">
            {btnText && (isBtnExternal ? (
              <a
                href={btnLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-95 shadow-sm"
                style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
              >
                <BtnIcon size={14} />
                {btnText}
              </a>
            ) : (
              <Link
                href={btnLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-95 shadow-sm"
                style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
              >
                <BtnIcon size={14} />
                {btnText}
              </Link>
            ))}

            {/* Admin: Main Edit Profile pencil button */}
            {isAdmin && (
              <button
                onClick={onEditProfile}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-border bg-card hover:bg-muted transition-all active:scale-95 shadow-sm text-foreground"
                title="Edit profile"
              >
                <Pencil size={13} style={{ color: '#f4a295' }} />
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Name + Title */}
        <h1 className="font-bold text-xl text-foreground leading-tight">{displayName}</h1>
        <p className="text-sm text-muted-foreground mb-2">{title}</p>

        {/* Bio */}
        <p className="text-sm text-foreground leading-relaxed mb-3 whitespace-pre-wrap">
          {bio}{' '}
          <span className="text-muted-foreground inline-block mt-1">
            {tags.map((t, idx) => (
              <span key={idx} style={{ color: '#f4a295' }} className="mr-1.5">
                {t.startsWith('#') ? t : `#${t}`}
              </span>
            ))}
          </span>
        </p>

        {/* Meta Row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-1">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} style={{ color: '#f4a295' }} />
              {location}
            </span>
          )}
          {joinDate && (
            <span className="flex items-center gap-1">
              <Calendar size={11} style={{ color: '#f4a295' }} />
              {joinDate}
            </span>
          )}
        </div>

        {email && (
          <div className="mb-4">
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-[#f4a295] transition-colors"
            >
              <Mail size={12} className="text-[#f4a295]" />
              {email}
            </a>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-6 text-sm">
          {stats.map(({ value, label }, index) => (
            <div key={index} className="flex items-baseline gap-1">
              <span className="font-bold text-foreground">{value}</span>
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-t border-border">
        {TABS.map((tab) => {
          const active = activeFilter === tab.value
          return (
            <button
              key={tab.value}
              onClick={() => onFilterChange?.(tab.value)}
              className="flex-1 py-3 text-xs font-semibold transition-colors border-b-2"
              style={
                active
                  ? { borderColor: '#f4a295', color: '#f4a295' }
                  : { borderColor: 'transparent', color: 'var(--muted-foreground)' }
              }
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
