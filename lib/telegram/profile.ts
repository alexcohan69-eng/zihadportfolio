import { Bot, InlineKeyboard, type Context } from 'grammy'
import { requireAuth } from './auth-middleware'
import { extractIncomingFile, downloadAndUploadTelegramFile } from './media'
import { readSettingsData } from '@/lib/data'
import { updateSettings } from '@/lib/data-actions'
import { GENERIC_ERROR_MESSAGE, logError } from './logger'

type MediaField = 'profileMedia' | 'coverMedia' | 'feedAuthorMedia'
const MEDIA_LABELS: Record<MediaField, string> = {
  profileMedia: 'Profile photo',
  coverMedia: 'Cover media',
  feedAuthorMedia: 'Feed author media',
}

type Flow = { field: MediaField; action: 'upload' | 'delete' }
declare global { var _telegramProfileFlows: Map<number, Flow> | undefined }
function flows() { return globalThis._telegramProfileFlows ??= new Map() }
export function clearProfileFlow(chatId: number) { return flows().delete(chatId) }

function menu(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Replace profile photo', 'profile:upload:profileMedia').row()
    .text('Replace cover media', 'profile:upload:coverMedia').row()
    .text('Replace feed author media', 'profile:upload:feedAuthorMedia').row()
    .text('Delete profile photo', 'profile:delete:profileMedia').row()
    .text('Delete cover media', 'profile:delete:coverMedia').row()
    .text('Delete feed author media', 'profile:delete:feedAuthorMedia')
}

export async function renderProfileScreen(ctx: Context) {
  await render(ctx, Boolean(ctx.callbackQuery))
}

async function render(ctx: Context, edit = false) {
  const settings = await readSettingsData()
  const hero = settings.hero
  const text = [
    'Profile media',
    '',
    `Profile photo: ${hero.profileMedia ? 'set' : 'not set'}`,
    `Cover media: ${hero.coverMedia ? 'set' : 'not set'}`,
    `Feed author media: ${hero.feedAuthorMedia ? 'set' : 'not set'}`,
    '',
    'Choose an action. You can send a photo, video, or image/video file. Uploads replace the current asset safely.',
  ].join('\n')
  if (edit) await ctx.editMessageText(text, { reply_markup: menu() })
  else await ctx.reply(text, { reply_markup: menu() })
}

export function registerProfileHandlers(bot: Bot): void {
  const guarded = requireAuth(async (ctx) => render(ctx))
  bot.command('profile', guarded)
  bot.command('media', guarded)

  bot.callbackQuery(/^profile:(upload|delete):(profileMedia|coverMedia|feedAuthorMedia)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!ctx.chat) return
    const action = ctx.match[1] as Flow['action']
    const field = ctx.match[2] as MediaField
    if (action === 'delete') {
      await ctx.editMessageText(`Delete ${MEDIA_LABELS[field]}? This cannot be undone.`, {
        reply_markup: new InlineKeyboard().text('Yes, delete', `profile:confirm-delete:${field}`).text('Cancel', 'profile:back'),
      })
      return
    }
    flows().set(ctx.chat.id, { field, action })
    const current = (await readSettingsData()).hero[field]
    if (current) {
      const caption = `Current ${MEDIA_LABELS[field].toLowerCase()}\n\nThis is the asset that will be replaced. Send a new photo or video when ready.`
      try {
        if (/\.(mp4|webm|mov)(\?|$)/i.test(current)) await ctx.replyWithVideo(current, { caption })
        else await ctx.replyWithPhoto(current, { caption })
      } catch {
        await ctx.reply(`${caption}\n\nPreview could not be loaded, but the current asset is still safe.`)
      }
    }
    await ctx.editMessageText(`Replace ${MEDIA_LABELS[field].toLowerCase()}\n\nSend the replacement now. Nothing changes until the upload succeeds.\n\nSupported: photo, video, or image/video file.`, { reply_markup: new InlineKeyboard().text('Cancel', 'profile:back').text('Main menu', 'nav:home') })
  }))

  bot.callbackQuery(/^profile:confirm-delete:(profileMedia|coverMedia|feedAuthorMedia)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const field = ctx.match[1] as MediaField
    const current = await readSettingsData()
    const oldUrl = current.hero[field]
    const result = await updateSettings({ hero: { [field]: '' } } as never)
    if (!result.success) { await ctx.editMessageText(`Couldn't delete the media: ${result.error ?? 'unknown error'}.`); return }
    // Cloudinary cleanup is intentionally omitted for external URLs and is
    // best-effort after the database is already safe.
    await ctx.editMessageText(`${MEDIA_LABELS[field]} deleted.`, { reply_markup: menu() })
    if (oldUrl && oldUrl.includes('cloudinary.com')) console.info('[telegram-profile] old media cleared', field)
  }))

  bot.callbackQuery('profile:back', requireAuth(async (ctx) => { await ctx.answerCallbackQuery(); await render(ctx, true) }))

  bot.on('message', async (ctx, next) => {
    if (ctx.chat?.type !== 'private') return next()
    const state = flows().get(ctx.chat.id)
    if (!state) return next()
    if (state.action !== 'upload') return next()
    const field = state.field as MediaField
    const file = extractIncomingFile(ctx)
    if (!file) { await ctx.reply('Please send a photo, video, or image/video file (or /cancel).'); return }
    flows().delete(ctx.chat.id)
    try {
      const uploaded = await downloadAndUploadTelegramFile(file, 'profile', `hero-${field}`)
      const result = await updateSettings({ hero: { [field]: uploaded.optimizedUrl } } as never)
      if (!result.success) { await ctx.reply(`Upload succeeded but saving failed: ${result.error ?? 'unknown error'}.`); return }
      await ctx.reply(`${MEDIA_LABELS[field]} updated successfully.`, { reply_markup: menu() })
    } catch (error) {
      logError(`profile-media:${state.field}`, ctx.chat.id, error)
      await ctx.reply(GENERIC_ERROR_MESSAGE)
    }
  })
}

export function profileMenuKeyboard() { return menu() }
export const profileMediaLabels = MEDIA_LABELS
