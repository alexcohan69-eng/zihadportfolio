/**
 * Next.js instrumentation hook — `register()` runs once when the server
 * process boots (`next dev` / `next start`, and once per cold start on
 * Vercel), which makes it the right place to kick off long-lived, non-HTTP
 * work like the Telegram bot's polling loop.
 *
 * https://nextjs.org/docs/app/guides/instrumentation
 */
export async function register() {
  // Only the Node.js runtime has a real, long-lived process — the Edge
  // runtime does not, so long polling can't live there.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { startTelegramBot } = await import('./lib/telegram/start')
  await startTelegramBot()
}
