import { InlineKeyboard, type Context } from 'grammy'
import { acknowledge, screen, showScreen } from './ux'
import { requireAuth } from './auth-middleware'
import { renderPostsScreen } from './posts'
import { renderProfileScreen } from './profile'

export function backKeyboard(back = 'nav:home') {
  return new InlineKeyboard().text('Back', back).text('Main menu', 'nav:home')
}

export function cancelKeyboard(back = 'nav:home') {
  return new InlineKeyboard().text('Cancel', `nav:cancel:${back}`).text('Main menu', 'nav:home')
}

export function homeKeyboard() {
  return new InlineKeyboard()
    .text('Profile & media', 'nav:profile').text('Posts', 'nav:posts').row()
    .text('Portfolio', 'nav:portfolio').text('Services', 'nav:services').row()
    .text('Site settings', 'nav:settings').text('Orders', 'nav:orders').row()
    .text('Stats', 'nav:stats').text('Help', 'nav:help')
}

export async function renderHome(ctx: Context) {
  await showScreen(ctx, screen('Site control center', 'Manage your portfolio directly from Telegram.\n\nChoose a section to view, edit, or publish content.'), homeKeyboard())
}

export async function renderSection(ctx: Context, key: string) {
  const sections: Record<string, [string, string]> = {
    portfolio: ['Portfolio', 'Browse and manage your featured work.'],
    services: ['Services', 'Manage services, pricing, delivery, and visibility.'],
    settings: ['Site settings', 'Manage public profile text, contact details, and social links.'],
    orders: ['Orders', 'Review recent client requests and order status.'],
    stats: ['Stats', 'Review a compact overview of site activity.'],
    help: ['Help', 'Use /login once to unlock admin actions. Every edit shows the current value first, and destructive actions require confirmation.'],
  }
  const [title, body] = sections[key] ?? ['Section unavailable', 'This section is not available right now.']
  await showScreen(ctx, screen(title, body), backKeyboard())
}

export function registerNavigation(bot: { callbackQuery: (query: string | RegExp, handler: (ctx: Context) => Promise<void>) => unknown }) {
  bot.callbackQuery('nav:home', requireAuth(async (ctx) => { await acknowledge(ctx); await renderHome(ctx) }))
  bot.callbackQuery('nav:profile', requireAuth(async (ctx) => { await acknowledge(ctx); await renderProfileScreen(ctx) }))
  bot.callbackQuery('nav:posts', requireAuth(async (ctx) => { await acknowledge(ctx); await renderPostsScreen(ctx, 0) }))
  for (const key of ['portfolio', 'services', 'settings', 'orders', 'stats', 'help']) {
    bot.callbackQuery(`nav:${key}`, requireAuth(async (ctx) => { await acknowledge(ctx); await renderSection(ctx, key) }))
  }
  bot.callbackQuery(/^nav:cancel:(.*)$/, requireAuth(async (ctx) => { await acknowledge(ctx); await renderHome(ctx) }))
}
