import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'
import { MapPin, Calendar, GraduationCap, Camera, Code2, Globe, Zap, Layout, Monitor } from 'lucide-react'
import { readSettingsData } from '@/lib/data'
import { JsonLd } from '@/components/json-ld'
import {
  breadcrumbSchema,
  buildMetadata,
  jsonLdGraph,
  profilePageSchema,
  toDescription,
} from '@/lib/seo'

// Revalidate instead of force-dynamic: crawlers get a fast cached response
// and content still refreshes automatically within a minute.
export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readSettingsData()
  const hero = settings?.hero
  const name = hero?.name || 'Zihad Imtiase'
  const jobTitle = hero?.title || 'Frontend Developer & Webflow Specialist'

  const description =
    toDescription(settings?.about?.introText) ||
    toDescription(hero?.bio) ||
    `Learn about ${name}, a ${jobTitle} based in ${hero?.location || 'Dhaka, Bangladesh'}.`

  return buildMetadata({
    title: `About ${name}`,
    description,
    path: '/about',
    type: 'profile',
    images: [settings?.about?.media?.[0], hero?.profileMedia],
    keywords: [
      'about',
      name,
      jobTitle,
      ...(settings?.about?.stack ?? []).map((s) => s.name),
    ],
    authors: [name],
  })
}

function getStackIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('react') || n.includes('next')) return Code2;
  if (n.includes('webflow') || n.includes('wordpress')) return Globe;
  if (n.includes('css') || n.includes('tailwind')) return Layout;
  if (n.includes('figma') || n.includes('design')) return Monitor;
  return Zap;
}

export default async function AboutPage() {
  const siteSettings = (await readSettingsData()) as any
  
  const aboutMedia: string[] = Array.isArray(siteSettings?.about?.media) ? siteSettings.about.media : []
  const primaryMedia = aboutMedia[0] ?? ''
  const extraMedia = aboutMedia.slice(1)
  
  const isVideo = (u: string) => /\.(mp4|webm|mov)$/i.test(u)

  const introText = siteSettings?.about?.introText || 'I help startups, agencies, and growing businesses turn their ideas into high-performing websites. My focus is always the same: websites that look great and drive measurable results.'
  const location = siteSettings?.hero?.location || 'Dhaka Cantonment, Bangladesh'
  const joinDate = siteSettings?.hero?.joinDate || 'Joined March 2022'
  
  const timeline = siteSettings?.about?.timeline?.length ? siteSettings.about.timeline : []
  const stack = siteSettings?.about?.stack?.length ? siteSettings.about.stack : []
  const values = siteSettings?.about?.values?.length ? siteSettings.about.values : []

  const displayName = siteSettings?.hero?.name || 'Zihad Imtiase'
  const jobTitle = siteSettings?.hero?.title || 'Frontend Developer & Webflow Specialist'
  const pageDescription =
    toDescription(introText) || `Learn about ${displayName}, a ${jobTitle}.`

  const graph = jsonLdGraph(
    profilePageSchema({
      settings: siteSettings,
      path: '/about',
      title: `About ${displayName}`,
      description: pageDescription,
    }),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
    ]),
  )

  return (
    <PageShell>
      <JsonLd data={graph} />
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg text-foreground">About {displayName}</h1>
        <p className="text-xs text-muted-foreground">{jobTitle}</p>
      </div>

      <div className="border-b border-border">
        <div className="px-5 pt-6 pb-6">
          {primaryMedia ? (
            <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-[2rem] border border-border shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] bg-muted group" style={{ aspectRatio: '5/7' }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-[#f4a295]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 pointer-events-none" />
              {isVideo(primaryMedia) ? (
                <video src={primaryMedia} autoPlay muted loop playsInline className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <img
                  src={primaryMedia}
                  alt={`${displayName}, ${jobTitle}`}
                  width={640}
                  height={896}
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10 pointer-events-none z-20" />
            </div>
          ) : (
            <div className="w-full max-w-md mx-auto relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-border/60 bg-card shadow-sm" style={{ aspectRatio: '5/7' }}>
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #f4a295 2px, transparent 2px)', backgroundSize: '24px 24px' }} />
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-muted relative z-10"><Camera size={28} style={{ color: '#f4a295' }} /></div>
              <p className="relative z-10 text-xs text-muted-foreground text-center px-8 leading-relaxed">Upload about media in <br/><span className="font-semibold text-foreground">Site Settings</span></p>
            </div>
          )}
        </div>

        {extraMedia.length > 0 && (
          <div className="flex gap-3 px-5 pb-2 -mt-14 relative z-30 overflow-x-auto scrollbar-none">
            {extraMedia.map((url, i) => (
              <div key={url + i} className="shrink-0 rounded-2xl overflow-hidden border-[4px] border-background bg-muted shadow-md hover:-translate-y-1 transition-transform duration-300" style={{ width: 72, height: 72 }}>
                {isVideo(url) ? (
                  <video src={url} muted autoPlay loop playsInline className="w-full h-full object-cover" aria-label={`${displayName} — work highlight video ${i + 2}`} />
                ) : (
                  <img
                    src={url}
                    alt={`${displayName} — work highlight ${i + 2}`}
                    width={72}
                    height={72}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="px-5 pb-6">
          <h2 className="font-bold text-2xl text-foreground tracking-tight">{displayName}</h2>
          <p className="text-sm font-medium mt-1 text-muted-foreground">{jobTitle}</p>
        </div>
      </div>

      <section aria-label={`Introduction from ${displayName}`} className="px-5 py-6 border-b border-border">
        {introText.split('\n').map((paragraph: string, idx: number) => (
          <p key={idx} className="text-sm text-foreground leading-relaxed mb-4 last:mb-0 whitespace-pre-wrap">{paragraph}</p>
        ))}

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin size={12} style={{ color: '#f4a295' }} /> {location}</span>
          <span className="flex items-center gap-1.5"><Calendar size={12} style={{ color: '#f4a295' }} /> {joinDate}</span>
          <span className="flex items-center gap-1.5"><GraduationCap size={12} style={{ color: '#f4a295' }} /> Professional</span>
        </div>
      </section>

      {values.length > 0 && (
        <section aria-labelledby="about-values" className="px-5 py-6 border-b border-border">
          <h2 id="about-values" className="font-bold text-base text-foreground mb-4">How I work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {values.map((v: any, i: number) => (
              <div key={i} className="p-4 rounded-2xl border border-border bg-card hover:border-[#f4a295]/40 transition-colors">
                <p className="font-semibold text-sm text-foreground mb-1">{v.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {stack.length > 0 && (
        <section aria-labelledby="about-stack" className="px-5 py-6 border-b border-border">
          <h2 id="about-stack" className="font-bold text-base text-foreground mb-4">Tech stack</h2>
          <div className="flex flex-col gap-3">
            {stack.map(({ name, level }: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    {(() => { const Icon = getStackIcon(name); return <Icon size={14} className="text-muted-foreground" /> })()}
                    {name}
                  </span>
                  <span className="text-xs text-muted-foreground">{level}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${level}%`, backgroundColor: '#f4a295' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section aria-labelledby="about-journey" className="px-5 py-6">
          <h2 id="about-journey" className="font-bold text-base text-foreground mb-5">Journey</h2>
          <div className="relative flex flex-col gap-0">
            {timeline.map((item: any, i: number) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10" style={{ backgroundColor: '#f4a29520', color: '#f4a295', border: '2px solid #f4a295' }}>
                    {item.year.slice(-2)}
                  </div>
                  {i < timeline.length - 1 && <div className="w-px flex-1 my-1" style={{ backgroundColor: '#f4a29530' }} />}
                </div>
                <div className="pb-6 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">{item.year}</p>
                  <p className="font-semibold text-sm text-foreground">{item.title}</p>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#f4a295' }}>{item.place}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  )
}
