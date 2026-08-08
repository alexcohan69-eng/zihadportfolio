import { NextRequest, NextResponse } from 'next/server'
import { makeSessionToken, safeEqual, SESSION_COOKIE } from '@/lib/auth'
import { verifyClientSessionToken, CLIENT_SESSION_COOKIE } from '@/lib/client-auth'

const LOGIN_PAGE = '/login'
const CLIENT_LOGIN_PAGE = '/client/login'

// ✅ এখানে ফাংশনের নাম middleware থেকে পরিবর্তন করে proxy করা হয়েছে
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/client') && !pathname.startsWith('/client/login') && !pathname.startsWith('/client/register')) {
    const clientCookie = request.cookies.get(CLIENT_SESSION_COOKIE)
    const sessionUser = clientCookie?.value ? await verifyClientSessionToken(clientCookie.value) : null
    if (!sessionUser) {
      const loginUrl = new URL(CLIENT_LOGIN_PAGE, request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)

  if (!sessionCookie?.value) {
    const loginUrl = new URL(LOGIN_PAGE, request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const envUsername = process.env.ADMIN_USERNAME ?? ''
  const envPassword = process.env.ADMIN_PASSWORD ?? ''

  // If credentials are not yet configured, allow through to avoid lockout
  if (!envUsername || !envPassword) {
    return NextResponse.next()
  }

  try {
    const expectedToken = await makeSessionToken(envUsername, envPassword)
    if (!safeEqual(sessionCookie.value, expectedToken)) {
      const loginUrl = new URL(LOGIN_PAGE, request.url)
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
  } catch {
    const loginUrl = new URL(LOGIN_PAGE, request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/client', '/client/:path*'],
}
