import type { MetadataRoute } from 'next'

const BASE = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zihadimtiase.com').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all well-behaved bots to crawl public content.
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',   // entire admin section — wildcard covers all sub-routes
          '/api/',     // internal API routes should not be indexed
          '/login',    // auth page — no SEO value
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
