/**
 * Env validation for the Telegram bot. Mirrors the deferred-validation
 * pattern used by `lib/db.ts` — importing this module (or the bot module)
 * never throws just because `TELEGRAM_BOT_TOKEN` is unset; the error only
 * surfaces when something actually tries to start the bot.
 */
import { z } from 'zod'

const telegramConfigSchema = z.object({
  /** Token issued by @BotFather. Required to start the bot in any mode. */
  TELEGRAM_BOT_TOKEN: z.string().trim().min(1, 'TELEGRAM_BOT_TOKEN is required.'),
  /**
   * `polling` (default, for local dev — the bot process asks Telegram for
   * updates) or `webhook` (for deployed environments — Telegram pushes
   * updates to `TELEGRAM_WEBHOOK_URL`).
   */
  TELEGRAM_BOT_MODE: z.enum(['polling', 'webhook']).default('polling'),
  /** Public HTTPS URL Telegram should POST updates to. Required in webhook mode. */
  TELEGRAM_WEBHOOK_URL: z.string().trim().url().optional(),
  /**
   * Optional shared secret Telegram echoes back in the
   * `X-Telegram-Bot-Api-Secret-Token` header, used to reject forged webhook
   * requests. Recommended (not required) in webhook mode.
   */
  TELEGRAM_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
})

export type TelegramConfig = z.infer<typeof telegramConfigSchema>

let cachedConfig: TelegramConfig | undefined

/**
 * Parses and validates the Telegram env vars on first use, then caches the
 * result. Throws a descriptive error if `TELEGRAM_BOT_TOKEN` is missing/blank
 * or if webhook mode is selected without `TELEGRAM_WEBHOOK_URL`.
 */
export function getTelegramConfig(): TelegramConfig {
  if (cachedConfig) return cachedConfig

  const parsed = telegramConfigSchema.safeParse({
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_MODE: process.env.TELEGRAM_BOT_MODE || undefined,
    TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL || undefined,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || undefined,
  })

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join(' ')
    throw new Error(`Invalid Telegram bot configuration: ${message}`)
  }

  if (parsed.data.TELEGRAM_BOT_MODE === 'webhook' && !parsed.data.TELEGRAM_WEBHOOK_URL) {
    throw new Error(
      'TELEGRAM_WEBHOOK_URL is required when TELEGRAM_BOT_MODE="webhook".'
    )
  }

  cachedConfig = parsed.data
  return cachedConfig
}

/** Non-throwing check for call sites that just want to know if the bot can start. */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim())
}
