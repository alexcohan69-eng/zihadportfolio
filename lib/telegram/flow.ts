/**
 * Multi-step conversation state for the Telegram bot (login wizard, post
 * creation/edit wizard, settings editing). Persisted in MongoDB — keyed by
 * chat ID — so flows survive across serverless webhook invocations. A TTL
 * index abandons stale/incomplete flows after 30 minutes of inactivity.
 */
import { getDb } from '@/lib/db'

export type Flow =
  | { kind: 'login'; step: 'username' | 'password'; username?: string }
  | {
      kind: 'create_post'
      step: 'title' | 'content' | 'category' | 'media' | 'confirm'
      title?: string
      content?: string
      category?: string
      image?: string
    }
  | { kind: 'edit_post'; step: 'field' | 'value'; itemId: string; field?: string }
  | { kind: 'site_set'; step: 'value'; field: string; label: string }

interface FlowDoc {
  chatId: number
  flow: Flow
  updatedAt: Date
}

let indexesEnsured = false

async function getFlowsCollection() {
  const db = await getDb()
  const col = db.collection<FlowDoc>('telegram_bot_flows')
  if (!indexesEnsured) {
    await col.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 60 * 30 }).catch(() => {})
    await col.createIndex({ chatId: 1 }, { unique: true }).catch(() => {})
    indexesEnsured = true
  }
  return col
}

export async function getFlow(chatId: number): Promise<Flow | null> {
  const col = await getFlowsCollection()
  const doc = await col.findOne({ chatId })
  return doc?.flow ?? null
}

export async function setFlow(chatId: number, flow: Flow): Promise<void> {
  const col = await getFlowsCollection()
  await col.updateOne(
    { chatId },
    { $set: { chatId, flow, updatedAt: new Date() } },
    { upsert: true },
  )
}

export async function clearFlow(chatId: number): Promise<void> {
  const col = await getFlowsCollection()
  await col.deleteOne({ chatId })
}
