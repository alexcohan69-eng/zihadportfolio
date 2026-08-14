/**
 * Receives updates pushed by Telegram when `TELEGRAM_BOT_MODE=webhook`.
 *
 * This route only matters in webhook mode — in local dev (`polling`, the
 * default) the bot fetches updates itself and never hits this endpoint.
 * Register this URL with Telegram (e.g. via the Bot API's `setWebhook`,
 * pointed at `TELEGRAM_WEBHOOK_URL`) once per deployment.
 */
import { webhookCallback } from 'grammy'
import { getBot } from '@/lib/telegram/bot'
import { getTelegramConfig, isTelegramConfigured } from '@/lib/telegram/config'

export async function POST(request: Request): Promise<Response> {
  if (!isTelegramConfigured()) {
    return new Response('Telegram bot is not configured.', { status: 503 })
  }

  const config = getTelegramConfig()
  if (config.TELEGRAM_BOT_MODE !== 'webhook') {
    return new Response('Bot is running in polling mode; webhook is disabled.', { status: 404 })
  }

  const handleUpdate = webhookCallback(getBot(), 'std/http', {
    secretToken: config.TELEGRAM_WEBHOOK_SECRET,
  })

  try {
    // Telegram expects a fast 2xx acknowledgement. grammy processes the
    // update and returns a non-2xx response when a handler escapes, which
    // makes Telegram retry the same update indefinitely.
    return await handleUpdate(request)
  } catch (error) {
    console.error('[telegram-webhook] Update processing failed:', error)
    return new Response('Webhook update failed.', { status: 200 })
  }
}
