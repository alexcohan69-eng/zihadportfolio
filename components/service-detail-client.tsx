'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Check, Clock, Loader2, X, Film, Music, Send, CheckCircle2, Quote, Star, LogIn, Lock } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { cn } from '@/lib/utils'
import { useClientSession } from '@/hooks/use-client-session'
import type { Service } from '@/lib/types'

function mediaKind(url: string): 'image' | 'video' | 'audio' {
  if (/\.(mp4|webm|mov)$/i.test(url)) return 'video'
  if (/\.(mp3|ogg|wav|aac|flac|m4a)$/i.test(url)) return 'audio'
  return 'image'
}

function MediaGallery({ media, title }: { media: string[]; title: string }) {
  const [active, setActive] = useState(0)
  if (media.length === 0) return null
  const current = media[active]
  const kind = mediaKind(current)

  return (
    <div>
      <div className="relative w-full aspect-video bg-muted rounded-2xl overflow-hidden border border-border">
        {kind === 'image' && (
          <Image
            src={current}
            alt={`${title} preview ${active + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 700px"
            priority
          />
        )}
        {kind === 'video' && (
          <video src={current} controls className="w-full h-full object-contain bg-black" aria-label={`${title} video ${active + 1}`} />
        )}
        {kind === 'audio' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Music size={32} />
            <audio src={current} controls className="w-full max-w-xs" aria-label={`${title} audio ${active + 1}`} />
          </div>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {media.map((url, i) => {
            const k = mediaKind(url)
            return (
              <button
                key={url + i}
                onClick={() => setActive(i)}
                aria-label={`View ${title} media ${i + 1}`}
                className={cn(
                  'relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors',
                  active === i ? 'border-brand' : 'border-border hover:border-border/80',
                )}
              >
                {k === 'image' ? (
                  <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                    {k === 'video' ? <Film size={16} /> : <Music size={16} />}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function OrderModal({
  service,
  onClose,
}: {
  service: Service
  onClose: () => void
}) {
  const { user, loading: sessionLoading } = useClientSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [guestCheckout, setGuestCheckout] = useState(false)

  // Smart Ordering: once we know who's signed in, auto-fill and lock their identity.
  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          serviceTitle: service.title,
          name,
          email,
          details,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 id="order-modal-title" className="font-bold text-foreground text-sm">
            {success ? 'Order received' : `Order: ${service.title}`}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close order form"
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {success ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={40} className="text-brand" />
            <p className="text-sm text-foreground font-medium">Thanks, {name}!</p>
            <p className="text-sm text-muted-foreground">
              Your request for <strong>{service.title}</strong> has been received. Expect a reply at {email} soon.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              Close
            </button>
          </div>
        ) : sessionLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : !user && !guestCheckout ? (
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f4a29518' }}>
              <Lock size={22} style={{ color: '#f4a295' }} />
            </div>
            <p className="text-sm font-semibold text-foreground">Sign in to order &amp; track this project</p>
            <p className="text-sm text-muted-foreground">
              Create a free account to auto-fill your details, track order status, and chat directly with our team.
            </p>
            <Link
              href={`/client/login?from=/services/${service.slug}`}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              <LogIn size={15} /> Sign in
            </Link>
            <Link
              href={`/client/register?from=/services/${service.slug}`}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
            >
              Create an account
            </Link>
            <button
              onClick={() => setGuestCheckout(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
            >
              Continue as guest instead
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {user && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border">
                <Check size={14} className="text-brand shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Ordering as <strong className="text-foreground">{user.name}</strong> — this order will appear in your dashboard.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="order-name" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="order-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                readOnly={!!user}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
                  user && 'bg-muted/40 cursor-not-allowed',
                )}
              />
            </div>
            <div>
              <label htmlFor="order-email" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                id="order-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={!!user}
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
                  user && 'bg-muted/40 cursor-not-allowed',
                )}
              />
            </div>
            <div>
              <label htmlFor="order-details" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Project details <span className="text-destructive">*</span>
              </label>
              <textarea
                id="order-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                required
                placeholder="Tell me about your project, timeline, and goals..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Submit order request
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function ReviewsSection({ testimonials }: { testimonials: Service['testimonials'] }) {
  if (!testimonials || testimonials.length === 0) return null

  return (
    <section aria-labelledby="reviews-heading" className="space-y-4">
      <h2 id="reviews-heading" className="text-lg font-bold text-foreground">
        Client Reviews
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {testimonials.map((review) => (
          <figure
            key={review.id}
            className="relative flex flex-col gap-3 p-5 rounded-2xl border border-border bg-card"
          >
            <Quote size={22} className="text-brand/40" />
            {typeof review.rating === 'number' && review.rating > 0 && (
              <div className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    className={cn(i < review.rating! ? 'text-brand fill-brand' : 'text-muted-foreground/30')}
                  />
                ))}
              </div>
            )}
            <blockquote className="text-sm text-foreground/90 leading-relaxed">
              {review.excerpt || review.content}
            </blockquote>
            <figcaption className="flex items-center gap-3 mt-1">
              {review.clientImage ? (
                <img
                  src={review.clientImage}
                  alt={review.clientName || 'Client'}
                  className="w-9 h-9 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {(review.clientName || 'C').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{review.clientName || 'Anonymous'}</p>
                {review.clientRole && (
                  <p className="text-xs text-muted-foreground truncate">{review.clientRole}</p>
                )}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export function ServiceDetailClient({
  service,
  authorName,
}: {
  service: Service
  authorName: string
}) {
  const [orderOpen, setOrderOpen] = useState(false)

  return (
    <PageShell>
      <header className="px-5 sm:px-8 pt-6 pb-4 border-b border-border">
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          All services
        </Link>
        <p className="text-xs font-bold uppercase tracking-widest text-brand mb-2">Service</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance">
          {service.title}
        </h1>
      </header>

      <article className="px-5 sm:px-8 py-8 space-y-8">
        {service.media?.length > 0 && (
          <section aria-label="Service gallery">
            <MediaGallery media={service.media} title={service.title} />
          </section>
        )}

        <section aria-labelledby="overview-heading" className="space-y-3">
          <h2 id="overview-heading" className="text-lg font-bold text-foreground">
            Overview
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {service.description}
          </p>
        </section>

        <section aria-label="Pricing and delivery" className="flex flex-wrap items-center gap-6 p-5 rounded-2xl border border-border bg-muted/30">
          {service.price && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Price</p>
              <p className="text-xl font-bold text-foreground">{service.price}</p>
            </div>
          )}
          {service.deliveryTime && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Delivery Time</p>
              <p className="text-xl font-bold text-foreground flex items-center gap-2">
                <Clock size={17} className="text-brand" />
                {service.deliveryTime}
              </p>
            </div>
          )}
        </section>

        {service.features?.length > 0 && (
          <section aria-labelledby="deliverables-heading" className="space-y-3">
            <h2 id="deliverables-heading" className="text-lg font-bold text-foreground">
              What&apos;s included
            </h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {service.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 p-3.5 rounded-xl border border-border bg-card text-sm text-foreground/90">
                  <Check size={16} className="text-brand shrink-0 mt-0.5" />
                  <span className="leading-snug">{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Order this service" className="pt-2">
          <button
            onClick={() => setOrderOpen(true)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
          >
            Order Now
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Prefer email first? <Link href={`/contact?service=${service.slug}`} className="text-brand hover:underline">Reach out via contact form</Link> instead.
          </p>
        </section>

        <ReviewsSection testimonials={service.testimonials} />
      </article>

      {orderOpen && <OrderModal service={service} onClose={() => setOrderOpen(false)} />}
    </PageShell>
  )
}
