/**
 * scripts/telegram-webhook.ts
 *
 * Small CLI to register, inspect, or remove the Telegram bot's webhook,
 * so deploying doesn't require hand-copying a `curl` command from the
 * docs. Talks directly to the Bot API (no grammy dependency needed here)
 * using the same env vars `lib/telegram/config.ts` validates at runtime.
 *
 * Usage:
 *   npm run telegram:webhook:set     # registers TELEGRAM_WEBHOOK_URL
 *   npm run telegram:webhook:info    # shows Telegram's current webhook state
 *   npm run telegram:webhook:delete  # unregisters the webhook (e.g. to switch back to polling)
 */

const command = process.argv[2]

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('[telegram-webhook] Missing TELEGRAM_BOT_TOKEN. Set it in your environment before running this script.')
  process.exit(1)
}

const API_BASE = `https://api.telegram.org/bot${token}`

async function callTelegram(method: string, params?: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(`${API_BASE}/${method}`)
  if (params) for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  const res = await fetch(url, { method: 'POST' })
  const body = await res.json()
  if (!body.ok) {
    throw new Error(`Telegram API error on ${method}: ${body.description ?? res.statusText}`)
  }
  return body.result
}

async function setWebhook(): Promise<void> {
  const url = process.env.TELEGRAM_WEBHOOK_URL
  if (!url) {
    console.error('[telegram-webhook] Missing TELEGRAM_WEBHOOK_URL. Set it to your public HTTPS webhook endpoint, e.g. https://yourdomain.com/api/telegram/webhook')
    process.exit(1)
  }
  if (!url.startsWith('https://')) {
    console.error('[telegram-webhook] TELEGRAM_WEBHOOK_URL must be HTTPS — Telegram refuses to deliver webhooks over plain HTTP.')
    process.exit(1)
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[telegram-webhook] WARNING: TELEGRAM_WEBHOOK_SECRET is not set. Anyone who discovers this URL could POST forged updates to it. Strongly recommended for production.')
  }

  await callTelegram('setWebhook', { url, ...(secret ? { secret_token: secret } : {}) })
  console.log(`[telegram-webhook] Registered: ${url}`)
  await printInfo()
}

async function deleteWebhook(): Promise<void> {
  await callTelegram('deleteWebhook')
  console.log('[telegram-webhook] Webhook removed. The bot will not receive updates until you set a webhook again or switch TELEGRAM_BOT_MODE to "polling".')
}

async function printInfo(): Promise<void> {
  const info = await callTelegram('getWebhookInfo')
  console.log('[telegram-webhook] Current state:')
  console.log(JSON.stringify(info, null, 2))

  if (info.last_error_message) {
    console.warn(`[telegram-webhook] WARNING: Telegram reported a delivery error: "${info.last_error_message}" (at ${new Date((info.last_error_date as number) * 1000).toISOString()})`)
  }
  if (!info.url) {
    console.warn('[telegram-webhook] No webhook is currently registered.')
  }
}

async function main(): Promise<void> {
  switch (command) {
    case 'set':
      return setWebhook()
    case 'delete':
      return deleteWebhook()
    case 'info':
      return printInfo()
    default:
      console.error(`[telegram-webhook] Unknown or missing command: "${command ?? ''}"\nUsage: tsx scripts/telegram-webhook.ts <set|info|delete>`)
      process.exit(1)
  }
}

main().catch((err) => {
  console.error('[telegram-webhook] Fatal error:', err instanceof Error ? err.message : err)
  process.exit(1)
})
