/**
 * Structured logging for all Telegram bot activity.
 *
 * IMPORTANT: never pass raw command text, passwords, or other user-entered
 * secrets into `details` — only pass IDs, counts, booleans, or error
 * messages. Login attempts are logged as success/failure only.
 */
type Level = 'info' | 'warn' | 'error'

export function telegramLog(
  level: Level,
  action: string,
  chatId: number | undefined,
  message: string,
  details?: Record<string, unknown>,
) {
  const payload = {
    scope: 'telegram-bot',
    action,
    chatId,
    message,
    ...(details ?? {}),
    timestamp: new Date().toISOString(),
  }

  const line = `[telegram] ${JSON.stringify(payload)}`
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}
