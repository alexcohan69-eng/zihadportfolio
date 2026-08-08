import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'
import { readPortfolioData, readSettingsData } from '@/lib/data'
import { PortfolioClient } from '@/components/portfolio-client'
import { JsonLd } from '@/components/json-ld'
import {
  breadcrumbSchema,
  buildMetadata,
  collectionPageSchema,
  jsonLdGraph,
} from '@/lib/seo'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const [data, settings] = await Promise.all([
    readPortfolioData(),
    readSettingsData(),
  ])
  const projects = data.projects ?? []
  const name = settings?.hero?.name || 'Zihad Imtiase'
  const categories = [...new Set(projects.map((p) => p.category))].filter(Boolean)

  const description = projects.length
    ? `Explore ${projects.length} web development case studies by ${name}${
        categories.length ? ` across ${categories.slice(0, 4).join(', ')}` : ''
      } — real projects with measurable results.`
    : `Web development portfolio and case studies by ${name}.`

  return buildMetadata({
    title: 'Portfolio',
    description,
    path: '/portfolio',
    images: [projects[0]?.images?.[0] ?? projects[0]?.image],
    keywords: ['portfolio', 'case studies', 'web development projects', ...categories],
    authors: [name],
  })
}

export default async function PortfolioPage() {
  const [data, settings] = await Promise.all([
    readPortfolioData(),
    readSettingsData(),
  ])
  const projects = data.projects || []

  // ক্যাটাগরিগুলো সার্ভারেই প্রসেস করে নেওয়া হচ্ছে
  const uniqueCategories = [
    ...new Set(projects.map((p) => p.category)),
  ] as string[]
  const categories = ['all', ...uniqueCategories]

  const name = settings?.hero?.name || 'Zihad Imtiase'
  const description = projects.length
    ? `Explore ${projects.length} web development case studies by ${name}.`
    : `Web development portfolio and case studies by ${name}.`

  const graph = jsonLdGraph(
    collectionPageSchema({
      path: '/portfolio',
      title: 'Portfolio',
      description,
      items: projects.map((p) => ({
        name: p.title,
        path: `/portfolio/${p.id}`,
      })),
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Portfolio', path: '/portfolio' },
    ]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <Suspense
        fallback={
          <PageShell>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse h-40 rounded-2xl bg-muted" />
              ))}
            </div>
          </PageShell>
        }
      >
        <PortfolioClient initialProjects={projects} categories={categories} />
      </Suspense>
    </>
  )
}
