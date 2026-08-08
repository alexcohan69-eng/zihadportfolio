import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'
import { readServicesData, readSettingsData } from '@/lib/data'
import { ServicesClient } from '@/components/services-client'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbSchema, buildMetadata, collectionPageSchema, jsonLdGraph } from '@/lib/seo'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readSettingsData()
  const name = settings?.hero?.name || 'Zihad Imtiase'

  return buildMetadata({
    title: 'Services',
    description: `Explore web development services offered by ${name} — transparent pricing, clear deliverables, and fast turnaround.`,
    path: '/services',
    keywords: ['services', 'pricing', 'web development packages', 'hire developer'],
    authors: [name],
  })
}

export default async function ServicesPage() {
  const [data, settings] = await Promise.all([
    readServicesData({ activeOnly: true }),
    readSettingsData(),
  ])
  const services = data.services || []
  const name = settings?.hero?.name || 'Zihad Imtiase'

  const graph = jsonLdGraph(
    collectionPageSchema({
      path: '/services',
      title: 'Services',
      description: `Web development services offered by ${name}.`,
      items: services.map((s) => ({ name: s.title, path: '/services' })),
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
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
        <ServicesClient services={services} />
      </Suspense>
    </>
  )
}
