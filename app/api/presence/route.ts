import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isAuthenticated } from '@/lib/auth'

const ONLINE_WINDOW_MS = 3 * 60 * 1000 // admin considered "online" if seen in the last 3 minutes

// ─── GET: is the admin currently online? ───────────────────────────────────────

export async function GET() {
  try {
    const db = await getDb()
    const doc = await db.collection('presence').findOne({ id: 'admin' })
    const lastSeenAt: string | undefined = doc?.lastSeenAt
    const online = !!lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS
    return NextResponse.json({ online, lastSeenAt: lastSeenAt ?? null })
  } catch (err) {
    console.error('[presence GET]', err)
    return NextResponse.json({ online: false, lastSeenAt: null })
  }
}

// ─── POST: admin heartbeat — called while the admin has the messages page open ──

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAuthenticated(request)
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = await getDb()
    await db.collection('presence').updateOne(
      { id: 'admin' },
      { $set: { id: 'admin', lastSeenAt: new Date().toISOString() } },
      { upsert: true },
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[presence POST]', err)
    return NextResponse.json({ error: 'Failed to update presence' }, { status: 500 })
  }
}
