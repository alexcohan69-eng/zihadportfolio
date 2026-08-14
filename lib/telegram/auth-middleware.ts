/**
 * Guard for admin-only bot commands. No admin commands exist yet (that's
 * intentionally out of scope here) — this wrapper is the piece future
 * commands will use, e.g. `bot.command('deletepost', requireAuth(handler))`.
 */
import type { Context } from 'grammy'
import { isTelegramAuthenticated } from './session-store'

/**
 * Wraps a command handler so it only runs for chats with a valid,
 * non-expired session. Unauthenticated chats get "Please /login first."
 * and the wrapped handler never executes.
 */
export function requireAuth<C extends Context>(
  handler: (ctx: C) => Promise<void> | void,
): (ctx: C) => Promise<void> {
  return async (ctx: C) => {
    const chatId = ctx.chat?.id
    if (chatId === undefined || !(await isTelegramAuthenticated(chatId))) {
      await ctx.reply('Please /login first.')
      return
    }
    await handler(ctx)
  }
}
