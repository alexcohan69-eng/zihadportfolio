import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getDb } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'
import { getSessionFromRequest } from '@/lib/client-auth'
import type { Message } from '@/lib/types'

const ONLINE_WINDOW_MS = 3 * 60 * 1000

function offlineNotificationHtml(message: Message, orderTitle: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
        <tr>
          <td style="background:linear-gradient(135deg,#a8d5c2 0%,#7fb89e 100%);padding:28px 32px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(26,26,26,.6)">New Chat Message</p>
            <h1 style="margin:0;font-size:20px;font-weight:800;color:#1a1a1a">${orderTitle}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.05em">${message.senderName}</p>
            <div style="background:#fafafa;border:1px solid #f0f0f0;border-radius:10px;padding:16px 18px">
              <p style="margin:0;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap">${message.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
            <p style="margin:18px 0 0;font-size:12px;color:#bbb">You appear to be offline — reply from the admin messages dashboard.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── GET: fetch messages for an order ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

    const isAdmin = await isAuthenticated(request)
    const sessionUser = await getSessionFromRequest(request)
    if (!isAdmin && !sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()

    // Non-admin callers may only read messages for orders that belong to them.
    if (!isAdmin) {
      const order = await db.collection('orders').findOne({ id: orderId })
      if (!order || order.clientId !== sessionUser!.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const docs = await db.collection('messages').find({ orderId }).sort({ createdAt: 1 }).toArray()
    const messages = docs.map(({ _id, ...rest }) => rest)
    return NextResponse.json({ messages })
  } catch (err) {
    console.error('[messages GET]', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

// ─── POST: send a message ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAuthenticated(request)
    const sessionUser = await getSessionFromRequest(request)
    if (!isAdmin && !sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { orderId, text, media } = body as { orderId?: unknown; text?: unknown; media?: unknown }

    if (typeof orderId !== 'string' || !orderId.trim())
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    if (typeof text !== 'string' || !text.trim())
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })

    const db = await getDb()
    const order = await db.collection('orders').findOne({ id: orderId })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (!isAdmin && order.clientId !== sessionUser!.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      orderId: orderId.trim(),
      senderId: isAdmin ? 'admin' : sessionUser!.id,
      senderRole: isAdmin ? 'admin' : 'client',
      senderName: isAdmin ? 'Support Team' : sessionUser!.name,
      text: text.trim(),
      media: Array.isArray(media) ? media.filter(Boolean).map(String) : [],
      createdAt: new Date().toISOString(),
      read: false,
    }
    await db.collection('messages').insertOne(newMessage)

    // ── If a client messaged and the admin is offline, notify via Resend ─────
    if (!isAdmin) {
      try {
        const presenceDoc = await db.collection('presence').findOne({ id: 'admin' })
        const lastSeenAt: string | undefined = presenceDoc?.lastSeenAt
        const adminOnline = !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS

        if (!adminOnline) {
          const key = process.env.RESEND_API_KEY
          if (!key) throw new Error('RESEND_API_KEY is not set')
          const resend = new Resend(key)
          await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: ['zdimtiase@gmail.com'],
            subject: `New chat message — ${order.serviceTitle ?? 'Order'} (${newMessage.senderName})`,
            html: offlineNotificationHtml(newMessage, order.serviceTitle ?? 'Order'),
          })
        }
      } catch (emailErr) {
        console.error('[messages POST] Resend error:', emailErr)
      }
    }

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 })
  } catch (err) {
    console.error('[messages POST]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
