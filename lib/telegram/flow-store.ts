import { randomUUID } from 'node:crypto'

export type TelegramFlow = {
  id: string
  chatId: number
  resource: string
  action: string
  step: string
  data: Record<string, unknown>
  updatedAt: number
}

const TTL_MS = 15 * 60 * 1000

declare global {
  var _telegramFlowStore: Map<number, TelegramFlow> | undefined
}

function store() {
  return globalThis._telegramFlowStore ??= new Map<number, TelegramFlow>()
}

export function setFlow(chatId: number, input: Omit<TelegramFlow, 'id' | 'chatId' | 'updatedAt'>) {
  const flow: TelegramFlow = { ...input, id: randomUUID(), chatId, updatedAt: Date.now() }
  store().set(chatId, flow)
  return flow
}

export function getFlow(chatId: number): TelegramFlow | undefined {
  const flow = store().get(chatId)
  if (!flow) return undefined
  if (Date.now() - flow.updatedAt > TTL_MS) {
    store().delete(chatId)
    return undefined
  }
  return flow
}

export function updateFlow(chatId: number, patch: Partial<Pick<TelegramFlow, 'step' | 'data'>>) {
  const current = getFlow(chatId)
  if (!current) return undefined
  const next = { ...current, ...patch, data: { ...current.data, ...(patch.data ?? {}) }, updatedAt: Date.now() }
  store().set(chatId, next)
  return next
}

export function clearFlow(chatId: number) {
  return store().delete(chatId)
}

export function clearAllFlows(chatId: number) {
  return clearFlow(chatId)
}

export function hasFlow(chatId: number) {
  return Boolean(getFlow(chatId))
}
