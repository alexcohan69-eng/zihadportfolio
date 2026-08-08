'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { PageShell } from '@/components/page-shell'
import { ProfileHero, type HeroData, type ContactData } from '@/components/profile-hero'
import { FeedItem } from '@/components/feed-item'
import { useAdminStatus } from '@/hooks/use-admin-status'
import type { FeedItem as FeedItemType } from '@/lib/data'
import type { SiteSettings } from '@/lib/types'

interface HomeClientProps {
  initialItems: FeedItemType[]
  heroData: HeroData
  contactData?: ContactData
  initialSettings: SiteSettings
}

export function HomeClient({ initialItems, heroData, contactData = {}, initialSettings }: HomeClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = useAdminStatus()

  // Live settings state — drives real-time UI updates on save
  const [liveSettings, setLiveSettings] = useState<SiteSettings>(initialSettings)

  // Derive HeroData + ContactData from live settings
  const liveHeroData: HeroData = {
    coverMedia: liveSettings.hero.coverMedia,
    profileMedia: liveSettings.hero.profileMedia,
    firstName: liveSettings.hero.firstName,
    lastName: liveSettings.hero.lastName,
    nickname: liveSettings.hero.nickname,
    name: liveSettings.hero.name,
    title: liveSettings.hero.title,
    bio: liveSettings.hero.bio,
    tags: liveSettings.hero.tags,
    location: liveSettings.hero.location,
    joinDate: liveSettings.hero.joinDate,
    stats: liveSettings.hero.stats,
    hireMeLink: liveSettings.hero.hireMeLink,
    profileButtonText: liveSettings.hero.profileButtonText,
    profileButtonLink: liveSettings.hero.profileButtonLink,
  }
  const liveContactData: ContactData = {
    email: liveSettings.contact.email,
  }

  // ── Media save helper ──────────────────────────────────────────────────────
  const persistMediaField = useCallback(async (
    patch: Partial<SiteSettings['hero']>
  ) => {
    const updated: SiteSettings = {
      ...liveSettings,
      hero: { ...liveSettings.hero, ...patch },
    }
    setLiveSettings(updated)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
  }, [liveSettings])

  // ── Tab routing ────────────────────────────────────────────────────────────
  const activeFilter = searchParams.get('cat') ?? 'all'
  const activeSub = searchParams.get('sub') ?? 'all'

  const tabItems = (() => {
    let filtered: FeedItemType[]
    if (activeFilter === 'all') {
      filtered = initialItems
    } else if (activeFilter === 'projects') {
      filtered = initialItems.filter(
        (item) => item.type === 'project' || item.category === 'projects',
      )
    } else {
      filtered = initialItems.filter((item) => item.category === activeFilter)
    }
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
    })
  })()

  const projectSubCategories = (() => {
    if (activeFilter !== 'projects') return []
    const cats = new Set<string>()
    tabItems.forEach((item) => {
      if (item.category && item.category !== 'projects') cats.add(item.category)
    })
    return Array.from(cats)
  })()

  const filteredItems = (() => {
    if (activeFilter !== 'projects' || activeSub === 'all') return tabItems
    return tabItems.filter((item) => item.category === activeSub)
  })()

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('cat')
    } else {
      params.set('cat', value)
    }
    params.delete('sub')
    const newUrl = params.size > 0 ? `/?${params.toString()}` : '/'
    router.replace(newUrl, { scroll: false })
  }

  function handleSubChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('sub')
    } else {
      params.set('sub', value)
    }
    router.replace(`/?${params.toString()}`, { scroll: false })
  }

  return (
    <PageShell>
      <ProfileHero
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        heroData={liveHeroData}
        contactData={liveContactData}
        isAdmin={isAdmin}
        onCoverChange={(url) => persistMediaField({ coverMedia: url })}
        onCoverDelete={() => persistMediaField({ coverMedia: '' })}
        onAvatarChange={(url) => persistMediaField({ profileMedia: url })}
        onAvatarDelete={() => persistMediaField({ profileMedia: '' })}
        onEditProfile={() => router.push('/admin/edit-profile')}
      />

      {/* Project sub-category filter strip */}
      {activeFilter === 'projects' && projectSubCategories.length > 0 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none border-b border-border">
          {['all', ...projectSubCategories].map((sub) => {
            const active = activeSub === sub
            return (
              <button
                key={sub}
                onClick={() => handleSubChange(sub)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all border"
                style={
                  active
                    ? { backgroundColor: '#9db8e820', color: '#9db8e8', borderColor: '#9db8e840' }
                    : { backgroundColor: 'transparent', color: 'var(--muted-foreground)', borderColor: 'var(--border)' }
                }
              >
                {sub === 'all' ? 'All Projects' : sub}
              </button>
            )
          })}
        </div>
      )}

      <section aria-label="Feed">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl">📭</span>
            </div>
            <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <FeedItem
              key={item.id}
              id={item.id}
              type={item.type as 'testimonial' | 'project' | 'post'}
              title={item.title}
              body={item.type === 'testimonial' ? item.content : item.excerpt}
              author={item.type === 'testimonial' ? (item.clientName ?? item.author) : item.author}
              authorRole={item.type === 'testimonial' ? item.clientRole : undefined}
              date={item.date}
              initialLikes={item.likes}
              replies={item.replies}
              rating={item.rating}
              image={item.image}
              media={item.media}
              clientImage={item.clientImage}
              projectTech={item.tech}
              projectLink={item.link}
              linkedProjectId={item.linkedProjectId}
              pinned={item.pinned}
            />
          ))
        )}
      </section>


    </PageShell>
  )
}
