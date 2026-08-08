/**
 * Centralised SEO helpers — single source of truth for metadata + JSON-LD.
 *
 * Every route should build its metadata through `buildMetadata()` so that
 * canonical URLs, Open Graph, Twitter cards and robots directives stay
 * consistent across the whole site.
 */
import type { Metadata } from 'next'
import type { FeedItem, Project, SiteSettings } from '@/lib/types'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zihadimtiase.com'
).replace(/\/$/, '')

export const SITE_NAME = 'Zihad Imtiase'
export const SITE_LOCALE = 'en_US'
export const TWITTER_HANDLE = '@zihadimtiase'

/** Absolute URL builder — required for OG/canonical tags. */
export function absoluteUrl(path = '/'): string {
  if (!path) return SITE_URL
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/** Collapse markdown/HTML/whitespace into a clean meta description. */
export function toDescription(input: string | undefined, max = 158): string {
  if (!input) return ''
  const clean = input
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

/** Only keep image URLs that can be resolved absolutely by crawlers. */
function normaliseImages(images?: (string | undefined)[]): string[] {
  return (images ?? [])
    .filter((u): u is string => Boolean(u && u.trim()))
    .filter((u) => !u.startsWith('data:'))
    .map((u) => absoluteUrl(u))
}

export const DEFAULT_OG_IMAGE = '/icon.svg'

interface BuildMetadataInput {
  title: string
  description: string
  /** Site-relative path, e.g. `/portfolio/foo`. Drives the canonical URL. */
  path: string
  images?: (string | undefined)[]
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  keywords?: string[]
  authors?: string[]
  /** Set true for thin/duplicate pages that should stay out of the index. */
  noIndex?: boolean
}

export function buildMetadata({
  title,
  description,
  path,
  images,
  type = 'website',
  publishedTime,
  modifiedTime,
  keywords,
  authors,
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path)
  const ogImages = normaliseImages(images)
  const resolved = ogImages.length > 0 ? ogImages : [absoluteUrl(DEFAULT_OG_IMAGE)]

  return {
    title,
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    ...(authors && authors.length > 0
      ? { authors: authors.map((name) => ({ name })) }
      : {}),
    alternates: { canonical: url },
    openGraph: {
      type: type === 'profile' ? 'profile' : type,
      locale: SITE_LOCALE,
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: resolved.map((u) => ({ url: u, alt: title })),
      ...(type === 'article'
        ? {
            ...(publishedTime ? { publishedTime } : {}),
            ...(modifiedTime ? { modifiedTime } : {}),
            ...(authors && authors.length > 0 ? { authors } : {}),
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title,
      description,
      images: resolved,
    },
    robots: noIndex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  }
}

// ── JSON-LD builders ─────────────────────────────────────────────────────────

type Json = Record<string, unknown>

/** Strip undefined/empty values so we never emit dangling schema keys. */
function prune<T extends Json>(obj: T): T {
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete obj[key]
    }
  }
  return obj
}

export const PERSON_ID = `${SITE_URL}/#person`
export const WEBSITE_ID = `${SITE_URL}/#website`

/** Person schema — the entity Google associates with the whole site. */
export function personSchema(settings?: Partial<SiteSettings>): Json {
  const hero = settings?.hero
  const contact = settings?.contact
  const sameAs = (contact?.socials ?? [])
    .map((s) => s.url)
    .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)))

  // Derive occupational category from job title for richer entity disambiguation
  const jobTitle = hero?.title || 'Frontend Developer & Webflow Specialist'
  const occupationalCategory = jobTitle.split(/[,&\/]/)[0].trim() || undefined

  return prune({
    '@type': 'Person',
    '@id': PERSON_ID,
    name: hero?.name || SITE_NAME,
    alternateName: hero?.nickname || undefined,
    url: SITE_URL,
    image: hero?.profileMedia ? absoluteUrl(hero.profileMedia) : undefined,
    jobTitle,
    occupationalCategory,
    description: toDescription(hero?.bio, 300) || undefined,
    email: contact?.email ? `mailto:${contact.email}` : undefined,
    telephone: contact?.phone || undefined,
    address: prune({
      '@type': 'PostalAddress',
      addressLocality: hero?.city || undefined,
      addressCountry: hero?.country || undefined,
    }),
    knowsAbout: (hero?.tags ?? []).map((t) => t.replace(/^#/, '')),
    sameAs,
  })
}

/** WebSite schema with the sitelinks search action. */
export function webSiteSchema(settings?: Partial<SiteSettings>): Json {
  return prune({
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: settings?.meta?.title || SITE_NAME,
    description: toDescription(settings?.meta?.description, 300) || undefined,
    inLanguage: 'en',
    publisher: { '@id': PERSON_ID },
  })
}

export function breadcrumbSchema(
  trail: { name: string; path: string }[],
): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/** ProfilePage — used for the home + about pages. */
export function profilePageSchema({
  settings,
  path,
  title,
  description,
}: {
  settings?: Partial<SiteSettings>
  path: string
  title: string
  description: string
}): Json {
  // Only emit hasPart on the root homepage — not on /about (which IS a part)
  const isHome = path === '/'
  const hasPart = isHome
    ? [
        { '@type': 'WebPage', '@id': `${absoluteUrl('/about')}#profilepage`, name: 'About' },
        { '@type': 'WebPage', '@id': `${absoluteUrl('/portfolio')}#collection`, name: 'Portfolio' },
        { '@type': 'WebPage', '@id': `${absoluteUrl('/contact')}#contactpage`, name: 'Contact' },
      ]
    : undefined

  return prune({
    '@type': 'ProfilePage',
    '@id': `${absoluteUrl(path)}#profilepage`,
    url: absoluteUrl(path),
    name: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
    mainEntity: personSchema(settings),
    ...(hasPart ? { hasPart } : {}),
  })
}

/** CreativeWork — portfolio project detail pages. */
export function projectSchema(project: Project, authorName: string): Json {
  const images = [
    ...(project.images ?? []),
    ...(project.image ? [project.image] : []),
  ]
    .filter(Boolean)
    .map((u) => absoluteUrl(u))

  return prune({
    '@type': 'CreativeWork',
    '@id': `${absoluteUrl(`/portfolio/${project.id}`)}#creativework`,
    url: absoluteUrl(`/portfolio/${project.id}`),
    name: project.title,
    headline: project.title,
    description: toDescription(project.description, 400),
    genre: project.category,
    image: Array.from(new Set(images)),
    keywords: project.tech?.join(', ') || undefined,
    inLanguage: 'en',
    creator: { '@id': PERSON_ID },
    author: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
    ...(project.link ? { sameAs: project.link } : {}),
  })
}

/** BlogPosting — feed posts of type `post`. */
export function blogPostingSchema(item: FeedItem, authorName: string): Json {
  const images = [
    ...(item.media ?? []),
    ...(item.image ? [item.image] : []),
  ]
    .filter((u) => Boolean(u) && !/\.(mp4|webm|mov)$/i.test(u))
    .map((u) => absoluteUrl(u))

  const url = absoluteUrl(`/feed/${item.id}`)

  return prune({
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    headline: item.title,
    description: toDescription(item.excerpt, 400),
    articleSection: item.category,
    image: Array.from(new Set(images)),
    datePublished: safeIso(item.date),
    dateModified: safeIso(item.date),
    inLanguage: 'en',
    keywords: item.tech?.join(', ') || undefined,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
    isPartOf: { '@id': WEBSITE_ID },
    ...(typeof item.likes === 'number'
      ? {
          interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/LikeAction',
            userInteractionCount: item.likes,
          },
        }
      : {}),
  })
}

/** Review — feed items of type `testimonial`. */
export function reviewSchema(item: FeedItem): Json {
  const url = absoluteUrl(`/feed/${item.id}`)
  return prune({
    '@type': 'Review',
    '@id': `${url}#review`,
    url,
    name: item.title,
    reviewBody: toDescription(item.content || item.excerpt, 800),
    datePublished: safeIso(item.date),
    inLanguage: 'en',
    author: prune({
      '@type': 'Person',
      name: item.clientName || item.author || 'Client',
      jobTitle: item.clientRole || undefined,
      image: item.clientImage ? absoluteUrl(item.clientImage) : undefined,
    }),
    itemReviewed: { '@id': PERSON_ID },
    ...(item.rating
      ? {
          reviewRating: {
            '@type': 'Rating',
            ratingValue: item.rating,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  })
}

/** CollectionPage + ItemList — listing/category pages. */
export function collectionPageSchema({
  path,
  title,
  description,
  items,
}: {
  path: string
  title: string
  description: string
  items: { name: string; path: string }[]
}): Json {
  return prune({
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl(path)}#collection`,
    url: absoluteUrl(path),
    name: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((entry, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: entry.name,
        url: absoluteUrl(entry.path),
      })),
    },
  })
}

/** ContactPage schema. */
export function contactPageSchema({
  settings,
  title,
  description,
}: {
  settings?: Partial<SiteSettings>
  title: string
  description: string
}): Json {
  const contact = settings?.contact
  return prune({
    '@type': 'ContactPage',
    '@id': `${absoluteUrl('/contact')}#contactpage`,
    url: absoluteUrl('/contact'),
    name: title,
    description,
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': PERSON_ID },
    mainEntity: prune({
      '@type': 'Person',
      '@id': PERSON_ID,
      email: contact?.email ? `mailto:${contact.email}` : undefined,
      telephone: contact?.phone || undefined,
    }),
  })
}

/** Wrap one or more schema nodes into a single @graph document. */
export function jsonLdGraph(...nodes: (Json | null | undefined)[]): string {
  const graph = nodes.filter((n): n is Json => Boolean(n))
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}

function safeIso(date?: string): string | undefined {
  if (!date) return undefined
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}
