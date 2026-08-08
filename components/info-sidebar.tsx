import Link from 'next/link'
import { MapPin, Calendar, ExternalLink, Star } from 'lucide-react'

const SKILLS = [
  'React.js',
  'Next.js',
  'Webflow',
  'TypeScript',
  'TailwindCSS',
  'Node.js',
  'Figma',
  'SEO',
]

const SERVICES = [
  { title: 'Landing Pages', desc: 'High-converting pages built to grow your business' },
  { title: 'Webflow Development', desc: 'Custom Webflow sites, CMS & interactions' },
  { title: 'React / Next.js Apps', desc: 'Scalable, performant web applications' },
  { title: 'CRO Audits', desc: 'Conversion rate optimization & UX reviews' },
]

export function InfoSidebar() {
  return (
    <aside className="hidden lg:flex flex-col gap-5 w-80 min-h-screen sticky top-0 pt-6 pb-10 px-5 border-l border-border shrink-0 overflow-y-auto">

      {/* About card */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm text-foreground mb-3">About Zihad</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Frontend Developer & Webflow specialist crafting websites that drive real engagement and conversions.
        </p>
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <MapPin size={13} style={{ color: '#f4a295' }} />
            Dhaka Cantonment, Bangladesh
          </span>
          <span className="flex items-center gap-2">
            <Calendar size={13} style={{ color: '#f4a295' }} />
            Active since March 2022
          </span>
          <Link
            href="https://www.linkedin.com/in/zihadimtiase"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
            <ExternalLink size={13} style={{ color: '#f4a295' }} />
            /in/zihadimtiase
          </Link>
        </div>
      </div>

      {/* Skills */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm text-foreground mb-3">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-brand hover:text-foreground transition-colors cursor-default"
              style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm text-foreground mb-3">Services</h3>
        <div className="flex flex-col gap-3">
          {SERVICES.map((s) => (
            <div key={s.title} className="flex items-start gap-2.5">
              <Star size={13} className="mt-0.5 shrink-0" style={{ color: '#f4a295' }} />
              <div>
                <p className="text-xs font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-bold text-sm text-foreground mb-3">By the numbers</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: '50+', label: 'Projects' },
            { value: '40+', label: 'Clients' },
            { value: '4+', label: 'Years exp.' },
            { value: '98%', label: 'Satisfaction' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center p-2 rounded-xl bg-muted">
              <p className="text-lg font-bold" style={{ color: '#f4a295' }}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center px-2 leading-relaxed">
        &copy; {new Date().getFullYear()} Zihad Imtiase. All rights reserved.
      </p>
    </aside>
  )
}
