import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getDb } from '@/lib/db'
import { addServiceOrder } from '@/lib/data-actions'
import { getSessionFromRequest } from '@/lib/client-auth'
import { isAuthenticated } from '@/lib/auth'

// ─── GET: list orders (client sees own, admin sees all) ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAuthenticated(request)
    const sessionUser = await getSessionFromRequest(request)

    if (!isAdmin && !sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = await getDb()
    const query = isAdmin ? {} : { clientId: sessionUser!.id }
    const orders = await db
      .collection('orders')
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray()

    const clean = orders.map(({ _id, ...rest }) => rest)
    return NextResponse.json({ orders: clean })
  } catch (err) {
    console.error('[orders GET]', err)
    return NextResponse.json({ error: 'Failed to load orders.' }, { status: 500 })
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderSubmission {
  id: string
  serviceId: string
  serviceTitle: string
  name: string
  email: string
  details: string
  submittedAt: string
  clientId?: string
}

// ─── Email template ───────────────────────────────────────────────────────────

function ownerHtml(o: OrderSubmission): string {
  const formatted = new Date(o.submittedAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

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
  <title>New Order — ${o.serviceTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">

        <tr>
          <td style="background:linear-gradient(135deg,#9db8e8 0%,#6f8fd6 100%);padding:32px 36px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(26,26,26,.6)">
              New Order Request
            </p>
            <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#1a1a1a;line-height:1.2">
              ${o.serviceTitle}
            </h1>
            <p style="margin:0;font-size:13px;color:rgba(26,26,26,.55)">${formatted}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:32px 36px 24px">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row('Name', o.name)}
              ${row('From', `<a href="mailto:${o.email}" style="color:#6f8fd6;text-decoration:none;font-weight:600">${o.email}</a>`)}
              ${row('Service', o.serviceTitle)}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 36px 12px">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#bbb">
              Project Details
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 36px 32px">
            <div style="background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;padding:20px 22px">
              <p style="margin:0;font-size:14px;color:#333;line-height:1.75;white-space:pre-wrap">${o.details.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:0 36px 36px" align="center">
            <a
              href="mailto:${o.email}?subject=Re%3A Your order for ${encodeURIComponent(o.serviceTitle)}&body=Hi ${encodeURIComponent(o.name)}%2C%0A%0A"
              style="display:inline-block;padding:14px 32px;background:#9db8e8;color:#1a1a1a;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;letter-spacing:.02em"
            >
              Reply to ${o.name} →
            </a>
          </td>
        </tr>

        <tr>
          <td style="background:#fafafa;border-top:1px solid #f0f0f0;padding:20px 36px">
            <p style="margin:0;font-size:12px;color:#bbb;line-height:1.6">
              This order notification was sent from your services page. Click the button above to reply directly to ${o.name}.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serviceId, serviceTitle, name, email, details } = body as {
      serviceId?: unknown
      serviceTitle?: unknown
      name?: unknown
      email?: unknown
      details?: unknown
    }

    if (typeof name !== 'string' || !name.trim())
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })

    if (typeof email !== 'string' || !email.trim())
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 })

    if (typeof details !== 'string' || details.trim().length < 10)
      return NextResponse.json({ error: 'Project details must be at least 10 characters.' }, { status: 400 })

    if (typeof serviceId !== 'string' || !serviceId.trim())
      return NextResponse.json({ error: 'Invalid service.' }, { status: 400 })

    if (typeof serviceTitle !== 'string' || serviceTitle.trim().length > 160)
      return NextResponse.json({ error: 'Invalid service title.' }, { status: 400 })

    // ── Verify the service actually exists and is active ───────────────────
    const db = await getDb()
    const service = await db.collection('services').findOne({ id: serviceId, isActive: true })
    if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })

    const sessionUser = await getSessionFromRequest(request)

    const submission: OrderSubmission = {
      id: `order-${Date.now()}`,
      serviceId: serviceId.trim(),
      serviceTitle: serviceTitle.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      details: details.trim(),
      submittedAt: new Date().toISOString(),
      ...(sessionUser ? { clientId: sessionUser.id } : {}),
    }

    // ── 1. Persist to MongoDB ───────────────────────────────────────────────
    const saveResult = await addServiceOrder(submission)
    if (!saveResult.success) {
      return NextResponse.json({ error: 'Failed to save your order. Please try again.' }, { status: 500 })
    }

    // ── 2. Send owner notification via Resend ───────────────────────────────
    try {
      const key = process.env.RESEND_API_KEY
      if (!key) throw new Error('RESEND_API_KEY is not set')

      const resend = new Resend(key)
      await resend.emails.send({
        from:    'onboarding@resend.dev',
        to:      ['zdimtiase@gmail.com'],
        replyTo: submission.email,
        subject: `New order — ${submission.serviceTitle} (${submission.name})`,
        html:    ownerHtml(submission),
      })
    } catch (emailErr) {
      // Email failure must not surface as a 500 — order is already saved.
      console.error('[orders POST] Resend error:', emailErr)
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('[orders POST]', err)
    return NextResponse.json({ error: 'Failed to save your order. Please try again.' }, { status: 500 })
  }
}
