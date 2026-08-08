import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { makeSessionToken, safeEqual, SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const envUsername = process.env.ADMIN_USERNAME ?? ''
    const envPassword = process.env.ADMIN_PASSWORD ?? ''

    if (!envUsername || !envPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured on the server' },
        { status: 500 },
      )
    }

    const usernameMatch = safeEqual(username.trim(), envUsername.trim())
    const passwordMatch = safeEqual(password, envPassword)

    if (!usernameMatch || !passwordMatch) {
      // Artificial delay to further deter brute force
      await new Promise((r) => setTimeout(r, 500))
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await makeSessionToken(envUsername, envPassword)
    const cookieStore = await cookies()

    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    // Non-HttpOnly UI hint cookie — security relies solely on the HttpOnly session above.
    cookieStore.set('admin_hint', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
