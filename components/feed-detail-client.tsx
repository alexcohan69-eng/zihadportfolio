'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Share2,
  BookOpen, Quote, Briefcase, ExternalLink, TrendingUp, Music,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { PostInteractions } from '@/components/post-interactions'
import type { FeedItem, Project } from '@/lib/types'

interface FeedDetailClientProps {
  initialItem: FeedItem
  initialLinkedProject: Project | null
  initialRelatedProjects: Project[]
}

const TYPE_META = {
  article: { label: 'Article', icon: BookOpen, color: '#f4a295' },
  testimonial: { label: 'Testimonial', icon: Quote, color: '#a8d5c2' },
  project: { label: 'Project', icon: Briefcase, color: '#9db8e8' },
  post: { label: 'Post', icon: BookOpen, color: '#f4a295' },
}

const jsonFetcher = (url: string) => fetch(url).then((r) => r.json())

export function FeedDetailClient({
  initialItem,
  initialLinkedProject,
  initialRelatedProjects,
}: FeedDetailClientProps) {
  const router = useRouter()
  const id = initialItem.id

  // SWR revalidates in the background but never blocks the initial render —
  // `fallbackData` means the UI shows instantly with the server-fetched data.
  const { data: item = initialItem } = useSWR<FeedItem>(
    `/api/feed/${id}`,
    jsonFetcher,
    {
      fallbackData: initialItem,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
    },
  )

  const meta =
    TYPE_META[item.type as keyof typeof TYPE_META] ?? TYPE_META.post
  const TypeIcon = meta.icon
  const displayName =
    item.type === 'testimonial' ? (item.clientName ?? item.author) : item.author

  const linkedProject = initialLinkedProject
  const relatedProjects = initialRelatedProjects

  return (
    <PageShell>
      {/* Top bar — visual chrome only; the canonical <h1> lives in the article body below */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          {/* aria-hidden: this truncated label is purely decorative — the full title is the <h1> below */}
          <p aria-hidden="true" className="font-bold text-base text-foreground leading-tight line-clamp-1">{item.title}</p>
          <p className="text-xs text-muted-foreground capitalize">{meta.label}</p>
        </div>
      </div>

      <article className="px-5 py-6">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0"
            style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
          >
            {(displayName || 'A').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">{displayName}</p>
            {item.clientRole && <p className="text-xs text-muted-foreground">{item.clientRole}</p>}
            <div className="flex items-center gap-1.5 mt-0.5">
              <TypeIcon size={11} style={{ color: meta.color }} />
              <span className="text-[11px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
              <span className="text-muted-foreground text-[11px]">·</span>
              <span className="text-[11px] text-muted-foreground">{item.date}</span>
            </div>
          </div>
          {item.featured && (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
              style={{ backgroundColor: '#f4a29520', color: '#f4a295' }}
            >
              Featured
            </span>
          )}
        </div>

        {/* Title — the single canonical <h1> for this page */}
        <h1 className="font-bold text-2xl text-foreground mb-4 text-pretty leading-snug">
          {item.title}
        </h1>

        {/* Star rating */}
        {item.type === 'testimonial' && item.rating && (
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-base" style={{ color: i < item.rating! ? '#f4a295' : '#444' }}>★</span>
            ))}
          </div>
        )}

        {/* Media — full gallery */}
        {(() => {
          const allMedia: string[] = (() => {
            const arr = item.media && item.media.length > 0 ? item.media : item.image ? [item.image] : []
            return Array.from(new Set(arr.filter(Boolean)))
          })()
          if (allMedia.length === 0) return null
          return (
            <div className="mb-5 space-y-2">
              {allMedia.map((url, i) => {
                const isVideo = /\.(mp4|webm|mov)$/i.test(url)
                const isAudio = /\.(mp3|ogg|wav|aac|flac|m4a)$/i.test(url)
                if (isVideo) {
                  return (
                    <div key={i} className="rounded-2xl overflow-hidden bg-black">
                      <video src={url} controls className="w-full max-h-80 object-contain" />
                    </div>
                  )
                }
                if (isAudio) {
                  return (
                    <div key={i} className="rounded-2xl border border-border bg-muted flex items-center gap-4 p-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#f4a29520' }}
                      >
                        <Music size={22} style={{ color: '#f4a295' }} />
                      </div>
                      <audio
                        src={url}
                        controls
                        className="flex-1 h-9"
                        style={{ accentColor: '#f4a295' }}
                      />
                    </div>
                  )
                }
                return (
                  <div key={i} className="rounded-2xl overflow-hidden bg-muted" style={{ aspectRatio: '16/9' }}>
                    <img
                      src={url}
                      alt={allMedia.length > 1 ? `${item.title} — image ${i + 1} of ${allMedia.length}` : item.title}
                      className="w-full h-full object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Excerpt */}
        <p className="text-base text-foreground leading-relaxed font-medium mb-4">{item.excerpt}</p>

        {/* Full content */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{item.content}</p>

        {/* Tech tags */}
        {item.tech && item.tech.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {item.tech.map((t) => (
              <span
                key={t}
                className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Internal project details link */}
        {(linkedProject || item.linkedProjectId) && (
          <Link
            href={`/portfolio/${linkedProject?.id ?? item.linkedProjectId}`}
            className="inline-flex items-center gap-2 text-sm font-semibold mb-6 transition-opacity hover:opacity-80"
            style={{ color: '#f4a295' }}
          >
            <ExternalLink size={14} />
            View full project details
          </Link>
        )}

        {/* Divider */}
        <div className="border-t border-border pt-4 mb-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Share"
            onClick={() => navigator.share?.({ title: item.title, url: window.location.href })}
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Interactions — likes + persistent comments */}
        <PostInteractions
          postId={item.id}
          initialLikes={item.likes}
        />
      </article>

      {/* View Full Project Details button */}
      {linkedProject?.link && (
        <div className="px-5 py-4">
          <a
            href={linkedProject.link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-full text-sm font-bold transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
          >
            <ExternalLink size={14} />
            View live project
          </a>
        </div>
      )}

      {/* Related projects by category */}
      {relatedProjects.length > 0 && (
        <div className="px-5 pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            More {linkedProject?.category || 'Projects'}
          </p>
          <div className="space-y-3">
            {relatedProjects.map((proj) => (
              <Link
                key={proj.id}
                href={`/portfolio/${proj.id}`}
                className="block rounded-2xl border border-border bg-card hover:border-[#f4a295]/40 transition-colors overflow-hidden group"
              >
                {proj.image && (
                  <div className="w-full h-32 overflow-hidden bg-muted">
                    <img
                      src={proj.image}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: '#f4a29520', color: '#f4a295' }}
                    >
                      {proj.category}
                    </span>
                    {proj.featured && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Featured</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-1">{proj.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{proj.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Original linked project card — show when no related projects */}
      {linkedProject && relatedProjects.length === 0 && (
        <div className="px-5 pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Related Project
          </p>
          <Link
            href={`/portfolio/${linkedProject.id}`}
            className="block rounded-2xl border border-border bg-card hover:border-[#f4a295]/40 transition-colors overflow-hidden group"
          >
            {linkedProject.image && (
              <div className="w-full h-36 overflow-hidden bg-muted">
                <img
                  src={linkedProject.image}
                  alt={linkedProject.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: '#f4a29520', color: '#f4a295' }}
                >
                  {linkedProject.category}
                </span>
                {linkedProject.featured && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Featured</span>
                )}
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">{linkedProject.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{linkedProject.description}</p>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={12} style={{ color: '#f4a295' }} />
                <span className="text-xs font-medium" style={{ color: '#f4a295' }}>
                  {Object.values(linkedProject.results)[0]}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {linkedProject.tech.slice(0, 4).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
              <p className="text-xs font-semibold mt-3 flex items-center gap-1" style={{ color: '#f4a295' }}>
                View full project <span aria-hidden>→</span>
              </p>
            </div>
          </Link>
        </div>
      )}
    </PageShell>
  )
}
