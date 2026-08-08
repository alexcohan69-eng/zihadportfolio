import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme-provider'
import { readSettingsData } from '@/lib/data'
import { QuickCompose } from '@/components/quick-compose'
import { JsonLd } from '@/components/json-ld'
import type { SiteSettings } from '@/lib/types'
import { SpeedInsights } from "@vercel/speed-insights/next"
import {
  DEFAULT_OG_IMAGE,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE,
  absoluteUrl,
  jsonLdGraph,
  personSchema,
  toDescription,
  webSiteSchema,
} from '@/lib/seo'
import './globals.css'

// Settings fetch is cached by Next.js fetch caching — no force-dynamic needed here.
// Individual pages that need real-time data can opt into dynamic rendering themselves.

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const siteSettings = await readSettingsData()
  const meta = siteSettings?.meta ?? ({} as Partial<SiteSettings['meta']>)

  const title =
    meta.title || 'Zihad Imtiase — Frontend & Webflow Developer'
  const description =
    toDescription(meta.description) ||
    'Frontend Web Developer and Webflow specialist crafting high-converting websites. Based in Dhaka, Bangladesh.'
  const faviconUrl = meta.favicon || undefined
  const brand = title.split('—')[0].trim() || SITE_NAME

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${brand}` },
    description,
    applicationName: brand,
    generator: 'Next.js',
    keywords: [
      'frontend developer',
      'webflow developer',
      'webflow expert',
      'react developer',
      'next.js developer',
      'landing page design',
      'web design',
      'conversion rate optimization',
      'Dhaka',
      'Bangladesh',
    ],
    authors: [{ name: brand, url: SITE_URL }],
    creator: brand,
    publisher: brand,
    alternates: { canonical: SITE_URL },
    icons: faviconUrl
      ? { icon: faviconUrl, shortcut: faviconUrl, apple: faviconUrl }
      : {
          icon: [
            { url: '/icon.svg', type: 'image/svg+xml' },
            { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
          ],
          apple: [{ url: '/apple-icon.png' }],
        },
    openGraph: {
      type: 'website',
      locale: SITE_LOCALE,
      url: SITE_URL,
      siteName: brand,
      title,
      description,
      images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    robots: {
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
    formatDetection: { telephone: false, address: false, email: false },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f9' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const siteSettings = await readSettingsData()

  // Site-wide entity graph: the Person and WebSite nodes that every other
  // page's schema references by @id.
  const graph = jsonLdGraph(webSiteSchema(siteSettings), personSchema(siteSettings))

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd data={graph} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('zd-theme');document.documentElement.classList.toggle('dark',t?t==='dark':true)}catch(e){}})()`,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        
        {/* ২. এখানে QuickCompose কম্পোনেন্টটি বসিয়ে দিন */}
        <QuickCompose />
<SpeedInsights/>
        
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
