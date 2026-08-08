import { Suspense } from 'react'
import type { Metadata } from 'next'
import { readPortfolioData, readSettingsData } from '@/lib/data'
import { PortfolioCategoryClient } from '@/components/portfolio-category-client'
import { PageShell } from '@/components/page-shell'
import { JsonLd } from '@/components/json-ld'
import {
  breadcrumbSchema,
  buildMetadata,
  collectionPageSchema,
  jsonLdGraph,
} from '@/lib/seo'

export const revalidate = 60

export async function generateStaticParams() {
  const data = await readPortfolioData()
  const categories = [...new Set(data.projects.map((p) => p.category))].filter(Boolean)
  return ['all', ...categories].map((slug) => ({ slug }))
}

function titleCase(slug: string) {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [data, settings] = await Promise.all([
    readPortfolioData(),
    readSettingsData(),
  ])
  const all = data.projects ?? []
  const projects = slug === 'all' ? all : all.filter((p) => p.category === slug)
  const name = settings?.hero?.name || 'Zihad Imtiase'
  const label = slug === 'all' ? 'All Projects' : titleCase(slug)

  // Empty categories are thin content — keep them out of the index.
  if (projects.length === 0) {
    return buildMetadata({
      title: `${label} projects`,
      description: `No ${label.toLowerCase()} projects published yet.`,
      path: `/portfolio/category/${slug}`,
      noIndex: true,
    })
  }

  return buildMetadata({
    title: `${label} Projects`,
    description: `${projects.length} ${label.toLowerCase()} ${
      projects.length === 1 ? 'case study' : 'case studies'
    } by ${name} — design, build and measurable results.`,
    path: `/portfolio/category/${slug}`,
    images: [projects[0]?.images?.[0] ?? projects[0]?.image],
    keywords: [label, 'portfolio', 'case studies', ...projects.flatMap((p) => p.tech ?? [])],
    authors: [name],
  })
}

export default async function PortfolioCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // সরাসরি ডাটাবেস থেকে ডাটা ফেচ
  const data = await readPortfolioData()
  const allProjects = data.projects || []

  // সার্ভারেই ফিল্টার করে নেওয়া হচ্ছে
  const filteredProjects = slug === 'all' ? allProjects : allProjects.filter((p) => p.category === slug)
  const label = slug === 'all' ? 'All Projects' : titleCase(slug)

  const graph = jsonLdGraph(
    collectionPageSchema({
      path: `/portfolio/category/${slug}`,
      title: `${label} Projects`,
      description: `${filteredProjects.length} ${label.toLowerCase()} case studies.`,
      items: filteredProjects.map((p) => ({
        name: p.title,
        path: `/portfolio/${p.id}`,
      })),
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Portfolio', path: '/portfolio' },
      { name: label, path: `/portfolio/category/${slug}` },
    ]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <Suspense
        fallback={
          <PageShell>
            <div className="px-4 py-4 flex flex-col gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="animate-pulse h-40 rounded-2xl bg-muted" />
              ))}
            </div>
          </PageShell>
        }
      >
        <PortfolioCategoryClient projects={filteredProjects} slug={slug} />
      </Suspense>
    </>
  )
}
