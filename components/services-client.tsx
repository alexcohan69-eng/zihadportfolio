'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Check, Clock, ArrowUpRight, Briefcase } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import type { Service } from '@/lib/types'

export function ServicesClient({ services }: { services: Service[] }) {
  return (
    <PageShell>
      <header className="px-5 sm:px-8 pt-10 pb-8 border-b border-border">
        <p className="text-xs font-bold uppercase tracking-widest text-brand mb-3">What I Offer</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance">
          Services &amp; Pricing
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
          Clear scope, transparent pricing, and deliverables you can count on. Pick a package
          below or reach out for something custom.
        </p>
      </header>

      <section aria-label="Available services" className="px-5 sm:px-8 py-8">
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3 rounded-2xl border border-dashed border-border">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Briefcase size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No services available right now. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {services.map((service) => {
              const cover = service.media?.[0]
              return (
                <article
                  key={service.id}
                  className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
                >
                  <Link href={`/services/${service.slug}`} className="block">
                    {cover && (
                      <div className="relative w-full h-40 bg-muted overflow-hidden">
                        <Image
                          src={cover}
                          alt={`${service.title} preview`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 flex flex-col p-5 gap-4">
                    <div>
                      <Link href={`/services/${service.slug}`}>
                        <h2 className="text-lg font-bold text-foreground leading-tight hover:text-brand transition-colors">
                          {service.title}
                        </h2>
                      </Link>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {service.price && (
                        <span className="font-bold text-foreground">{service.price}</span>
                      )}
                      {service.deliveryTime && (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock size={13} />
                          {service.deliveryTime}
                        </span>
                      )}
                    </div>

                    {service.features?.length > 0 && (
                      <ul className="flex flex-col gap-2 pt-1 border-t border-border">
                        {service.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                            <Check size={15} className="text-brand shrink-0 mt-0.5" />
                            <span className="leading-snug">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link
                      href={`/services/${service.slug}`}
                      className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                      style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
                    >
                      View details
                      <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </PageShell>
  )
}
