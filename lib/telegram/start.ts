/**
 * Startup/shutdown orchestration for the Telegram bot.
 *
 * - `TELEGRAM_BOT_MODE=polling` (default, local dev): the process calls
 *   `bot.start()`, which long-polls Telegram for updates. Only one process
 *   may poll a given bot token at a time.
 * - `TELEGRAM_BOT_MODE=webhook` (deployed): polling is never started here.
 *   Instead, register `TELEGRAM_WEBHOOK_URL` with Telegram once (see
 *   `registerWebhook`) and let `app/api/telegram/webhook/route.ts` receive
 *   updates.
 */
import { getBot } from './bot'
import { getTelegramConfig, isTelegramConfigured } from './config'

let started = false
let shutdownHandlersRegistered = false

/**
 * Starts the bot according to `TELEGRAM_BOT_MODE`. Safe to call multiple
 * times — subsequent calls are no-ops. Safe to call when
 * `TELEGRAM_BOT_TOKEN` is unset — it just logs and skips instead of
 * crashing the host process (dev server, `next build`, etc.).
 */
export async function startTelegramBot(): Promise<void> {
  if (started) return

  if (!isTelegramConfigured()) {
    console.log('[telegram-bot] TELEGRAM_BOT_TOKEN not set — skipping startup.')
    return
  }

  const config = getTelegramConfig()
  const bot = getBot()

  registerShutdownHandlers()

  if (config.TELEGRAM_BOT_MODE === 'webhook') {
    // Nothing to start here — Telegram pushes updates to the webhook route.
    // `bot.init()` warms up `bot.botInfo` so the webhook handler doesn't
    // pay that round trip on the first incoming update.
    await bot.init()
    started = true
    console.log(
      `[telegram-bot] Running in webhook mode as @${bot.botInfo.username}. ` +
        `Make sure the webhook is registered for ${config.TELEGRAM_WEBHOOK_URL}.`
    )
    return
  }

  started = true

  // `bot.start()` resolves once polling stops, so it's intentionally not
  // awaited here — callers just want startup kicked off.
  bot
    .start({
      onStart: (botInfo) => {
        console.log(`[telegram-bot] Running in long-polling mode as @${botInfo.username}.`)
      },
    })
    .catch((err) => {
      started = false
      console.error('[telegram-bot] Polling stopped due to an error:', err)
    })
}

/** Stops long polling (no-op in webhook mode, since nothing is polling). */
export async function stopTelegramBot(): Promise<void> {
  if (!started) return
  const config = getTelegramConfig()
  if (config.TELEGRAM_BOT_MODE === 'polling') {
    await getBot().stop()
    console.log('[telegram-bot] Polling stopped.')
  }
  started = false
}

function registerShutdownHandlers(): void {
  if (shutdownHandlersRegistered) return
  shutdownHandlersRegistered = true

  const shutdown = (signal: string) => {
    console.log(`[telegram-bot] Received ${signal}, shutting down gracefully...`)
    stopTelegramBot()
      .catch((err) => console.error('[telegram-bot] Error during shutdown:', err))
      .finally(() => process.exit(0))
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}
