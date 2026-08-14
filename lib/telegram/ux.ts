import { InlineKeyboard, type Context } from 'grammy'

export const UX = {
  brand: 'ZIHAD / SITE CONTROL',
  divider: '━━━━━━━━━━━━━━━━━━',
}

export function menuKeyboard() {
  return new InlineKeyboard()
    .text('Profile & media', 'screen:profile').text('Posts', 'screen:posts').row()
    .text('Portfolio', 'screen:portfolio').text('Services', 'screen:services').row()
    .text('Site settings', 'screen:settings').text('Orders', 'screen:orders').row()
    .text('Stats', 'screen:stats').text('Help', 'screen:help')
}

export function screenKeyboard(back = 'screen:menu') {
  return new InlineKeyboard().text('Back', back).text('Main menu', 'screen:menu')
}

export function actionKeyboard(actions: Array<{ label: string; data: string }>, back = 'screen:menu') {
  const keyboard = new InlineKeyboard()
  actions.forEach((action, index) => {
    keyboard.text(action.label, action.data)
    if (index % 2 === 1) keyboard.row()
  })
  if (actions.length % 2 === 1) keyboard.row()
  keyboard.text('Back', back).text('Main menu', 'screen:menu')
  return keyboard
}

export function screen(title: string, body: string, hint?: string) {
  return [`${UX.brand}`, UX.divider, title, '', body, hint ? `\n${UX.divider}\nNext: ${hint}` : ''].filter(Boolean).join('\n')
}

export function flowHeader(title: string, step: number, total: number, instruction: string) {
  return screen(title, `Step ${step} of ${total}\n\n${instruction}`)
}

export async function acknowledge(ctx: Context) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => undefined)
}

export async function showScreen(ctx: Context, text: string, replyMarkup?: InlineKeyboard) {
  if (ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(text, replyMarkup ? { reply_markup: replyMarkup } : undefined)
      return
    } catch {
      // The message may be unchanged or too old to edit; fall back to a new screen.
    }
  }
  await ctx.reply(text, replyMarkup ? { reply_markup: replyMarkup } : undefined)
}

export async function showError(ctx: Context, message: string, retry?: { label?: string; data: string }) {
  const keyboard = retry ? actionKeyboard([{ label: retry.label ?? 'Try again', data: retry.data }]) : screenKeyboard()
  await showScreen(ctx, screen('Something went wrong', message, retry ? 'Try again or go back' : 'Go back'), keyboard)
}
