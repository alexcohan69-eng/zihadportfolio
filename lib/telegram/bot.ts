/**
 * The bot instance and its command handlers.
 *
 * `/login`/`/logout` (via `registerAuthHandlers`) authenticate a chat
 * against the same admin credentials the web admin panel uses. `/newpost`,
 * `/posts`, `/editpost`, `/deletepost` (via `registerPostHandlers`) manage
 * feed posts using the same `lib/data-actions.ts` functions the admin
 * panel itself calls, gated behind that same session.
 *
 * The instance is cached on `globalThis`, same pattern as `lib/db.ts`'s
 * Mongo client — this keeps a single `Bot` across Next.js dev hot-reloads
 * and across warm serverless invocations in the same container.
 */
import { Bot } from 'grammy'
import { getTelegramConfig } from './config'
import { registerAuthHandlers } from './login'
import { registerPostHandlers } from './posts'

const HELP_TEXT = [
  'Available commands:',
  '',
  '/login — authenticate as admin',
  '/logout — end your admin session',
  '',
  '/newpost — create a new feed post',
  '/posts — list recent posts (edit/delete inline)',
  '/editpost <id> — edit a post by ID',
  '/deletepost <id> — delete a post by ID',
  '/cancel — abort whatever you were doing',
].join('\n')

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
    await ctx.reply(HELP_TEXT)
  })

  registerAuthHandlers(bot)
  registerPostHandlers(bot)

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
