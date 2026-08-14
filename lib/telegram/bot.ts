/**
 * The bot instance and its command handlers.
 *
 * `/login`/`/logout` (via `registerAuthHandlers`) authenticate a chat
 * against the same admin credentials the web admin panel uses.
 * `/newpost`/`/posts`/`/editpost`/`/deletepost` (via `registerPostHandlers`),
 * `/sitesettings`/`/updatesetting` (via `registerSettingsHandlers`), and
 * `/newservice`/`/services`/`/editservice`/`/deleteservice` (via
 * `registerServiceHandlers`) all manage their respective data using the
 * same `lib/data-actions.ts` functions the admin panel itself calls,
 * gated behind that same session. `/stats`/`/orders` (via
 * `registerStatsHandlers`) are read-only insight commands built on the
 * same reader functions.
 *
 * `/cancel` is centralized here rather than owned by any one flow module,
 * since a chat can only ever be mid-flow in one of `posts.ts`,
 * `settings.ts`, or `services.ts` at a time — each module exposes a
 * `clear*Flow(chatId)` helper and this handler tries them in turn.
 *
 * The instance is cached on `globalThis`, same pattern as `lib/db.ts`'s
 * Mongo client — this keeps a single `Bot` across Next.js dev hot-reloads
 * and across warm serverless invocations in the same container.
 */
import { Bot } from 'grammy'
import { getTelegramConfig } from './config'
import { registerAuthHandlers } from './login'
import { registerPostHandlers, clearPostFlow } from './posts'
import { registerSettingsHandlers, clearSettingsFlow } from './settings'
import { registerServiceHandlers, clearServiceFlow } from './services'
import { registerStatsHandlers } from './stats'

const HELP_TEXT = [
  'Available commands:',
  '',
  'Account',
  '/login — authenticate as admin',
  '/logout — end your admin session',
  '/cancel — abort whatever you were doing',
  '',
  'Posts',
  '/newpost — create a new feed post',
  '/posts — list recent posts (edit/delete inline)',
  '/editpost <id> — edit a post by ID',
  '/deletepost <id> — delete a post by ID',
  '',
  'Settings',
  '/sitesettings — view site settings (edit inline)',
  '/updatesetting — jump straight to editing a setting',
  '',
  'Services',
  '/newservice — add a new service',
  '/services — list services (edit/delete/toggle inline)',
  '/editservice <id> — edit a service by ID',
  '/deleteservice <id> — delete a service by ID',
  '',
  'Other',
  '/stats — post, service & order counts',
  '/orders — view recent order requests (read-only)',
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

  bot.command('cancel', async (ctx) => {
    if (!ctx.chat) return
    const cleared = clearPostFlow(ctx.chat.id) || clearSettingsFlow(ctx.chat.id) || clearServiceFlow(ctx.chat.id)
    await ctx.reply(cleared ? 'Cancelled.' : 'Nothing to cancel.')
  })

  registerAuthHandlers(bot)
  registerPostHandlers(bot)
  registerSettingsHandlers(bot)
  registerServiceHandlers(bot)
  registerStatsHandlers(bot)

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
