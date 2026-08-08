import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readPortfolioData, readSettingsData } from '@/lib/data'
import { ProjectDetailClient } from '@/components/project-detail-client'
import { JsonLd } from '@/components/json-ld'
import {
  breadcrumbSchema,
  buildMetadata,
  jsonLdGraph,
  projectSchema,
  toDescription,
} from '@/lib/seo'

// Prerender + revalidate so crawlers always get fully rendered HTML
// and repeat navigations are served instantly from the router cache.
export const revalidate = 60

export async function generateStaticParams() {
  const data = await readPortfolioData()
  return data.projects.map((project) => ({ id: project.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const data = await readPortfolioData()
  const project = data.projects.find((p) => p.id === id)

  if (!project) {
    return buildMetadata({
      title: 'Project not found',
      description: 'The requested project could not be found.',
      path: `/portfolio/${id}`,
      noIndex: true,
    })
  }

  return buildMetadata({
    title: project.title,
    description:
      toDescription(project.description) ||
      `${project.title} — a ${project.category} project case study.`,
    path: `/portfolio/${id}`,
    type: 'article',
    images: [...(project.images ?? []), project.image],
    keywords: [project.category, ...(project.tech ?? [])],
  })
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [portfolioData, settings] = await Promise.all([
    readPortfolioData(),
    readSettingsData(),
  ])

  const project = portfolioData.projects.find((p) => p.id === id)
  if (!project) notFound()

  const authorName = settings?.hero?.name || 'Zihad Imtiase'

  const relatedProjects = portfolioData.projects.filter(
    (p) => p.category === project.category && p.id !== project.id,
  )

  const graph = jsonLdGraph(
    projectSchema(project, authorName),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Portfolio', path: '/portfolio' },
      { name: project.category, path: `/portfolio/category/${project.category}` },
      { name: project.title, path: `/portfolio/${project.id}` },
    ]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <ProjectDetailClient
        project={project}
        authorName={authorName}
        relatedProjects={relatedProjects}
      />
    </>
  )
}
