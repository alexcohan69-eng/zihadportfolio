/**
 * Feed-post management commands: /newpost, /posts, /editpost, /deletepost.
 *
 * Every mutation reuses the exact same server actions the web admin panel
 * uses (`addFeedItem` / `updateFeedItem` / `deleteFeedItem` /
 * `getFeedData`, all from `lib/data-actions.ts`) — nothing here
 * reimplements post persistence, it only drives those functions from a
 * Telegram conversation. All commands are gated by `requireAuth` from
 * Prompt 3's auth middleware.
 *
 * Conversation state (which step of /newpost or /editpost a chat is on) is
 * tracked in an in-memory map keyed by chat id, cached on `globalThis` —
 * same convention as `lib/telegram/login.ts` — since it only needs to
 * survive the few messages it takes to complete a flow, not a server
 * restart.
 */
import { Bot, InlineKeyboard, type Context } from 'grammy'
import { requireAuth } from './auth-middleware'
import { extractIncomingFile, downloadAndUploadTelegramFile } from './media'
import { getFeedData, addFeedItem, updateFeedItem, deleteFeedItem, getCategories, addCategory } from '@/lib/data-actions'
import { readSettingsData } from '@/lib/data'
import type { FeedItem } from '@/lib/types'
import { GENERIC_ERROR_MESSAGE, logError } from './logger'
import { acknowledge, screen, showScreen } from './ux'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zihadimtiase.com').replace(/\/$/, '')
const PAGE_SIZE = 10

// ── Conversation state ───────────────────────────────────────────────────────

interface NewPostState {
  mode: 'newpost'
  step: 'title' | 'content' | 'category' | 'ask_media' | 'awaiting_media' | 'awaiting_publish' | 'confirm'
  title?: string
  content?: string
  category?: string
  mediaUrl?: string
  status?: 'draft' | 'published'
}

interface EditPostState {
  mode: 'editpost'
  step: 'choose_field' | 'awaiting_title' | 'awaiting_content' | 'awaiting_media'
  postId: string
}

type FlowState = NewPostState | EditPostState

declare global {
  // eslint-disable-next-line no-var
  var _telegramPostFlows: Map<number, FlowState> | undefined
}

function getFlows(): Map<number, FlowState> {
  if (!globalThis._telegramPostFlows) globalThis._telegramPostFlows = new Map()
  return globalThis._telegramPostFlows
}

/**
 * Clears any in-progress /newpost or /editpost flow for `chatId`.
 * Used by the shared `/cancel` command registered in `bot.ts`, since a
 * chat may be mid-flow in this module, `settings.ts`, or `services.ts` —
 * `/cancel` needs to check all of them, not just whichever module happened
 * to register its own `/cancel` handler first.
 */
export function clearPostFlow(chatId: number): boolean {
  return getFlows().delete(chatId)
}

// ── Formatting helpers ───────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? iso : new Date(parsed).toISOString().slice(0, 10)
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function postLine(item: FeedItem): string {
  return `ID: ${item.id} | ${item.title} | ${item.status ?? 'published'} | ${formatDate(item.date)}`
}

function postLink(id: string): string {
  return `${BASE_URL}/feed/${id}`
}

async function findPost(postId: string) {
  const { items } = await getFeedData({ includeDrafts: true })
  return items.find((item) => item.id === postId)
}

export async function renderPostDetail(ctx: Context, postId: string) {
  const item = await findPost(postId)
  if (!item) {
    await showScreen(ctx, screen('Post unavailable', 'This post was deleted or is no longer available.'), new InlineKeyboard().text('Back to posts', 'nav:posts').text('Main menu', 'nav:home'))
    return
  }
  const keyboard = new InlineKeyboard()
    .text('Edit', `post:edit:${item.id}`).text('Delete', `post:delete:${item.id}`).row()
    .text('Back to posts', 'nav:posts').text('Main menu', 'nav:home')
  await showScreen(ctx, screen('Post detail', summaryFor(item), 'Choose an action'), keyboard)
}

function summaryFor(item: FeedItem): string {
  const status = item.status ?? 'published'
  const lines = [
    `Title: ${item.title}`,
    `Status: ${status}`,
    `Content: ${truncate(item.content, 200)}`,
    `Media: ${item.image ? 'yes' : 'no'}`,
    `Link: ${postLink(item.id)}`,
  ]
  return lines.join('\n')
}

function fieldChoiceKeyboard(postId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('Title', `editfield:title:${postId}`)
    .text('Content', `editfield:content:${postId}`)
    .row()
    .text('Media', `editfield:media:${postId}`)
    .text('Status', `editfield:status:${postId}`)
    .row()
    .text('Cancel', `editfield:cancel:${postId}`)
}

// ── /posts listing + pagination ──────────────────────────────────────────────

export async function renderPostsScreen(ctx: Context, page: number): Promise<void> {
  const { text, keyboard } = await renderPostsPage(page)
  const { showScreen, screen } = await import('./ux')
  await showScreen(ctx, screen('Posts', text), keyboard)
}

async function renderPostsPage(page: number): Promise<{ text: string; keyboard?: InlineKeyboard }> {
  const { items } = await getFeedData({ includeDrafts: true })

  if (items.length === 0) {
    return { text: 'No posts yet. Use /newpost to create one.' }
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const clampedPage = Math.min(Math.max(page, 0), totalPages - 1)
  const slice = items.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  const keyboard = new InlineKeyboard()
  for (const item of slice) {
    const shortId = item.id.slice(-6)
    keyboard.text(`${shortId} · ${truncate(item.title, 24)}`, `post:view:${item.id}`).row()
  }
  if (totalPages > 1) {
    if (clampedPage > 0) keyboard.text('« Prev', `posts:page:${clampedPage - 1}`)
    keyboard.text(`${clampedPage + 1}/${totalPages}`, 'posts:noop')
    if (clampedPage < totalPages - 1) keyboard.text('Next »', `posts:page:${clampedPage + 1}`)
  }

  const text = [`Recent posts (page ${clampedPage + 1}/${totalPages}):`, '', ...slice.map(postLine)].join('\n')
  return { text, keyboard }
}

// ── /editpost / inline Edit button ───────────────────────────────────────────

async function startEditFlow(ctx: Context, postId: string): Promise<void> {
  const { items } = await getFeedData({ includeDrafts: true })
  const item = items.find((i) => i.id === postId)
  if (!item) {
    await showScreen(ctx, screen('Post unavailable', 'This post was deleted or is no longer available.'), new InlineKeyboard().text('Back to posts', 'nav:posts').text('Main menu', 'nav:home'))
    return
  }
  if (ctx.chat) getFlows().set(ctx.chat.id, { mode: 'editpost', step: 'choose_field', postId })
  await showScreen(ctx, screen('Edit post', `${summaryFor(item)}\n\nChoose a field. The current value will be shown again before replacement.`), fieldChoiceKeyboard(postId))
}

// ── /deletepost / inline Delete button ───────────────────────────────────────

async function startDeleteFlow(ctx: Context, postId: string): Promise<void> {
  const { items } = await getFeedData({ includeDrafts: true })
  const item = items.find((i) => i.id === postId)
  if (!item) {
    await showScreen(ctx, screen('Post unavailable', 'This post was deleted or is no longer available.'), new InlineKeyboard().text('Back to posts', 'nav:posts').text('Main menu', 'nav:home'))
    return
  }
  const keyboard = new InlineKeyboard()
    .text('Delete permanently', `delconfirm:${postId}`).row()
    .text('Keep post', `delcancel:${postId}`).text('Main menu', 'nav:home')
  await showScreen(ctx, screen('Delete post?', `${summaryFor(item)}\n\nThis will remove the post from the site. This cannot be undone.`), keyboard)
}

// ── Registration ──────────────────────────────────────────────────────────────

export function registerPostHandlers(bot: Bot): void {
  const flows = getFlows()

  // ── /newpost ──
  bot.command(
    'newpost',
    requireAuth(async (ctx) => {
      if (!ctx.chat) return
      flows.set(ctx.chat.id, { mode: 'newpost', step: 'title' })
      await ctx.reply('Enter the post title:\n\n(Type /cancel at any time to abort.)')
    }),
  )

  // ── /posts ──
  bot.command(
    'posts',
    requireAuth(async (ctx) => {
      const { text, keyboard } = await renderPostsPage(0)
      await ctx.reply(text, keyboard ? { reply_markup: keyboard } : undefined)
    }),
  )

  // ── /editpost <id> ──
  bot.command(
    'editpost',
    requireAuth(async (ctx) => {
      const postId = ctx.match?.toString().trim()
      if (!postId) {
        await ctx.reply('Usage: /editpost <id>\n\nTip: use /posts to see post IDs.')
        return
      }
      await startEditFlow(ctx, postId)
    }),
  )

  // ���─ /deletepost <id> ──
  bot.command(
    'deletepost',
    requireAuth(async (ctx) => {
      const postId = ctx.match?.toString().trim()
      if (!postId) {
        await ctx.reply('Usage: /deletepost <id>\n\nTip: use /posts to see post IDs.')
        return
      }
      await startDeleteFlow(ctx, postId)
    }),
  )

  // ── Pagination ──
  bot.callbackQuery(/^posts:page:(\d+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const page = Number(ctx.match[1])
    const { text, keyboard } = await renderPostsPage(page)
    await ctx.editMessageText(text, keyboard ? { reply_markup: keyboard } : undefined)
  }))
  bot.callbackQuery('posts:noop', async (ctx) => {
    await ctx.answerCallbackQuery()
  })

  // ── List → detail → action navigation ──
  bot.callbackQuery(/^post:view:(.+)$/, requireAuth(async (ctx) => {
    await acknowledge(ctx)
    await renderPostDetail(ctx, ctx.match[1])
  }))

  // ── Actions from post detail ──
  bot.callbackQuery(/^post:edit:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    await startEditFlow(ctx, ctx.match[1])
  }))
  bot.callbackQuery(/^post:delete:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    await startDeleteFlow(ctx, ctx.match[1])
  }))

  // ── Delete confirmation ──
  bot.callbackQuery(/^delconfirm:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const postId = ctx.match[1]
    const result = await deleteFeedItem(postId)
    if (!result.success) {
      await ctx.editMessageText(`Couldn't delete post ${postId}: ${result.error ?? 'unknown error'}.`)
      return
    }
    await ctx.editMessageText(`Post ${postId} deleted successfully.`)
  }))
  bot.callbackQuery(/^delcancel:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Delete cancelled.')
  }))

  // ── Edit: field choice ──
  bot.callbackQuery(/^editfield:(title|content|media|status|cancel):(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const [, field, postId] = ctx.match
    if (!ctx.chat) return

    if (field === 'cancel') {
      flows.delete(ctx.chat.id)
      await ctx.editMessageText('Edit cancelled.')
      return
    }

    if (field === 'status') {
      const keyboard = new InlineKeyboard()
        .text('Published', `editstatus:published:${postId}`)
        .text('Draft', `editstatus:draft:${postId}`)
      await ctx.editMessageText('Choose the new status:', { reply_markup: keyboard })
      return
    }

    if (field === 'media') {
      const item = await findPost(postId)
      flows.set(ctx.chat.id, { mode: 'editpost', step: 'awaiting_media', postId })
      if (item?.image) {
        try {
          await ctx.replyWithPhoto(item.image, { caption: `Current media for “${item.title}”\n\nThis asset will be replaced only after the new upload succeeds.` })
        } catch {
          await ctx.reply('The current media preview could not be loaded, but the existing asset is still safe.')
        }
      }
      await ctx.editMessageText('Replace post media\n\nSend a new photo or video. The current media was shown first when available.', { reply_markup: new InlineKeyboard().text('Cancel', `editfield:cancel:${postId}`).text('Main menu', 'nav:home') })
      return
    }

    // title | content
    flows.set(ctx.chat.id, {
      mode: 'editpost',
      step: field === 'title' ? 'awaiting_title' : 'awaiting_content',
      postId,
    })
    await ctx.editMessageText(`Send the new ${field}.\n\n(Type /cancel to abort.)`)
  }))

  // ── Edit: status choice ──
  bot.callbackQuery(/^editstatus:(draft|published):(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const [, status, postId] = ctx.match
    const result = await updateFeedItem(postId, { status: status as 'draft' | 'published' })
    if (!result.success || !result.item) {
      await ctx.editMessageText(`Couldn't update post ${postId}: ${result.error ?? 'unknown error'}.`)
      return
    }
    await ctx.editMessageText(`Updated!\n\n${summaryFor(result.item)}`)
  }))

  // ── newpost: category picker ──
  bot.callbackQuery(/^np:category:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!ctx.chat) return
    const state = flows.get(ctx.chat.id)
    if (!state || state.mode !== 'newpost' || state.step !== 'category') return
    const category = decodeURIComponent(ctx.match[1])
    flows.set(ctx.chat.id, { ...state, category, step: 'ask_media' })
    await ctx.editMessageText(`Category: ${category}\n\nWould you like to attach an image or video?`, { reply_markup: new InlineKeyboard().text('Yes', 'np:media:yes').text('No', 'np:media:no').row().text('Cancel', 'np:cancel') })
  }))

  bot.callbackQuery('np:category:new', requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!ctx.chat) return
    const state = flows.get(ctx.chat.id)
    if (!state || state.mode !== 'newpost') return
    flows.set(ctx.chat.id, { ...state, step: 'category' })
    await ctx.editMessageText('Send the new category name (or /cancel).')
  }))

  // ── newpost: media yes/no ──
  bot.callbackQuery(/^np:media:(yes|no)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!ctx.chat) return
    const state = flows.get(ctx.chat.id)
    if (!state || state.mode !== 'newpost') return

    if (ctx.match[1] === 'no') {
      flows.set(ctx.chat.id, { ...state, step: 'awaiting_publish' })
      await ctx.editMessageText('Publish now or save as draft?', { reply_markup: publishKeyboard() })
      return
    }

    flows.set(ctx.chat.id, { ...state, step: 'awaiting_media' })
    await ctx.editMessageText('Send the photo or video to attach.\n\n(Type /cancel to abort.)')
  }))

  // ── newpost: publish choice ──
  bot.callbackQuery(/^np:pub:(draft|published)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!ctx.chat) return
    const state = flows.get(ctx.chat.id)
    if (!state || state.mode !== 'newpost') return

    const status = ctx.match[1] as 'draft' | 'published'
    const next: NewPostState = { ...state, step: 'confirm', status }
    flows.set(ctx.chat.id, next)
    await ctx.editMessageText(buildNewPostSummary(next), { reply_markup: confirmKeyboard() })
  }))

  // ── newpost: confirm/cancel ──
  bot.callbackQuery('np:cancel', requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (ctx.chat) flows.delete(ctx.chat.id)
    await ctx.editMessageText('New post cancelled.')
  }))
  bot.callbackQuery('np:confirm', requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!ctx.chat) return
    const state = flows.get(ctx.chat.id)
    if (!state || state.mode !== 'newpost' || state.step !== 'confirm') return
    flows.delete(ctx.chat.id)

    try {
      const settings = await readSettingsData()
      const author = settings.hero.feedAuthorName || settings.hero.name || 'Admin'
      const content = state.content ?? ''
      const result = await addFeedItem({
        type: 'post',
        title: state.title ?? 'Untitled',
        excerpt: truncate(content, 160),
        content,
        category: state.category || 'posts',
        image: state.mediaUrl,
        media: state.mediaUrl ? [state.mediaUrl] : [],
        author,
        status: state.status ?? 'published',
      })

      if (!result.success || !result.item) {
        await ctx.editMessageText(`Couldn't create the post: ${result.error ?? 'unknown error'}. Please try again with /newpost.`)
        return
      }

      const draftNote = result.item.status === 'draft' ? '\n\n(Saved as a draft — not visible on the public site until published.)' : ''
      await ctx.editMessageText(
        `Post created!\n\nTitle: ${result.item.title}\nID: ${result.item.id}\nView: ${postLink(result.item.id)}${draftNote}`,
      )
    } catch (err) {
      logError('newpost:confirm', ctx.chat.id, err)
      await ctx.editMessageText("Something went wrong creating the post. Please try again with /newpost.")
    }
  }))

  // ── Text input for whichever flow step is active ──
  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next()
    const state = flows.get(ctx.chat.id)
    if (!state) return next()

    const text = ctx.message.text.trim()

    if (state.mode === 'newpost') {
      if (state.step === 'title') {
        if (!text) {
          await ctx.reply('Please send a non-empty title (or /cancel to abort).')
          return
        }
        flows.set(ctx.chat.id, { ...state, step: 'content', title: text })
        await ctx.reply('Now send the post content/body:\n\n(Type /cancel to abort.)')
        return
      }
      if (state.step === 'content') {
        if (!text) {
          await ctx.reply('Please send non-empty content (or /cancel to abort).')
          return
        }
        flows.set(ctx.chat.id, { ...state, step: 'category', content: text })
        const categories = await getCategories()
        const keyboard = new InlineKeyboard()
        for (const category of categories.slice(0, 20)) keyboard.text(category, `np:category:${encodeURIComponent(category)}`).row()
        keyboard.text('Create category', 'np:category:new').row()
        keyboard.text('Cancel', 'np:cancel')
        await ctx.reply('Choose a category for this post:', { reply_markup: keyboard })
        return
      }
      if (state.step === 'category') {
        const category = text.slice(0, 80)
        const created = await addCategory(category)
        if (!created.success && !created.error?.toLowerCase().includes('already')) {
          await ctx.reply(`Could not create that category: ${created.error ?? 'unknown error'}.`)
          return
        }
        flows.set(ctx.chat.id, { ...state, category, step: 'ask_media' })
        await ctx.reply(`Category: ${category}\n\nWould you like to attach an image or video?`, { reply_markup: new InlineKeyboard().text('Yes', 'np:media:yes').text('No', 'np:media:no').row().text('Cancel', 'np:cancel') })
        return
      }
      if (state.step === 'ask_media' || state.step === 'awaiting_media' || state.step === 'awaiting_publish' || state.step === 'confirm') {
        await ctx.reply('Please use the buttons above to continue (or /cancel to abort).')
        return
      }
    }

    // editpost
    if (state.step === 'awaiting_title' || state.step === 'awaiting_content') {
      if (!text) {
        await ctx.reply('Please send a non-empty value (or /cancel to abort).')
        return
      }
      const field = state.step === 'awaiting_title' ? 'title' : 'content'
      flows.delete(ctx.chat.id)
      try {
        const result = await updateFeedItem(state.postId, { [field]: text })
        if (!result.success || !result.item) {
          await ctx.reply(`Couldn't update post ${state.postId}: ${result.error ?? 'unknown error'}.`)
          return
        }
        await ctx.reply(`Updated!\n\n${summaryFor(result.item)}`)
      } catch (err) {
        logError(`editpost:${field}`, ctx.chat.id, err)
        await ctx.reply(GENERIC_ERROR_MESSAGE)
      }
      return
    }

    if (state.step === 'awaiting_media') {
      await ctx.reply('Please send a photo or video (or /cancel to abort).')
      return
    }

    await next()
  })

  // ── Media input for whichever flow step is active ──
  bot.on(['message:photo', 'message:video', 'message:document'], async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next()
    const state = flows.get(ctx.chat.id)
    if (!state) return next()

    const file = extractIncomingFile(ctx)
    if (!file) {
      await ctx.reply("That file type isn't supported. Please send a photo or video (or /cancel to abort).")
      return
    }

    if (state.mode === 'newpost' && state.step === 'awaiting_media') {
      await ctx.reply('Uploading…')
      try {
        const { url } = await downloadAndUploadTelegramFile(file, 'feed-posts')
        const next: NewPostState = { ...state, step: 'awaiting_publish', mediaUrl: url }
        flows.set(ctx.chat.id, next)
        await ctx.reply('Media attached. Publish now or save as draft?', { reply_markup: publishKeyboard() })
      } catch (err) {
        logError('newpost:media-upload', ctx.chat.id, err)
        await ctx.reply(`${mediaErrorMessage(err)} Please try again or /cancel.`)
      }
      return
    }

    if (state.mode === 'editpost' && state.step === 'awaiting_media') {
      await ctx.reply('Uploading…')
      try {
        const { url } = await downloadAndUploadTelegramFile(file, 'feed-posts', state.postId)
        flows.delete(ctx.chat.id)
        const result = await updateFeedItem(state.postId, { image: url, media: [url] })
        if (!result.success || !result.item) {
          await ctx.reply(`Couldn't update post ${state.postId}: ${result.error ?? 'unknown error'}.`)
          return
        }
        await ctx.reply(`Updated!\n\n${summaryFor(result.item)}`)
      } catch (err) {
        logError('editpost:media-upload', ctx.chat.id, err)
        await ctx.reply(`${mediaErrorMessage(err)} Please try again or /cancel.`)
      }
      return
    }

    await next()
  })
}

/**
 * Media-related failures from `downloadAndUploadTelegramFile` (file too
 * large, Telegram couldn't be reached, unsupported type) already carry a
 * safe, user-facing message — surface it instead of the generic fallback
 * so the admin knows *why* an upload failed. Anything else falls back to
 * the generic message so no internal detail (Cloudinary errors, network
 * stack traces) reaches the chat.
 */
function mediaErrorMessage(err: unknown): string {
  const knownMessages = [
    'File is too large (Telegram bots can only download files up to 20MB).',
    'Could not retrieve file from Telegram.',
    'Failed to download file from Telegram.',
  ]
  if (err instanceof Error && knownMessages.includes(err.message)) return err.message
  return "Couldn't upload that file."
}

function publishKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Publish now', 'np:pub:published')
    .text('Save as draft', 'np:pub:draft')
    .row()
    .text('❌ Cancel', 'np:cancel')
}

function confirmKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('✅ Confirm', 'np:confirm').text('❌ Cancel', 'np:cancel')
}

function buildNewPostSummary(state: NewPostState): string {
  return [
    'Preview:',
    '',
    `Title: ${state.title}`,
    `Content: ${truncate(state.content ?? '', 200)}`,
    `Media: ${state.mediaUrl ? 'yes' : 'no'}`,
    `Status: ${state.status}`,
    '',
    'Confirm to publish this post, or cancel to discard it.',
  ].join('\n')
}
