import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getDb } from '@/lib/db'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactSubmission {
  id: string
  name: string
  email: string
  service: string
  budget: string
  message: string
  submittedAt: string
}

// ─── Email template ───────────────────────────────────────────────────────────

function ownerHtml(s: ContactSubmission): string {
  const formatted = new Date(s.submittedAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const badge = (text: string) =>
    `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#f4a29520;color:#c0614e;border:1px solid #f4a29540">${text}</span>`

  const row = (label: string, value: string) =>
    value.trim()
      ? `<tr>
           <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;width:120px;vertical-align:top">
             <span style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#aaa">${label}</span>
           </td>
           <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top">
             <span style="font-size:14px;color:#1a1a1a;line-height:1.5">${value}</span>
           </td>
         </tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Contact — ${s.name}</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:40px 16px">
    <tr><td align="center">

      <!-- Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">

        <!-- Header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#f4a295 0%,#e8806f 100%);padding:32px 36px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(26,26,26,.6)">
              New Inquiry
            </p>
            <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#1a1a1a;line-height:1.2">
              ${s.name} reached out
            </h1>
            <p style="margin:0;font-size:13px;color:rgba(26,26,26,.55)">${formatted}</p>
          </td>
        </tr>

        <!-- Submission data -->
        <tr>
          <td style="padding:32px 36px 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row('From', `<a href="mailto:${s.email}" style="color:#f4a295;text-decoration:none;font-weight:600">${s.email}</a>`)}
              ${s.service ? row('Service',  badge(s.service)) : ''}
              ${s.budget  ? row('Budget',   badge(s.budget))  : ''}
            </table>
          </td>
        </tr>

        <!-- Divider label -->
        <tr>
          <td style="padding:0 36px 12px">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#bbb">
              Message
            </p>
          </td>
        </tr>

        <!-- Message body -->
        <tr>
          <td style="padding:0 36px 32px">
            <div style="background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;padding:20px 22px">
              <p style="margin:0;font-size:14px;color:#333;line-height:1.75;white-space:pre-wrap">${s.message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 36px" align="center">
            <a
              href="mailto:${s.email}?subject=Re%3A Your message&body=Hi ${encodeURIComponent(s.name)}%2C%0A%0A"
              style="display:inline-block;padding:14px 32px;background:#f4a295;color:#1a1a1a;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;letter-spacing:.02em"
            >
              Reply to ${s.name} →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:20px 36px">
            <p style="margin:0;font-size:12px;color:#bbb;line-height:1.6">
              This notification was sent from your portfolio contact form at
              <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zihadimtiase.com'}" style="color:#f4a295;text-decoration:none">${process.env.NEXT_PUBLIC_BASE_URL ?? 'zihadimtiase.com'}</a>.
              Click the button above to reply directly to ${s.name}.
            </p>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, service, budget, message } = body as {
      name?: unknown
      email?: unknown
      service?: unknown
      budget?: unknown
      message?: unknown
    }

    // ── Server-side validation ──────────────────────────────────────────────
    if (typeof name !== 'string' || !name.trim())
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })

    if (typeof email !== 'string' || !email.trim())
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })

    if (typeof message !== 'string' || message.trim().length < 10)
      return NextResponse.json({ error: 'Message must be at least 10 characters.' }, { status: 400 })

    if (typeof service === 'string' && service.trim().length > 120)
      return NextResponse.json({ error: 'Invalid service value.' }, { status: 400 })

    if (typeof budget === 'string' && budget.trim().length > 60)
      return NextResponse.json({ error: 'Invalid budget value.' }, { status: 400 })

    const submission: ContactSubmission = {
      id:          `contact-${Date.now()}`,
      name:        name.trim(),
      email:       email.trim().toLowerCase(),
      service:     typeof service === 'string' ? service.trim() : '',
      budget:      typeof budget  === 'string' ? budget.trim()  : '',
      message:     message.trim(),
      submittedAt: new Date().toISOString(),
    }

    // ── 1. Persist to MongoDB ───────────────────────────────────────────────
    const db = await getDb()
    await db.collection('contacts').insertOne(submission)

    // ── 2. Send owner notification via Resend ───────────────────────────────
    try {
      const key = process.env.RESEND_API_KEY
      if (!key) throw new Error('RESEND_API_KEY is not set')

      const resend = new Resend(key)
      await resend.emails.send({
        from:    'onboarding@resend.dev',
        to:      ['zdimtiase@gmail.com'],
        replyTo: submission.email,
        subject: `New message from ${submission.name}${submission.service ? ` — ${submission.service}` : ''}`,
        html:    ownerHtml(submission),
      })
    } catch (emailErr) {
      // Email failure must not surface as a 500 — submission is already saved.
      console.error('[contact POST] Resend error:', emailErr)
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[contact POST]', err)
    return NextResponse.json({ error: 'Failed to save your message. Please try again.' }, { status: 500 })
  }
}
