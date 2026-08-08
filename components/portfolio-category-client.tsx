'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Code, TrendingUp } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import type { Project } from '@/lib/data'

interface PortfolioCategoryClientProps {
  projects: Project[]
  slug: string
}

export function PortfolioCategoryClient({ projects, slug }: PortfolioCategoryClientProps) {
  const router = useRouter()
  const label = slug === 'all' ? 'All Projects' : slug

  return (
    <PageShell>
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-bold text-base text-foreground capitalize">{label}</h1>
          <p className="text-xs text-muted-foreground">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <p className="text-sm text-muted-foreground">No projects in this category.</p>
          </div>
        ) : (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/portfolio/${project.id}`}
              className="block rounded-2xl border border-border bg-card hover:border-[#f4a295]/40 transition-colors overflow-hidden group"
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
                
                <h3 className="font-bold text-sm text-foreground mb-1">{project.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{project.description}</p>
                
                {project.results && Object.keys(project.results).length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp size={12} style={{ color: '#f4a295' }} />
                    <span className="text-xs font-medium" style={{ color: '#f4a295' }}>
                      {Object.values(project.results)[0]}
                    </span>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1.5">
                  {(project.tech || []).slice(0, 4).map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </PageShell>
  )
}
