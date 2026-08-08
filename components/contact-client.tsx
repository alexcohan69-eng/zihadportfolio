'use client'

import { useRef, useState } from 'react'
import { PageShell } from '@/components/page-shell'
import {
  Mail, MapPin, MessageSquare, Send, CheckCircle,
  AlertCircle, Link2, Loader2, ArrowRight,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICES = [
  'Landing Page Design',
  'Webflow Development',
  'React / Next.js App',
  'CRO Audit & Redesign',
  'Design System',
  'Other',
]

const BUDGETS = [
  { label: 'Under $500',      value: 'Under $500' },
  { label: '$500 – $1,500',   value: '$500 – $1,500' },
  { label: '$1,500 – $5,000', value: '$1,500 – $5,000' },
  { label: '$5,000+',         value: '$5,000+' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = 'idle' | 'sending' | 'sent' | 'error'

interface FieldErrors {
  name?: string
  email?: string
  message?: string
}

interface ContactData {
  email: string
  phone: string
  whatsapp?: string
  address: string
  shortText: string
  contactHeading?: string
  contactSubHeading?: string
  socials: { platform: string; url: string }[]
}

// ─── Shared input class ───────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 ' +
  'focus:border-brand transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({
  type,
  message,
  onDismiss,
}: {
  type: 'success' | 'error'
  message: string
  onDismiss: () => void
}) {
  const isSuccess = type === 'success'
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-3 rounded-2xl p-4 text-sm leading-relaxed"
      style={{
        background: isSuccess ? 'rgba(244,162,149,.08)' : 'rgba(248,113,113,.08)',
        border: `1px solid ${isSuccess ? 'rgba(244,162,149,.3)' : 'rgba(248,113,113,.3)'}`,
      }}
    >
      {isSuccess
        ? <CheckCircle size={15} style={{ color: '#f4a295', flexShrink: 0, marginTop: 1 }} />
        : <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
      }
      <p style={{ color: isSuccess ? '#f4a295' : '#f87171', flex: 1 }}>{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-xs opacity-40 hover:opacity-100 transition-opacity ml-1"
        style={{ color: isSuccess ? '#f4a295' : '#f87171' }}
      >
        ✕
      </button>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-foreground tracking-wide">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400" role="alert" id={`${htmlFor}-error`}>
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContactClient({ contactData }: { contactData: ContactData }) {
  const [formState, setFormState]     = useState<FormState>('idle')
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [service, setService]         = useState('')
  const [budget, setBudget]           = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  const waNumber = contactData.whatsapp || contactData.phone

  const CONTACT_OPTIONS = [
    {
      icon: MessageSquare,
      label: 'WhatsApp / Phone',
      value: contactData.whatsapp || contactData.phone || '+880…',
      href: waNumber ? `https://wa.me/${waNumber.replace(/[\s\-+]/g, '')}` : null,
    },
    {
      icon: Mail,
      label: 'Email',
      value: contactData.email || 'hello@zihad.com',
      href: contactData.email ? `mailto:${contactData.email}` : null,
    },
    {
      icon: MapPin,
      label: 'Location',
      value: contactData.address || 'Dhaka, Bangladesh',
      href: null,
    },
  ]

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(name: string, email: string, message: string): FieldErrors {
    const errs: FieldErrors = {}
    if (!name.trim())
      errs.name = 'Full name is required.'
    if (!email.trim())
      errs.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = 'Please enter a valid email address.'
    if (!message.trim())
      errs.message = 'Message is required.'
    else if (message.trim().length < 10)
      errs.message = 'Message must be at least 10 characters.'
    return errs
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setToast(null)

    const form    = e.currentTarget
    const name    = (form.elements.namedItem('name')    as HTMLInputElement).value
    const email   = (form.elements.namedItem('email')   as HTMLInputElement).value
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement).value

    const errs = validate(name, email, message)
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setFormState('sending')

    try {
      const res  = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, email, service, budget, message }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFormState('error')
        setToast({ type: 'error', message: json.error ?? 'Something went wrong. Please try again.' })
      } else {
        setFormState('sent')
        setToast({ type: 'success', message: "Message sent — I'll reply within 24 hours." })
        formRef.current?.reset()
        setService('')
        setBudget('')
      }
    } catch {
      setFormState('error')
      setToast({ type: 'error', message: 'Network error. Check your connection and try again.' })
    }
  }

  function resetForm() {
    setFormState('idle')
    setToast(null)
    setFieldErrors({})
    setService('')
    setBudget('')
    formRef.current?.reset()
  }

  const isSending = formState === 'sending'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageShell>

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <h1 className="font-bold text-lg text-foreground">Contact</h1>
        <p className="text-xs text-muted-foreground">Let&apos;s build something great</p>
      </div>

      {/* Intro */}
      <div className="px-5 py-6 border-b border-border">
        <h2 className="font-bold text-xl text-foreground mb-2 text-pretty">
          {contactData.contactHeading || 'Got a project in mind?'}
        </h2>
        {contactData.contactSubHeading && (
          <p className="text-sm font-medium text-muted-foreground mb-2 whitespace-pre-wrap">
            {contactData.contactSubHeading}
          </p>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {contactData.shortText ||
            "I'm available for freelance work. Drop me a message and I'll get back to you within 24 hours."}
        </p>
      </div>

      {/* Contact options */}
      <div className="px-5 py-5 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Reach me directly
        </h3>

        <div className="flex flex-col gap-3 mb-4">
          {CONTACT_OPTIONS.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(244,162,149,0.12)' }}
              >
                <Icon size={16} style={{ color: '#f4a295' }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:underline transition-colors truncate block"
                    style={{ textDecorationColor: '#f4a295' }}
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-foreground truncate">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {contactData.socials && contactData.socials.length > 0 && (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 pt-3 border-t border-border">
              Social Links
            </h3>
            <div className="flex flex-wrap gap-2">
              {contactData.socials.map((social, i) => (
                <a
                  key={i}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Link2 size={13} style={{ color: '#f4a295' }} />
                  {social.platform}
                </a>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Form section */}
      <div className="px-5 py-6">

        {/* ── Success state ── */}
        {formState === 'sent' ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(244,162,149,0.12)' }}
            >
              <CheckCircle size={30} style={{ color: '#f4a295' }} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground mb-1">Message sent!</h3>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Thanks for reaching out. I&apos;ll review your message and reply as soon as possible.
              </p>
            </div>
            <button
              onClick={resetForm}
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-75"
              style={{ color: '#f4a295' }}
            >
              Send another message <ArrowRight size={14} />
            </button>
          </div>

        ) : (

          /* ── Form ── */
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            aria-label="Contact form"
            className="flex flex-col gap-5"
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Send a message
            </h3>

            {/* Toast notification */}
            {toast && (
              <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
            )}

            {/* Name + Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name *" htmlFor="name" error={fieldErrors.name}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  disabled={isSending}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  className={inputCls}
                  style={fieldErrors.name ? { borderColor: '#f87171' } : undefined}
                />
              </Field>
              <Field label="Email Address *" htmlFor="email" error={fieldErrors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@example.com"
                  disabled={isSending}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={inputCls}
                  style={fieldErrors.email ? { borderColor: '#f87171' } : undefined}
                />
              </Field>
            </div>

            {/* Service chips */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-foreground tracking-wide">What do you need?</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Service type">
                {SERVICES.map((s) => {
                  const active = service === s
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setService(active ? '' : s)}
                      disabled={isSending}
                      aria-pressed={active}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 disabled:opacity-50"
                      style={
                        active
                          ? { backgroundColor: '#f4a295', color: '#1a1a1a', borderColor: '#f4a295' }
                          : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                      }
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Budget chips */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-foreground tracking-wide">Budget (USD)</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Budget range">
                {BUDGETS.map((b) => {
                  const active = budget === b.value
                  return (
                    <button
                      type="button"
                      key={b.value}
                      onClick={() => setBudget(active ? '' : b.value)}
                      disabled={isSending}
                      aria-pressed={active}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 disabled:opacity-50"
                      style={
                        active
                          ? { backgroundColor: '#f4a295', color: '#1a1a1a', borderColor: '#f4a295' }
                          : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }
                      }
                    >
                      {b.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Message */}
            <Field label="Message *" htmlFor="message" error={fieldErrors.message}>
              <textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Tell me about your project, goals, and timeline…"
                disabled={isSending}
                aria-invalid={!!fieldErrors.message}
                aria-describedby={fieldErrors.message ? 'message-error' : undefined}
                className={`${inputCls} resize-none leading-relaxed`}
                style={fieldErrors.message ? { borderColor: '#f87171' } : undefined}
              />
            </Field>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSending}
              aria-busy={isSending}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[.98]"
              style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
            >
              {isSending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={15} />
                  Send Message
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </PageShell>
  )
}
