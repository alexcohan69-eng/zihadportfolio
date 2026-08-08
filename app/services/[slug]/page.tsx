import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { readServiceBySlug, readServicesData, readSettingsData } from '@/lib/data'
import { ServiceDetailClient } from '@/components/service-detail-client'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbSchema, buildMetadata, jsonLdGraph, toDescription } from '@/lib/seo'

export const revalidate = 60

export async function generateStaticParams() {
  const data = await readServicesData({ activeOnly: true })
  return data.services
    .filter((service) => typeof service.slug === 'string' && service.slug.length > 0)
    .map((service) => ({ slug: service.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await readServicesData({ activeOnly: true })
  const service = data.services.find((s) => s.slug === slug)

  if (!service) {
    return buildMetadata({
      title: 'Service not found',
      description: 'The requested service could not be found.',
      path: `/services/${slug}`,
      noIndex: true,
    })
  }

  return buildMetadata({
    title: service.title,
    description:
      toDescription(service.description) || `${service.title} — pricing, deliverables and turnaround.`,
    path: `/services/${service.slug}`,
    type: 'website',
    images: service.media,
    keywords: [service.title, 'service', 'pricing'],
  })
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const [service, settings] = await Promise.all([
    readServiceBySlug(slug),
    readSettingsData(),
  ])

  if (!service) notFound()

  const name = settings?.hero?.name || 'Zihad Imtiase'

  const graph = jsonLdGraph(
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
      { name: service.title, path: `/services/${service.slug}` },
    ]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <ServiceDetailClient service={service} authorName={name} />
    </>
  )
}
