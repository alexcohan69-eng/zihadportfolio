import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb, ensureUsersIndexes } from '@/lib/db'
import { createPasswordHash, makeClientSessionToken, stripUser, CLIENT_SESSION_COOKIE } from '@/lib/client-auth'
import { registerSchema, firstFieldErrors } from '@/lib/validation/auth'
import type { User } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const fieldErrors = firstFieldErrors(parsed.error)
      const firstMessage = Object.values(fieldErrors)[0] ?? 'Invalid registration details.'
      return NextResponse.json({ error: firstMessage, fieldErrors }, { status: 400 })
    }

    const { name, email: cleanEmail, password } = parsed.data
    const db = await getDb()
    await ensureUsersIndexes()

    // Friendly, fast-path check first. The unique index ensured above is the
    // real backstop against a race between two concurrent registrations for
    // the same email — this check just produces a nicer message in the
    // common (non-racing) case.
    const existing = await db.collection('users').findOne({ email: cleanEmail })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Try signing in instead.' }, { status: 409 })
    }

    const { hash, salt } = await createPasswordHash(password)
    const newUser: User = {
      id: `user-${Date.now()}`,
      role: 'client',
      name,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
    }

    try {
      await db.collection('users').insertOne(newUser)
    } catch (err: any) {
      // MongoDB duplicate-key error (E11000) — the race the pre-check above missed.
      if (err?.code === 11000) {
        return NextResponse.json({ error: 'An account with this email already exists. Try signing in instead.' }, { status: 409 })
      }
      throw err
    }

    const sessionUser = stripUser(newUser)
    const token = await makeClientSessionToken(sessionUser)
    const cookieStore = await cookies()
    cookieStore.set(CLIENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return NextResponse.json({ success: true, user: sessionUser }, { status: 201 })
  } catch (err) {
    console.error('[client register POST]', err)
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }
}
