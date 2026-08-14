/**
 * The `/login` and `/logout` commands.
 *
 * `/login` is a simple two-step conversation (username, then password)
 * tracked in an in-memory map keyed by chat id — cached on `globalThis`
 * so it survives Next.js dev hot-reloads, same convention as
 * `lib/telegram/bot.ts` and `lib/db.ts`. This is intentionally NOT
 * persisted anywhere: it only lives for the few seconds it takes someone
 * to type two messages, and losing it on a restart just means the user
 * retries /login — no security or durability concern.
 *
 * Credential verification reuses `verifyAdminCredentials` from
 * `lib/auth.ts` — the exact function the `/api/auth/login` HTTP route
 * uses — so there is only one place that decides what a valid admin
 * login is.
 */
import type { Bot } from 'grammy'
import { verifyAdminCredentials } from '@/lib/auth'
import { clearTelegramSession, createTelegramSession, isTelegramAuthenticated } from './session-store'

type LoginStep = 'awaiting_username' | 'awaiting_password'

interface LoginFlowState {
  step: LoginStep
  username?: string
}

declare global {
  // eslint-disable-next-line no-var
  var _telegramLoginFlows: Map<number, LoginFlowState> | undefined
  // eslint-disable-next-line no-var
  var _telegramLoginCooldowns: Map<number, number> | undefined
}

function getFlows(): Map<number, LoginFlowState> {
  if (!globalThis._telegramLoginFlows) globalThis._telegramLoginFlows = new Map()
  return globalThis._telegramLoginFlows
}

function getCooldowns(): Map<number, number> {
  if (!globalThis._telegramLoginCooldowns) globalThis._telegramLoginCooldowns = new Map()
  return globalThis._telegramLoginCooldowns
}

/** Cooldown after a failed attempt, to slow down rapid brute-force retries. */
const LOGIN_COOLDOWN_MS = 3_000

/** Registers `/login`, `/logout`, and the text handler that drives the login conversation. */
export function registerAuthHandlers(bot: Bot): void {
  const flows = getFlows()
  const cooldowns = getCooldowns()

  bot.command('login', async (ctx) => {
    if (!ctx.chat) return

    // Credentials should only ever be typed in a 1:1 DM with the bot, never
    // in a group where other members could see them.
    if (ctx.chat.type !== 'private') {
      await ctx.reply('For your security, please message me privately to log in.')
      return
    }

    const chatId = ctx.chat.id

    const cooldownUntil = cooldowns.get(chatId)
    if (cooldownUntil && cooldownUntil > Date.now()) {
      await ctx.reply('Please wait a few seconds before trying again.')
      return
    }

    if (await isTelegramAuthenticated(chatId)) {
      await ctx.reply('You are already logged in. Use /logout first if you want to switch accounts.')
      return
    }

    // Overwrites any stale in-progress flow — handles rapid repeated
    // /login presses gracefully instead of erroring or getting stuck.
    flows.set(chatId, { step: 'awaiting_username' })
    await ctx.reply('Enter your admin username:')
  })

  bot.command('logout', async (ctx) => {
    if (!ctx.chat) return
    const chatId = ctx.chat.id
    flows.delete(chatId)
    await clearTelegramSession(chatId)
    await ctx.reply('Logged out successfully.')
  })

  // Only fires for text messages that no earlier command handler consumed,
  // so it never intercepts /login, /logout, /start, or /help themselves.
  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next()

    const chatId = ctx.chat.id
    const state = flows.get(chatId)
    // No login flow in progress for this chat — yield to the next
    // registered handler (e.g. the post-management conversation flows)
    // instead of swallowing the message.
    if (!state) return next()

    if (state.step === 'awaiting_username') {
      const username = ctx.message.text.trim()
      if (!username) {
        await ctx.reply('Enter your admin username:')
        return
      }
      flows.set(chatId, { step: 'awaiting_password', username })
      await ctx.reply('Enter your admin password:')
      return
    }

    // state.step === 'awaiting_password'
    const password = ctx.message.text
    const username = state.username ?? ''
    flows.delete(chatId)

    // Best-effort: scrub the password out of the chat history immediately.
    // Bots are permitted to delete incoming messages in private chats.
    try {
      await ctx.deleteMessage()
    } catch (err) {
      console.warn('[telegram-bot] Could not auto-delete password message:', err)
    }

    if (!verifyAdminCredentials(username, password)) {
      // Generic log only — never the username or password.
      console.log(`[telegram-bot] Failed login attempt for chat ID ${chatId}`)
      cooldowns.set(chatId, Date.now() + LOGIN_COOLDOWN_MS)
      await ctx.reply('Invalid username or password.')
      return
    }

    cooldowns.delete(chatId)
    await createTelegramSession(chatId)
    console.log(`[telegram-bot] Chat ID ${chatId} authenticated successfully.`)
    await ctx.reply('Login successful. You can now use admin commands. Type /help to see available commands.')
  })
}
