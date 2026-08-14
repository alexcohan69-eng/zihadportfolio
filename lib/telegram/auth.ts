/**
 * Telegram bot authentication — reuses the SAME admin credentials as the
 * web admin panel (ADMIN_USERNAME / ADMIN_PASSWORD env vars + the
 * constant-time comparison in `lib/auth.ts`). No Telegram user ID
 * allowlist, no separate account system.
 *
 * Sessions are keyed by Telegram chat ID and persisted in MongoDB so they
 * survive across serverless invocations (production runs as a stateless
 * webhook). A TTL index expires sessions automatically.
 */
import { getDb } from '@/lib/db'
import { safeEqual } from '@/lib/auth'
import { telegramLog } from '@/lib/telegram/logger'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes after repeated failures

interface TelegramSessionDoc {
  chatId: number
  authenticatedAt: Date
  expiresAt: Date
  failedAttempts: number
  lockedUntil?: Date
}

let indexesEnsured = false

async function getSessionsCollection() {
  const db = await getDb()
  const col = db.collection<TelegramSessionDoc>('telegram_admin_sessions')
  if (!indexesEnsured) {
    // TTL index — Mongo auto-deletes documents once expiresAt passes.
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {})
    await col.createIndex({ chatId: 1 }, { unique: true }).catch(() => {})
    indexesEnsured = true
  }
  return col
}

/**
 * Returns true if this chat is currently locked out from further login
 * attempts due to repeated failures.
 */
export async function isLockedOut(chatId: number): Promise<{ locked: boolean; retryAfterMs?: number }> {
  const col = await getSessionsCollection()
  const doc = await col.findOne({ chatId })
  if (doc?.lockedUntil && doc.lockedUntil.getTime() > Date.now()) {
    return { locked: true, retryAfterMs: doc.lockedUntil.getTime() - Date.now() }
  }
  return { locked: false }
}

/**
 * Verifies username/password against the same admin credentials used by
 * the web login route, tracks failed attempts per chat, and — on success —
 * marks the chat authenticated for SESSION_TTL_MS.
 */
export async function loginWithCredentials(
  chatId: number,
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const lockout = await isLockedOut(chatId)
  if (lockout.locked) {
    const minutes = Math.ceil((lockout.retryAfterMs ?? 0) / 60000)
    return { success: false, error: `Too many failed attempts. Try again in ${minutes} min.` }
  }

  const envUsername = process.env.ADMIN_USERNAME ?? ''
  const envPassword = process.env.ADMIN_PASSWORD ?? ''
  const col = await getSessionsCollection()

  if (!envUsername || !envPassword) {
    telegramLog('error', 'login', chatId, 'admin credentials not configured on server')
    return { success: false, error: 'Admin credentials are not configured on the server.' }
  }

  // Constant-time comparisons — never short-circuit on username first so we
  // don't leak which field was wrong via timing, and never reveal which
  // one was incorrect in the response.
  const usernameMatch = safeEqual(username.trim(), envUsername.trim())
  const passwordMatch = safeEqual(password, envPassword)

  if (!usernameMatch || !passwordMatch) {
    const existing = await col.findOne({ chatId })
    const failedAttempts = (existing?.failedAttempts ?? 0) + 1
    const update: Partial<TelegramSessionDoc> = { failedAttempts }
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_MS)
    }
    await col.updateOne({ chatId }, { $set: update }, { upsert: true })

    telegramLog('warn', 'login', chatId, 'failed login attempt', { failedAttempts })
    // Artificial delay to deter brute force, matching the web login route.
    await new Promise((r) => setTimeout(r, 500))
    return { success: false, error: 'Invalid username or password' }
  }

  const now = new Date()
  await col.updateOne(
    { chatId },
    {
      $set: {
        chatId,
        authenticatedAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        failedAttempts: 0,
      },
      $unset: { lockedUntil: '' },
    },
    { upsert: true },
  )

  telegramLog('info', 'login', chatId, 'login successful')
  return { success: true }
}

/**
 * Returns true if this chat currently holds a valid, non-expired session.
 */
export async function isChatAuthenticated(chatId: number): Promise<boolean> {
  const col = await getSessionsCollection()
  const doc = await col.findOne({ chatId })
  if (!doc) return false
  if (doc.expiresAt.getTime() <= Date.now()) return false
  return true
}

/**
 * Ends the session for this chat (used by /logout and on expiry cleanup).
 */
export async function logoutChat(chatId: number): Promise<void> {
  const col = await getSessionsCollection()
  await col.deleteOne({ chatId })
  telegramLog('info', 'logout', chatId, 'session ended')
}
