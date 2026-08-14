/**
 * Persists Telegram admin-login sessions (`chatId -> authenticated`) in
 * MongoDB — the same database the rest of the app already uses for
 * storage, so no new infra (e.g. Redis) is introduced just for this.
 *
 * A session simply means "this chat successfully completed /login within
 * the last 24 hours." There is no per-session token; presence of a
 * non-expired document for a chat id IS the session.
 */
import { getDb } from '@/lib/db'

const COLLECTION = 'telegram_sessions'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface TelegramSessionDoc {
  _id: number // Telegram chat id
  createdAt: Date
  expiresAt: Date
}

let indexesEnsured = false

/**
 * Creates a TTL index on `expiresAt` so MongoDB automatically deletes
 * expired sessions in the background — mirrors the lazy
 * `ensureUsersIndexes` pattern in `lib/db.ts`. Safe to call repeatedly.
 */
async function ensureSessionIndexes(): Promise<void> {
  if (indexesEnsured) return
  const db = await getDb()
  await db
    .collection<TelegramSessionDoc>(COLLECTION)
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  indexesEnsured = true
}

/** Creates or refreshes a 24-hour authenticated session for a chat. */
export async function createTelegramSession(chatId: number): Promise<void> {
  await ensureSessionIndexes()
  const db = await getDb()
  const now = new Date()
  await db.collection<TelegramSessionDoc>(COLLECTION).updateOne(
    { _id: chatId },
    {
      $set: {
        createdAt: now,
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      },
    },
    { upsert: true },
  )
}

/**
 * Returns true if `chatId` has a valid, non-expired session. Fails closed
 * (returns false) if the database is unreachable, rather than throwing —
 * an admin command should never crash the bot just because a session
 * lookup failed, it should just deny access.
 */
export async function isTelegramAuthenticated(chatId: number): Promise<boolean> {
  try {
    const db = await getDb()
    const doc = await db.collection<TelegramSessionDoc>(COLLECTION).findOne({ _id: chatId })
    if (!doc) return false
    return doc.expiresAt.getTime() > Date.now()
  } catch (err) {
    console.error('[telegram-bot] Failed to look up session:', err)
    return false
  }
}

/** Removes any session for `chatId` (used by /logout). */
export async function clearTelegramSession(chatId: number): Promise<void> {
  const db = await getDb()
  await db.collection<TelegramSessionDoc>(COLLECTION).deleteOne({ _id: chatId })
}
