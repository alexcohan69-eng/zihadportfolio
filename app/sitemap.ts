import type { MetadataRoute } from 'next'
import { readFeedData, readPortfolioData } from '@/lib/data'

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zihadimtiase.com').replace(/\/$/, '')

function safeDate(value?: string | Date): Date {
  if (!value) return new Date()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [feedData, portfolioData] = await Promise.all([
    readFeedData(),
    readPortfolioData(),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/about`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/portfolio`,   lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/feed`,        lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE}/contact`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]

  const portfolioRoutes: MetadataRoute.Sitemap = portfolioData.projects.map((project) => ({
    url: `${BASE}/portfolio/${project.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: project.featured ? 0.9 : 0.7,
  }))

  const feedRoutes: MetadataRoute.Sitemap = feedData.items.map((item) => ({
    url: `${BASE}/feed/${item.id}`,
    lastModified: safeDate(item.date),
    changeFrequency: 'monthly' as const,
    priority: item.featured ? 0.8 : 0.6,
  }))

  return [...staticRoutes, ...portfolioRoutes, ...feedRoutes]
}
