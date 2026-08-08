'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/page-shell'
import { ExternalLink, Code, TrendingUp } from 'lucide-react'
import type { Project } from '@/lib/data'

interface PortfolioClientProps {
  initialProjects: Project[]
  categories: string[]
}

export function PortfolioClient({ initialProjects, categories }: PortfolioClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeFilter = searchParams.get('cat') ?? 'all'
  const filteredProjects =
    activeFilter === 'all'
      ? initialProjects
      : initialProjects.filter((p) => p.category === activeFilter)

  function handleFilterChange(cat: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (cat === 'all') params.delete('cat')
    else params.set('cat', cat)
    const newUrl = params.size > 0 ? `/portfolio?${params.toString()}` : '/portfolio'
    router.replace(newUrl, { scroll: false })
  }

  return (
    <PageShell>
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg text-foreground">Portfolio</h1>
        <p className="text-xs text-muted-foreground">{initialProjects.length} projects delivered</p>
      </div>

      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {categories.map((cat) => {
          const active = activeFilter === cat
          return (
            <button
              key={cat}
              onClick={() => handleFilterChange(cat)}
              className="flex-shrink-0 px-4 py-3 text-xs font-semibold capitalize transition-colors border-b-2"
              style={
                active
                  ? { borderColor: '#f4a295', color: '#f4a295' }
                  : { borderColor: 'transparent', color: 'var(--muted-foreground)' }
              }
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          )
        })}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <p className="text-sm text-muted-foreground">No projects to display.</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/portfolio/${project.id}`}
              className="block rounded-2xl border border-border bg-card overflow-hidden hover:border-[#f4a295]/40 transition-colors group"
            >
              <div className="h-1 w-full" style={{ backgroundColor: project.featured ? '#f4a295' : '#f4a29530' }} />
              
              {project.image && (
                <div className="w-full h-40 overflow-hidden bg-muted">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ backgroundColor: '#f4a29520', color: '#f4a295' }}
                  >
                    {project.category}
                  </span>
                  {project.featured && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-foreground mb-1 text-pretty">{project.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{project.description}</p>

                {project.results && Object.keys(project.results).length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp size={12} style={{ color: '#f4a295' }} />
                    <span className="text-xs font-medium" style={{ color: '#f4a295' }}>
                      {Object.values(project.results)[0]}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(project.tech || []).slice(0, 4).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs font-semibold flex-1" style={{ color: '#f4a295' }}>
                    View full project →
                  </span>
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-[#f4a295]/40 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Code size={13} />
                    </a>
                  )}
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-[#f4a295]/40 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  )
}
