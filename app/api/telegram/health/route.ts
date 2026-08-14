/**
 * Lightweight health check for the Telegram bot integration.
 *
 * Intentionally does NOT call the Telegram Bot API on every request (that
 * would add latency and count against Telegram's rate limits every time a
 * monitor polls this) — it only reports the bot's own local state:
 * whether it's configured, which mode it's running in, and whether
 * `startTelegramBot()` has completed. Use `getWebhookInfo` (documented in
 * `docs/telegram-bot.md`) to verify Telegram's side of a webhook
 * registration instead.
 *
 * Deliberately returns 200 even when the bot is unconfigured/not ready —
 * an unconfigured bot is a valid, intentional state for this app (the rest
 * of the site works fine without it) and shouldn't fail an uptime monitor
 * that's checking "is this deployment alive," which is a different
 * question than "is the bot ready."
 */
import { NextResponse } from 'next/server'
import { isTelegramConfigured, getTelegramConfig } from '@/lib/telegram/config'
import { isTelegramBotReady, getTelegramBotUsername } from '@/lib/telegram/start'

export async function GET() {
  const configured = isTelegramConfigured()

  if (!configured) {
    return NextResponse.json({ status: 'unconfigured', configured, ready: false })
  }

  try {
    const config = getTelegramConfig()
    return NextResponse.json({
      status: isTelegramBotReady() ? 'ok' : 'starting',
      configured: true,
      ready: isTelegramBotReady(),
      mode: config.TELEGRAM_BOT_MODE,
      botUsername: getTelegramBotUsername(),
    })
  } catch (err) {
    // Config is present but invalid (e.g. webhook mode without a URL) —
    // still 200 with the detail in the body, not a 500, since the site
    // itself is healthy even if the bot config needs fixing.
    return NextResponse.json({
      status: 'misconfigured',
      configured: true,
      ready: false,
      error: err instanceof Error ? err.message : 'Invalid Telegram bot configuration.',
    })
  }
}
