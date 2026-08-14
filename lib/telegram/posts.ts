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
import { getFeedData, addFeedItem, updateFeedItem, deleteFeedItem } from '@/lib/data-actions'
import { readSettingsData } from '@/lib/data'
import type { FeedItem } from '@/lib/types'

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://zihadimtiase.com').replace(/\/$/, '')
const PAGE_SIZE = 10

// ── Conversation state ───────────────────────────────────────────────────────

interface NewPostState {
  mode: 'newpost'
  step: 'title' | 'content' | 'ask_media' | 'awaiting_media' | 'awaiting_publish' | 'confirm'
  title?: string
  content?: string
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
    keyboard.text(`✏️ Edit ${shortId}`, `post:edit:${item.id}`).text(`🗑 Delete ${shortId}`, `post:delete:${item.id}`).row()
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
    await ctx.reply(`No post found with ID ${postId}.`)
    return
  }
  if (ctx.chat) getFlows().set(ctx.chat.id, { mode: 'editpost', step: 'choose_field', postId })
  await ctx.reply(`${summaryFor(item)}\n\nWhat would you like to edit?`, { reply_markup: fieldChoiceKeyboard(postId) })
}

// ── /deletepost / inline Delete button ───────────────────────────────────────

async function startDeleteFlow(ctx: Context, postId: string): Promise<void> {
  const { items } = await getFeedData({ includeDrafts: true })
  const item = items.find((i) => i.id === postId)
  if (!item) {
    await ctx.reply(`No post found with ID ${postId}.`)
    return
  }
  const keyboard = new InlineKeyboard()
    .text('Yes, delete it', `delconfirm:${postId}`)
    .text('No, cancel', `delcancel:${postId}`)
  await ctx.reply(`Delete this post?\n\nTitle: ${item.title}\nID: ${item.id}`, { reply_markup: keyboard })
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

  // ── /deletepost <id> ──
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

  // ── /cancel ──
  bot.command('cancel', async (ctx) => {
    if (!ctx.chat) return
    const had = flows.delete(ctx.chat.id)
    await ctx.reply(had ? 'Cancelled.' : 'Nothing to cancel.')
  })

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

  // ── Inline "Edit"/"Delete" buttons from /posts ──
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
      flows.set(ctx.chat.id, { mode: 'editpost', step: 'awaiting_media', postId })
      await ctx.editMessageText('Send a new photo or video for this post.\n\n(Type /cancel to abort.)')
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
        category: 'posts',
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
      console.error('[telegram-bot] Failed to create post:', err)
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
        flows.set(ctx.chat.id, { ...state, step: 'ask_media', content: text })
        const keyboard = new InlineKeyboard().text('Yes', 'np:media:yes').text('No', 'np:media:no')
        await ctx.reply('Would you like to attach an image or video?', { reply_markup: keyboard })
        return
      }
      // ask_media / awaiting_media / awaiting_publish / confirm are all
      // driven by inline-keyboard button presses, not free text.
      await ctx.reply('Please use the buttons above to continue (or /cancel to abort).')
      return
    }

    // editpost
    if (state.step === 'awaiting_title' || state.step === 'awaiting_content') {
      if (!text) {
        await ctx.reply('Please send a non-empty value (or /cancel to abort).')
        return
      }
      const field = state.step === 'awaiting_title' ? 'title' : 'content'
      flows.delete(ctx.chat.id)
      const result = await updateFeedItem(state.postId, { [field]: text })
      if (!result.success || !result.item) {
        await ctx.reply(`Couldn't update post ${state.postId}: ${result.error ?? 'unknown error'}.`)
        return
      }
      await ctx.reply(`Updated!\n\n${summaryFor(result.item)}`)
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
        console.error('[telegram-bot] Media upload failed:', err)
        await ctx.reply("Couldn't upload that file. Please try again or /cancel.")
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
        console.error('[telegram-bot] Media upload failed:', err)
        await ctx.reply("Couldn't upload that file. Please try again or /cancel.")
      }
      return
    }

    await next()
  })
}

function publishKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('Publish now', 'np:pub:published').text('Save as draft', 'np:pub:draft')
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
