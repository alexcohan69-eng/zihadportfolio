import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { createPasswordHash, makeClientSessionToken, stripUser, CLIENT_SESSION_COOKIE } from '@/lib/client-auth'
import type { User } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body as { name?: unknown; email?: unknown; password?: unknown }

    if (typeof name !== 'string' || !name.trim())
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })

    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })

    if (typeof password !== 'string' || password.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })

    const cleanEmail = email.trim().toLowerCase()
    const db = await getDb()

    const existing = await db.collection('users').findOne({ email: cleanEmail })
    if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })

    const { hash, salt } = await createPasswordHash(password)
    const newUser: User = {
      id: `user-${Date.now()}`,
      role: 'client',
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
    }
    await db.collection('users').insertOne(newUser)

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
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 })
  }
}
