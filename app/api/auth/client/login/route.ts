import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { hashPassword, makeClientSessionToken, stripUser, CLIENT_SESSION_COOKIE } from '@/lib/client-auth'
import type { User } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email?: unknown; password?: unknown }

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const db = await getDb()
    const doc = await db.collection('users').findOne({ email: email.trim().toLowerCase() })
    const user = doc ? (doc as unknown as User) : null
    if (!user) {
      await new Promise((r) => setTimeout(r, 400))
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const candidateHash = await hashPassword(password, user.salt)
    if (candidateHash !== user.passwordHash) {
      await new Promise((r) => setTimeout(r, 400))
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const sessionUser = stripUser(user)
    const token = await makeClientSessionToken(sessionUser)
    const cookieStore = await cookies()
    cookieStore.set(CLIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return NextResponse.json({ success: true, user: sessionUser })
  } catch (err) {
    console.error('[client login POST]', err)
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 })
  }
}
