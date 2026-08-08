/**
 * Lightweight client-account auth for the Agency SaaS layer.
 * Mirrors the existing HMAC-signed cookie pattern in `lib/auth.ts`, extended
 * for per-user credentials stored in MongoDB (raw driver, no ORM).
 * Uses the Web Crypto API only — no new dependencies (bcrypt/next-auth) required.
 */
import { type NextRequest } from 'next/server'
import type { SessionUser, User } from '@/lib/types'

export const CLIENT_SESSION_COOKIE = 'client_session'

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Edge-runtime-safe base64url encode/decode (avoids Node's Buffer). */
function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

function randomHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

/** PBKDF2-SHA256, 100k iterations — password hashing without bcrypt. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return toHex(derived)
}

export async function createPasswordHash(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomHex()
  const hash = await hashPassword(password, salt)
  return { hash, salt }
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return toHex(sig)
}

function sessionSecret(): string {
  return `${process.env.ADMIN_PASSWORD ?? 'fallback-secret'}:nextzd-client-session`
}

/** Signed, tamper-proof session token: base64(payload).signature */
export async function makeClientSessionToken(user: SessionUser): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify(user))
  const signature = await hmacSha256(payload, sessionSecret())
  return `${payload}.${signature}`
}

export async function verifyClientSessionToken(token: string): Promise<SessionUser | null> {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  try {
    const expected = await hmacSha256(payload, sessionSecret())
    if (expected !== signature) return null
    const decoded = JSON.parse(base64UrlDecode(payload))
    if (!decoded?.id || !decoded?.role || !decoded?.email) return null
    return decoded as SessionUser
  } catch {
    return null
  }
}

/** Reads and verifies the client session from an incoming request (route handlers / proxy). */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(CLIENT_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyClientSessionToken(token)
}

/** Reads and verifies the client session using the `next/headers` cookies() API (server components/actions). */
export async function getServerSession(): Promise<SessionUser | null> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyClientSessionToken(token)
}

export function stripUser(user: User): SessionUser {
  return { id: user.id, role: user.role, name: user.name, email: user.email }
}
