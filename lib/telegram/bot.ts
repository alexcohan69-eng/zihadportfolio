/**
 * The bot instance and its command handlers.
 *
 * Only skeleton commands live here for now (`/start`, `/help`). Auth and
 * admin-management commands are intentionally left out — they'll be added
 * once the admin-linking flow is designed.
 *
 * The instance is cached on `globalThis`, same pattern as `lib/db.ts`'s
 * Mongo client — this keeps a single `Bot` across Next.js dev hot-reloads
 * and across warm serverless invocations in the same container.
 */
import { Bot } from 'grammy'
import { getTelegramConfig } from './config'

declare global {
  // eslint-disable-next-line no-var
  var _telegramBot: Bot | undefined
}

function createBot(): Bot {
  const { TELEGRAM_BOT_TOKEN } = getTelegramConfig()
  const bot = new Bot(TELEGRAM_BOT_TOKEN)

  bot.command('start', async (ctx) => {
    await ctx.reply('Welcome! This is the admin bot for the site.\n\nPlease use /login to authenticate.')
  })

  bot.command('help', async (ctx) => {
    await ctx.reply('Welcome! This is the admin bot for the site.\n\nPlease use /login to authenticate.')
  })

  bot.catch((err) => {
    console.error('[telegram-bot] Unhandled error while processing an update:', err.error)
  })

  return bot
}

/** Returns the shared bot instance, creating it on first call. */
export function getBot(): Bot {
  if (!globalThis._telegramBot) {
    globalThis._telegramBot = createBot()
  }
  return globalThis._telegramBot
}
