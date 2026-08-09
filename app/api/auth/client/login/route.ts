import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { hashPassword, makeClientSessionToken, stripUser, CLIENT_SESSION_COOKIE } from '@/lib/client-auth'
import { loginSchema } from '@/lib/validation/auth'
import type { User } from '@/lib/types'

// Fixed floor for every failed attempt (bad email OR bad password) so response
// timing can't be used to enumerate which accounts exist.
const AUTH_FAILURE_DELAY_MS = 400

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const db = await getDb()
    const doc = await db.collection('users').findOne({ email })
    const user = doc ? (doc as unknown as User) : null

    // Deliberately generic message for both "no such account" and "wrong
    // password" — specific messages here would let an attacker enumerate
    // which emails are registered.
    if (!user || !user.passwordHash || !user.salt) {
      await new Promise((r) => setTimeout(r, AUTH_FAILURE_DELAY_MS))
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const candidateHash = await hashPassword(password, user.salt)
    if (candidateHash !== user.passwordHash) {
      await new Promise((r) => setTimeout(r, AUTH_FAILURE_DELAY_MS))
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
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
