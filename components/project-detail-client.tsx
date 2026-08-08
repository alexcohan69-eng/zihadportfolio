'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Code, TrendingUp, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'

/** Full-screen lightbox for gallery images */
function Lightbox({
  images,
  initialIndex,
  onClose,
  label,
}: {
  images: string[]
  initialIndex: number
  onClose: () => void
  /** Project title, used to build descriptive image alt text. */
  label?: string
}) {
  const [index, setIndex] = useState(initialIndex)

  function prev(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex((i) => (i - 1 + images.length) % images.length)
  }
  function next(e: React.MouseEvent) {
    e.stopPropagation()
    setIndex((i) => (i + 1) % images.length)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={18} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {index + 1} / {images.length}
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          className="absolute left-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          onClick={prev}
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt={
          label
            ? `${label} — full size image ${index + 1} of ${images.length}`
            : `Gallery image ${index + 1} of ${images.length}`
        }
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          className="absolute right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          onClick={next}
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-6 flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIndex(i) }}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                i === index ? 'bg-white scale-125' : 'bg-white/40'
              )}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectDetailClient({
  project,
  authorName,
  relatedProjects = [],
}: {
  /** Fully resolved on the server so crawlers receive complete HTML. */
  project: Project
  authorName?: string
  relatedProjects?: Project[]
}) {
  const router = useRouter()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Normalise gallery: prefer images[] over legacy image
  const gallery: string[] = project.images && project.images.length > 0
    ? project.images
    : project.image
    ? [project.image]
    : []

  const coverImage = gallery[0]

  return (
    <PageShell>
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={gallery}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          label={project.title}
        />
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          {/* Visual-only breadcrumb label — the real <h1> lives in the article below. */}
          <p className="font-bold text-base text-foreground leading-tight line-clamp-1">{project.title}</p>
          <p className="text-xs text-muted-foreground capitalize">{project.category}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Source code"
            >
              <Code size={15} />
            </a>
          )}
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              <ExternalLink size={12} />
              Live site
            </a>
          )}
        </div>
      </div>

      {/* ── Hero / cover image ── */}
      {coverImage ? (
        <div
          className="w-full bg-muted overflow-hidden cursor-pointer"
          style={{ aspectRatio: '16/9' }}
          onClick={() => setLightboxIndex(0)}
          role="button"
          tabIndex={0}
          aria-label="Open image gallery"
          onKeyDown={(e) => e.key === 'Enter' && setLightboxIndex(0)}
        >
          <img
            src={coverImage}
            alt={`${project.title} — ${project.category} project cover image`}
            width={1280}
            height={720}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
          />
        </div>
      ) : (
        <div
          className="w-full flex items-center justify-center"
          style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #f4a29518 0%, #f4a29508 100%)' }}
        >
          <span className="font-bold text-4xl" style={{ color: '#f4a29540' }}>
            {project.title.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* ── Gallery strip (2+ images) ── */}
      {gallery.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {gallery.map((url, i) => (
            <button
              key={url + i}
              onClick={() => setLightboxIndex(i)}
              className={cn(
                'shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                i === 0 ? 'border-[#f4a295]' : 'border-transparent hover:border-[#f4a295]/50'
              )}
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={url}
                alt={`${project.title} screenshot ${i + 1} of ${gallery.length}`}
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
          <span className="shrink-0 flex items-center text-[11px] text-muted-foreground pl-1">
            {gallery.length} photos
          </span>
        </div>
      )}

      <article className="px-5 py-6" itemScope itemType="https://schema.org/CreativeWork">
        {/* Category + featured */}
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={`/portfolio/category/${project.category}`}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#f4a29520', color: '#f4a295' }}
          >
            {project.category}
          </Link>
          {project.featured && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              Featured
            </span>
          )}
        </div>

        {/* Title — the single, canonical <h1> for this page */}
        <h1 className="font-bold text-2xl text-foreground mb-3 text-pretty leading-snug">
          {project.title}
        </h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{project.description}</p>

        {/* Results */}
        <section aria-labelledby="project-results" className="rounded-2xl border border-border bg-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: '#f4a295' }} />
            <h2 id="project-results" className="text-sm font-bold text-foreground">Results</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(project.results).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <CheckCircle2 size={13} style={{ color: '#f4a295' }} className="shrink-0" />
                <span className="text-xs text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </span>
                <span className="text-xs font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tech stack */}
        <section aria-labelledby="project-tech" className="mb-6">
          <h2 id="project-tech" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Tech Stack</h2>
          <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
            {project.tech.map((t) => (
              <li
                key={t}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-foreground"
              >
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Rich content blocks ── */}
        {project.content && project.content.length > 0 && (
          <div className="space-y-5 mb-8">
            <div className="h-px bg-border" />
            {project.content.map((block) => {
              if (block.type === 'heading') {
                return (
                  <h3 key={block.id} className="font-bold text-lg text-foreground text-pretty leading-snug">
                    {block.text}
                  </h3>
                )
              }
              if (block.type === 'paragraph') {
                return (
                  <p key={block.id} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {block.text}
                  </p>
                )
              }
              if (block.type === 'image' && block.url) {
                return (
                  <figure key={block.id} className="space-y-2">
                    <div
                      className="rounded-2xl overflow-hidden bg-muted cursor-pointer"
                      onClick={() => {
                        // open in lightbox if it's a gallery image, else just expand
                        const idx = gallery.indexOf(block.url!)
                        setLightboxIndex(idx >= 0 ? idx : 0)
                      }}
                    >
                      <img
                        src={block.url}
                        alt={block.caption || `${project.title} — project detail illustration`}
                        loading="lazy"
                        decoding="async"
                        className="w-full object-cover max-h-80 hover:scale-[1.01] transition-transform duration-300"
                      />
                    </div>
                    {block.caption && (
                      <figcaption className="text-xs text-center text-muted-foreground">{block.caption}</figcaption>
                    )}
                  </figure>
                )
              }
              if (block.type === 'divider') {
                return <div key={block.id} className="h-px bg-border" />
              }
              return null
            })}
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3">
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              <ExternalLink size={14} />
              View live site
            </a>
          )}
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold border border-border transition-all hover:bg-muted"
            >
              <Code size={14} />
              Source code
            </a>
          )}
        </div>
      </article>

      {/* Related projects — internal linking strengthens topical relevance
          and gives crawlers more paths into the portfolio. */}
      {relatedProjects.length > 0 && (
        <section aria-labelledby="related-projects" className="px-5 py-6 border-t border-border">
          <h2 id="related-projects" className="font-bold text-base text-foreground mb-4">
            More {project.category} projects
          </h2>
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {relatedProjects.slice(0, 4).map((related) => (
              <li key={related.id}>
                <Link
                  href={`/portfolio/${related.id}`}
                  prefetch
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card hover:border-[#f4a295]/40 transition-colors"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                    {(related.images?.[0] ?? related.image) ? (
                      <img
                        src={related.images?.[0] ?? related.image}
                        alt={`${related.title} project thumbnail`}
                        width={56}
                        height={56}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {related.title.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">{related.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {related.description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  )
}
