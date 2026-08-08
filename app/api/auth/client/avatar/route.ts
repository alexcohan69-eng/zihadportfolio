import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { getServerSession, makeClientSessionToken, CLIENT_SESSION_COOKIE } from '@/lib/client-auth'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

    const body = await request.json()
    const { avatar } = body as { avatar?: unknown }
    if (typeof avatar !== 'string' || !avatar.trim())
      return NextResponse.json({ error: 'A valid avatar URL is required.' }, { status: 400 })

    const db = await getDb()
    await db.collection('users').updateOne({ id: session.id }, { $set: { avatar } })

    const updatedSession = { ...session, avatar }
    const token = await makeClientSessionToken(updatedSession)
    const cookieStore = await cookies()
    cookieStore.set(CLIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return NextResponse.json({ success: true, user: updatedSession })
  } catch (err) {
    console.error('[client avatar PATCH]', err)
    return NextResponse.json({ error: 'Failed to update avatar.' }, { status: 500 })
  }
}
