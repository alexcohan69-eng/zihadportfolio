/**
 * Guard for admin-only bot commands. Every admin command — post, settings,
 * and service management (`posts.ts`, `settings.ts`, `services.ts`), plus
 * the read-only `/stats`/`/orders` (`stats.ts`) — wraps its handler with
 * this, e.g. `bot.command('deletepost', requireAuth(handler))`.
 *
 * Because literally every admin-gated command and callback query passes
 * through here, this is also the single place that logs invocations and
 * catches handler errors — rather than repeating try/catch and logging in
 * every one of the ~30 call sites across those modules.
 */
import type { Context } from 'grammy'
import { isTelegramAuthenticated } from './session-store'
import { GENERIC_ERROR_MESSAGE, logCommand, logError } from './logger'

/** Best-effort label for what was invoked, for logging only — never shown to the user. */
function describeAction(ctx: Context): string {
  if (ctx.callbackQuery?.data) return ctx.callbackQuery.data
  const text = ctx.message?.text
  if (text?.startsWith('/')) return text.split(/\s+/)[0]
  return ctx.update?.update_id ? `update:${ctx.update.update_id}` : 'unknown'
}

/**
 * Wraps a command/callback-query handler so it only runs for chats with a
 * valid, non-expired session, and so its invocation and outcome are
 * always logged. Unauthenticated chats get "Please /login first." and the
 * wrapped handler never executes. If the handler throws, the error (with
 * stack trace) is logged server-side only, and the chat gets a generic,
 * non-leaking error message instead of an unhandled exception.
 */
export function requireAuth<C extends Context>(
  handler: (ctx: C) => Promise<void> | void,
): (ctx: C) => Promise<void> {
  return async (ctx: C) => {
    const chatId = ctx.chat?.id
    const action = describeAction(ctx)

    if (chatId === undefined || !(await isTelegramAuthenticated(chatId))) {
      logCommand(chatId, action, 'denied')
      await ctx.reply('Please /login first.')
      return
    }

    try {
      await handler(ctx)
      logCommand(chatId, action, 'success')
    } catch (err) {
      logError(action, chatId, err)
      try {
        await ctx.reply(GENERIC_ERROR_MESSAGE)
      } catch (replyErr) {
        logError(`${action}:error-reply`, chatId, replyErr)
      }
    }
  }
}
