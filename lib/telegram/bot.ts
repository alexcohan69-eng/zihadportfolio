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
import { Bot, GrammyError, HttpError } from 'grammy'
import { getTelegramConfig } from './config'
import { registerAuthHandlers } from './login'
import { registerPostHandlers, clearPostFlow } from './posts'
import { registerSettingsHandlers, clearSettingsFlow } from './settings'
import { registerServiceHandlers, clearServiceFlow } from './services'
import { registerStatsHandlers } from './stats'
import { GENERIC_ERROR_MESSAGE, logError } from './logger'

const HELP_TEXT = [
  'Available commands:',
  '',
  'First time here? Send /login and enter your admin username, then password (in this private chat only) to unlock everything below.',
  '',
  'Account',
  '/login — authenticate as admin',
  '/logout — end your admin session',
  '/cancel — abort whatever you were doing, from any step',
  '',
  'Posts',
  '/newpost — create a new feed post (title → content → media? → publish/draft → confirm)',
  '/posts — list recent posts, with inline Edit/Delete buttons',
  '/editpost <id> — jump straight to editing one post, e.g. /editpost 65f1a2',
  '/deletepost <id> — delete one post by ID, with a confirm step',
  '',
  'Settings',
  '/sitesettings — view all site settings, grouped, with inline Edit buttons',
  '/updatesetting — same as /sitesettings, jumps straight to editing',
  '',
  'Services',
  '/newservice — add a new service (title → description → price → delivery → features → confirm)',
  '/services — list services, with inline Edit/Activate/Deactivate/Delete buttons',
  '/editservice <id> — jump straight to editing one service by ID',
  '/deleteservice <id> — delete one service by ID, with a confirm step',
  '',
  'Other',
  '/stats — post, service & order counts',
  '/orders — view recent order requests (read-only — reply to clients from the web admin\u2019s Messages page)',
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

  // Last-resort net for anything that escapes every handler above (e.g. a
  // throw during grammy's own update routing, before `requireAuth` or
  // `registerAuthHandlers`'s handlers get a chance to catch it). Most
  // command/callback errors are already caught and logged inside
  // `requireAuth` — this exists for the remainder, plus Telegram-API-level
  // failures (rate limits, timeouts) that `GrammyError`/`HttpError`
  // distinguish from programming errors.
  bot.catch((err) => {
    const chatId = err.ctx.chat?.id
    const action = err.ctx.callbackQuery?.data ?? err.ctx.message?.text ?? 'unknown'

    if (err.error instanceof GrammyError) {
      logError(`${action}:telegram-api-error(${err.error.error_code})`, chatId, err.error)
    } else if (err.error instanceof HttpError) {
      logError(`${action}:network-timeout`, chatId, err.error)
    } else {
      logError(action, chatId, err.error)
    }

    err.ctx.reply(GENERIC_ERROR_MESSAGE).catch(() => {
      // Nothing more we can do if even the fallback reply fails (e.g. the
      // user blocked the bot) — already logged above.
    })
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
