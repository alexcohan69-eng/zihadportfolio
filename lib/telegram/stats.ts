/**
 * Read-only admin insight commands: /stats and /orders.
 *
 * Both commands only read data — through the same reader functions the
 * admin panel and its API routes use (`getFeedData`, `getServicesData`,
 * `getOrdersData`, all re-exported from `lib/data-actions.ts`) — so there
 * is no mutation logic to duplicate here. Replying to a client from
 * Telegram is intentionally out of scope: `app/api/messages/route.ts`
 * bundles the reply with online-presence detection and an offline-email
 * fallback that isn't meaningful to replicate from a bot session, so
 * order replies stay on the web admin's Messages page. All commands are
 * gated by `requireAuth`.
 */
import { Bot } from 'grammy'
import { requireAuth } from './auth-middleware'
import { getFeedData, getServicesData, getOrdersData } from '@/lib/data-actions'

const ORDERS_PAGE_SIZE = 10

function formatDate(iso: string): string {
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? iso : new Date(parsed).toISOString().slice(0, 10)
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function registerStatsHandlers(bot: Bot): void {
  // ── /stats ──
  bot.command(
    'stats',
    requireAuth(async (ctx) => {
      const [{ items: posts }, { services }, { orders }] = await Promise.all([
        getFeedData({ includeDrafts: true }),
        getServicesData(),
        getOrdersData(),
      ])

      const published = posts.filter((p) => (p.status ?? 'published') === 'published').length
      const drafts = posts.filter((p) => p.status === 'draft').length
      const activeServices = services.filter((s) => s.isActive).length

      const lines = [
        'Site stats:',
        '',
        `Posts: ${posts.length} total (${published} published, ${drafts} draft)`,
        `Services: ${services.length} total (${activeServices} active)`,
        `Orders: ${orders.length} total`,
      ]
      await ctx.reply(lines.join('\n'))
    }),
  )

  // ── /orders (view-only) ──
  bot.command(
    'orders',
    requireAuth(async (ctx) => {
      const { orders } = await getOrdersData()
      if (orders.length === 0) {
        await ctx.reply('No orders yet.')
        return
      }

      const slice = orders.slice(0, ORDERS_PAGE_SIZE)
      const lines = [
        `Recent orders (${Math.min(slice.length, orders.length)} of ${orders.length}):`,
        '',
        ...slice.map(
          (o) =>
            `ID: ${o.id} | ${o.serviceTitle} | ${o.name} <${o.email}> | ${formatDate(o.submittedAt)}\n  ${truncate(o.details, 120)}`,
        ),
        '',
        'Reply to clients from the admin dashboard\u2019s Messages page.',
      ]
      await ctx.reply(lines.join('\n'))
    }),
  )
}
