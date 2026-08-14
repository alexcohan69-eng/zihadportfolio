import { Bot, InlineKeyboard } from 'grammy'
import { requireAuth } from './auth-middleware'
import { readPortfolioData } from '@/lib/data'
import { deletePortfolioProject, updatePortfolioProject } from '@/lib/data-actions'

export function registerPortfolioHandlers(bot: Bot): void {
  bot.command('portfolio', requireAuth(async (ctx) => {
    const { projects } = await readPortfolioData()
    if (!projects.length) { await ctx.reply('No portfolio projects found.'); return }
    const keyboard = new InlineKeyboard()
    for (const project of projects.slice(0, 15)) {
      keyboard.text(`Feature ${project.id.slice(-6)}`, `portfolio:feature:${project.id}`).text(`Delete ${project.id.slice(-6)}`, `portfolio:delete:${project.id}`).row()
    }
    await ctx.reply(['Portfolio projects:', '', ...projects.slice(0, 15).map((p) => `${p.title} — ${p.category} — ${p.featured ? 'featured' : 'standard'}\nID: ${p.id}`)].join('\n'), { reply_markup: keyboard })
  }))

  bot.callbackQuery(/^portfolio:feature:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const { projects } = await readPortfolioData()
    const project = projects.find((p) => p.id === ctx.match[1])
    if (!project) { await ctx.editMessageText('Project not found.'); return }
    const result = await updatePortfolioProject(project.id, { featured: !project.featured })
    await ctx.editMessageText(result.success ? `${project.title} is now ${!project.featured ? 'featured' : 'standard'}.` : `Could not update project: ${result.error ?? 'unknown error'}.`)
  }))

  bot.callbackQuery(/^portfolio:delete:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Delete this portfolio project?', { reply_markup: new InlineKeyboard().text('Yes, delete', `portfolio:confirm-delete:${ctx.match[1]}`).text('Cancel', 'portfolio:cancel') })
  }))

  bot.callbackQuery(/^portfolio:confirm-delete:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const result = await deletePortfolioProject(ctx.match[1])
    await ctx.editMessageText(result.success ? 'Portfolio project deleted.' : `Could not delete project: ${result.error ?? 'unknown error'}.`)
  }))

  bot.callbackQuery('portfolio:cancel', async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText('Delete cancelled.') })
}
