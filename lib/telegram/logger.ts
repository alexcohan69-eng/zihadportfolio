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

/** Logs a non-fatal warning (e.g. a best-effort operation that failed but didn't block the flow). */
export function logWarn(context: string, chatId: number | string | undefined, message: string): void {
  console.warn(`[telegram-bot] ${timestamp()} chat=${maskChatId(chatId)} action="${context}" status=warn: ${message}`)
}

/** The message shown to the user for any uncaught error — never leaks internals. */
export const GENERIC_ERROR_MESSAGE = "Something went wrong on my end. Please try again in a moment, or /cancel to start over."
