import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readFeedData, readPortfolioData } from '@/lib/data'
import { FeedDetailClient } from '@/components/feed-detail-client'
import { JsonLd } from '@/components/json-ld'
import {
  blogPostingSchema,
  breadcrumbSchema,
  buildMetadata,
  jsonLdGraph,
  reviewSchema,
  toDescription,
} from '@/lib/seo'
import type { FeedItem, Project } from '@/lib/types'

// Allow Next.js router cache to serve this page without re-fetching
// on repeated navigations. Revalidate every 60 seconds in the background.
export const revalidate = 60

export async function generateStaticParams() {
  const data = await readFeedData()
  return data.items.map((item) => ({ id: item.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const data = await readFeedData()
  const item = data.items.find((i) => i.id === id)

  if (!item) {
    return buildMetadata({
      title: 'Post not found',
      description: 'The requested post could not be found.',
      path: `/feed/${id}`,
      noIndex: true,
    })
  }

  const description =
    toDescription(item.excerpt) || toDescription(item.content) || item.title

  return buildMetadata({
    title: item.title,
    description,
    path: `/feed/${id}`,
    type: 'article',
    images: [item.image, ...(item.media ?? [])],
    publishedTime: item.date,
    modifiedTime: item.date,
    keywords: [item.category, ...(item.tech ?? [])].filter(Boolean),
    authors: [item.author || 'Zihad Imtiase'],
  })
}

export default async function FeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [feedData, portfolioData] = await Promise.all([
    readFeedData(),
    readPortfolioData(),
  ])

  const item = feedData.items.find((i) => i.id === id) as FeedItem | undefined
  if (!item) notFound()

  let linkedProject: Project | null = null
  let relatedProjects: Project[] = []

  if (item.linkedProjectId) {
    linkedProject =
      portfolioData.projects.find((p) => p.id === item.linkedProjectId) ?? null

    if (linkedProject) {
      relatedProjects = portfolioData.projects.filter(
        (p) => p.category === linkedProject!.category && p.id !== linkedProject!.id,
      )
    }
  }

  // Testimonials get Review schema (rich-result eligible), everything else is
  // treated as an editorial BlogPosting.
  const primary =
    item.type === 'testimonial'
      ? reviewSchema(item)
      : blogPostingSchema(item, item.author || 'Zihad Imtiase')

  const graph = jsonLdGraph(
    primary,
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: item.category || 'Feed', path: `/feed/category/${item.category || 'all'}` },
      { name: item.title, path: `/feed/${item.id}` },
    ]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <FeedDetailClient
        initialItem={item}
        initialLinkedProject={linkedProject}
        initialRelatedProjects={relatedProjects}
      />
    </>
  )
}
