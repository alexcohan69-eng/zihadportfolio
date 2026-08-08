import { Suspense } from 'react'
import type { Metadata } from 'next'
import { readFeedData, readSettingsData } from '@/lib/data'
import { FeedCategoryClient } from '@/components/feed-category-client'
import { PageShell } from '@/components/page-shell'
import { JsonLd } from '@/components/json-ld'
import {
  breadcrumbSchema,
  buildMetadata,
  collectionPageSchema,
  jsonLdGraph,
} from '@/lib/seo'

export const revalidate = 60

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Posts',
  articles: 'Articles',
  testimonials: 'Testimonials',
  projects: 'Projects',
}

export async function generateStaticParams() {
  const data = await readFeedData()
  const categories = [...new Set(data.items.map((i) => i.category))].filter(Boolean)
  return [...new Set(['all', ...Object.keys(CATEGORY_LABELS), ...categories])].map(
    (slug) => ({ slug }),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [data, settings] = await Promise.all([readFeedData(), readSettingsData()])
  const all = data.items ?? []
  const items = slug === 'all' ? all : all.filter((i) => i.category === slug)
  const name = settings?.hero?.name || 'Zihad Imtiase'
  const label = CATEGORY_LABELS[slug] ?? slug.replace(/[-_]/g, ' ')

  if (items.length === 0) {
    return buildMetadata({
      title: label,
      description: `No ${label.toLowerCase()} published yet.`,
      path: `/feed/category/${slug}`,
      noIndex: true,
    })
  }

  return buildMetadata({
    title: label,
    description: `${items.length} ${label.toLowerCase()} from ${name} — insights, case studies and client feedback on web development and Webflow.`,
    path: `/feed/category/${slug}`,
    images: [items[0]?.image],
    keywords: [label, 'articles', 'insights', name],
    authors: [name],
  })
}

export default async function FeedCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // সরাসরি ডাটাবেস থেকে ডাটা ফেচ
  const data = await readFeedData()
  const allItems = data.items || []

  // সার্ভারেই ফিল্টার করে নেওয়া হচ্ছে
  const filteredItems = slug === 'all' ? allItems : allItems.filter((i) => i.category === slug)
  const label = CATEGORY_LABELS[slug] ?? slug

  const graph = jsonLdGraph(
    collectionPageSchema({
      path: `/feed/category/${slug}`,
      title: label,
      description: `${filteredItems.length} ${label.toLowerCase()}.`,
      items: filteredItems.map((i) => ({ name: i.title, path: `/feed/${i.id}` })),
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: label, path: `/feed/category/${slug}` },
    ]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <Suspense
        fallback={
          <PageShell>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse h-28 rounded-2xl bg-muted" />
              ))}
            </div>
          </PageShell>
        }
      >
        <FeedCategoryClient items={filteredItems} label={label} />
      </Suspense>
    </>
  )
}
