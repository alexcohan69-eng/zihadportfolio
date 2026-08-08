import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'
import { readFeedData, readSettingsData } from '@/lib/data'
import { HomeClient } from '@/components/home-client'
import { JsonLd } from '@/components/json-ld'
import {
  breadcrumbSchema,
  buildMetadata,
  jsonLdGraph,
  profilePageSchema,
  toDescription,
} from '@/lib/seo'

// Revalidate every 60 s so the feed stays fresh without blocking navigation.
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readSettingsData()
  const hero = settings?.hero
  const meta = settings?.meta

  const name = hero?.name || 'Zihad Imtiase'
  const jobTitle = hero?.title || 'Frontend Developer & Webflow Specialist'
  const title = meta?.title || `${name} — ${jobTitle}`
  const description =
    toDescription(meta?.description) ||
    toDescription(hero?.bio) ||
    `${name} is a ${jobTitle} building high-converting websites and landing pages.`

  return buildMetadata({
    title,
    description,
    path: '/',
    type: 'profile',
    images: [hero?.profileMedia, hero?.coverMedia],
    keywords: (hero?.tags ?? []).map((t) => t.replace(/^#/, '')),
    authors: [name],
  })
}

export default async function HomePage() {
  const [feedData, settingsData] = await Promise.all([
    readFeedData(),
    readSettingsData(),
  ])

  const hero = settingsData?.hero
  const name = hero?.name || 'Zihad Imtiase'
  const jobTitle = hero?.title || 'Frontend Developer & Webflow Specialist'
  const title = settingsData?.meta?.title || `${name} — ${jobTitle}`
  const description =
    toDescription(settingsData?.meta?.description) ||
    toDescription(hero?.bio) ||
    `${name} is a ${jobTitle} building high-converting websites.`

  // ProfilePage + Person is the strongest signal for a personal brand site,
  // and it lets Google build a knowledge-panel style entity.
  const graph = jsonLdGraph(
    profilePageSchema({ settings: settingsData, path: '/', title, description }),
    breadcrumbSchema([{ name: 'Home', path: '/' }]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <Suspense
        fallback={
          <PageShell>
            <div className="p-4 space-y-4">
              <div className="animate-pulse rounded-2xl bg-muted h-64 w-full" />
              <div className="animate-pulse rounded-2xl bg-muted h-32 w-full" />
            </div>
          </PageShell>
        }
      >
        {/* ডাটাগুলো props হিসেবে Client Component এ পাঠানো হচ্ছে */}
        <HomeClient
          initialItems={feedData.items}
          heroData={settingsData?.hero ?? {}}
          contactData={settingsData?.contact ?? {}}
          initialSettings={settingsData}
        />
      </Suspense>
    </>
  )
}
