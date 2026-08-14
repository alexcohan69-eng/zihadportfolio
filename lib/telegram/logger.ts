/**
 * Structured logging for the Telegram bot. No project-wide logger exists
 * (checked — everything else just uses `console.*` directly), so this is a
 * small, consistent wrapper around `console` rather than a new dependency.
 *
 * Every line is prefixed `[telegram-bot]`, timestamped (ISO 8601), and
 * never includes credentials or full chat IDs — only `maskChatId`'s
 * truncated form — so logs are safe to ship to any aggregator without a
 * second redaction pass.
 */

export type CommandStatus = 'success' | 'failure' | 'denied'
export type AuthStatus = 'success' | 'failure'

/** Truncates a chat id to its first 4 characters + "...", per the logging spec. */
export function maskChatId(chatId: number | string | undefined): string {
  if (chatId === undefined) return 'unknown'
  const str = String(chatId)
  return str.length <= 4 ? `${str}...` : `${str.slice(0, 4)}...`
}

function timestamp(): string {
  return new Date().toISOString()
}

/** Logs a command or callback-query invocation: who, what, when, and how it resolved. */
export function logCommand(chatId: number | string | undefined, action: string, status: CommandStatus): void {
  console.log(`[telegram-bot] ${timestamp()} chat=${maskChatId(chatId)} action="${action}" status=${status}`)
}

/** Logs a /login attempt. Never pass a username or password in here. */
export function logAuth(chatId: number | string | undefined, status: AuthStatus): void {
  console.log(`[telegram-bot] ${timestamp()} chat=${maskChatId(chatId)} action="login" status=${status}`)
}

/** Logs an unexpected error with its full stack trace server-side only — never sent to Telegram. */
export function logError(context: string, chatId: number | string | undefined, err: unknown): void {
  const error = err instanceof Error ? err : new Error(String(err))
  console.error(`[telegram-bot] ${timestamp()} chat=${maskChatId(chatId)} action="${context}" status=error:`, error.stack ?? error.message)
}

declare global {
  // eslint-disable-next-line no-var
  var _telegramLastAlertAt: number | undefined
}

/** Minimum gap between alert emails, so a burst of failures sends one email, not one per error. */
const ALERT_COOLDOWN_MS = 15 * 60 * 1000

/**
 * Best-effort email alert for errors that escaped every other handler
 * (currently only wired into `bot.ts`'s last-resort `bot.catch()`).
 * Reuses the same Resend + fixed-recipient pattern already used for
 * offline-message alerts in `app/api/messages/route.ts`, rather than
 * introducing a new notification channel. Rate-limited to at most one
 * email per `ALERT_COOLDOWN_MS` — never throws, and never includes the
 * bot token, admin credentials, or full chat ids in the email body.
 */
export async function logCritical(context: string, chatId: number | string | undefined, err: unknown): Promise<void> {
  logError(context, chatId, err)

  const key = process.env.RESEND_API_KEY
  if (!key) return // Alerting is optional — logs above are always captured regardless.

  const now = Date.now()
  if (globalThis._telegramLastAlertAt && now - globalThis._telegramLastAlertAt < ALERT_COOLDOWN_MS) return
  globalThis._telegramLastAlertAt = now

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    const error = err instanceof Error ? err : new Error(String(err))
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: ['zdimtiase@gmail.com'],
      subject: `Telegram bot error — ${context}`,
      html:
        `<p>An unhandled error reached the Telegram bot's global error handler.</p>` +
        `<p><strong>Context:</strong> ${context}<br/><strong>Chat:</strong> ${maskChatId(chatId)}<br/><strong>Time:</strong> ${timestamp()}</p>` +
        `<pre style="white-space:pre-wrap;background:#f6f6f7;padding:12px;border-radius:8px;font-size:12px">${(error.stack ?? error.message).replace(/</g, '&lt;')}</pre>` +
        `<p style="color:#888;font-size:12px">Further alerts are suppressed for ${ALERT_COOLDOWN_MS / 60_000} minutes to avoid spam — check the server logs for the full picture.</p>`,
    })
  } catch (alertErr) {
    // Alerting itself must never crash the handler it's alerting from.
    console.error('[telegram-bot] Failed to send critical-error alert email:', alertErr)
  }
}

/** Logs a non-fatal warning (e.g. a best-effort operation that failed but didn't block the flow). */
export function logWarn(context: string, chatId: number | string | undefined, message: string): void {
  console.warn(`[telegram-bot] ${timestamp()} chat=${maskChatId(chatId)} action="${context}" status=warn: ${message}`)
}

/** The message shown to the user for any uncaught error — never leaks internals. */
export const GENERIC_ERROR_MESSAGE = "Something went wrong on my end. Please try again in a moment, or /cancel to start over."
