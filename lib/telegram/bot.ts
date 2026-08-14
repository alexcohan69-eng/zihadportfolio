/**
 * The bot instance and its command handlers.
 *
 * `/start` and `/help` are plain skeleton replies. `/login` and `/logout`
 * (registered via `registerAuthHandlers`) authenticate a chat against the
 * same admin credentials the web admin panel uses. Admin-management
 * commands themselves are intentionally not implemented yet.
 *
 * The instance is cached on `globalThis`, same pattern as `lib/db.ts`'s
 * Mongo client — this keeps a single `Bot` across Next.js dev hot-reloads
 * and across warm serverless invocations in the same container.
 */
import { Bot } from 'grammy'
import { getTelegramConfig } from './config'
import { registerAuthHandlers } from './login'

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

  registerAuthHandlers(bot)

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
