import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'
import { readSettingsData } from '@/lib/data'
import { ContactClient } from '@/components/contact-client'
import { JsonLd } from '@/components/json-ld'
import {
  breadcrumbSchema,
  buildMetadata,
  contactPageSchema,
  jsonLdGraph,
  toDescription,
} from '@/lib/seo'

// Revalidate instead of force-dynamic so the page is served from cache
// for crawlers while still refreshing automatically.
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readSettingsData()
  const name = settings?.hero?.name || 'Zihad Imtiase'
  const jobTitle = settings?.hero?.title || 'Frontend Developer & Webflow Specialist'

  const description =
    toDescription(settings?.contact?.shortText) ||
    `Get in touch with ${name}, ${jobTitle}. Available for freelance projects, consulting and long-term collaborations.`

  return buildMetadata({
    title: `Contact ${name}`,
    description,
    path: '/contact',
    keywords: ['contact', 'hire', 'freelance', name, jobTitle],
    authors: [name],
  })
}

export default async function ContactPage() {
  const siteSettings = (await readSettingsData()) as any
  
  const contactData = {
    email: siteSettings?.contact?.email || '',
    phone: siteSettings?.contact?.phone || '',
    whatsapp: siteSettings?.contact?.whatsapp || '',
    address: siteSettings?.contact?.address || '',
    shortText: siteSettings?.contact?.shortText || '',
    contactHeading: siteSettings?.contact?.contactHeading || '',
    contactSubHeading: siteSettings?.contact?.contactSubHeading || '',
    socials: Array.isArray(siteSettings?.contact?.socials) ? siteSettings.contact.socials : [],
  }

  const name = siteSettings?.hero?.name || 'Zihad Imtiase'
  const description =
    toDescription(contactData.shortText) || `Get in touch with ${name}.`

  const graph = jsonLdGraph(
    contactPageSchema({
      settings: siteSettings,
      title: `Contact ${name}`,
      description,
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Contact', path: '/contact' },
    ]),
  )

  return (
    <>
      <JsonLd data={graph} />
      <Suspense
        fallback={
          <PageShell>
            <div className="p-4 space-y-4">
              <div className="animate-pulse rounded-2xl bg-muted h-32 w-full" />
              <div className="animate-pulse rounded-2xl bg-muted h-64 w-full" />
            </div>
          </PageShell>
        }
      >
        <ContactClient contactData={contactData} />
      </Suspense>
    </>
  )
}
