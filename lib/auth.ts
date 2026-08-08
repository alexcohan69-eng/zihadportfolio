import { type NextRequest } from 'next/server'

export const SESSION_COOKIE = 'admin_session'

/**
 * HMAC-SHA-256 of `message` keyed by `secret`.
 * Uses the Web Crypto API — available on both Edge and Node runtimes.
 */
async function hmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Derive the session token from credentials.
 * Using HMAC-SHA-256 prevents length-extension and pre-image attacks
 * compared to plain SHA-256(concat).
 */
export async function makeSessionToken(username: string, password: string): Promise<string> {
  const secret = `${process.env.ADMIN_PASSWORD ?? 'fallback-secret'}:nextzd-session`
  return hmacSha256(`${username}:${password}`, secret)
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Returns true if the request carries a valid admin session cookie.
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)
  if (!sessionCookie?.value) return false

  const envUsername = process.env.ADMIN_USERNAME ?? ''
  const envPassword = process.env.ADMIN_PASSWORD ?? ''
  if (!envUsername || !envPassword) return false

  try {
    const expected = await makeSessionToken(envUsername, envPassword)
    return safeEqual(sessionCookie.value, expected)
  } catch {
    return false
  }
}
