/**
 * Telegram admin bot — mirrors the web admin panel's actions (feed post
 * CRUD, site settings) using the SAME credentials and the SAME server
 * actions (`lib/data-actions.ts`) the admin panel calls, so content
 * created/edited via Telegram is indistinguishable from content created
 * via the web UI.
 *
 * Auth: /login asks for username then password (two separate messages,
 * never in one command) and checks them against ADMIN_USERNAME /
 * ADMIN_PASSWORD — the exact same env vars and constant-time comparison
 * the web login route uses. Sessions are per-chat, stored in Mongo, and
 * expire after 24h (see lib/telegram/auth.ts).
 *
 * Multi-step flows (login, create/edit post, settings edit) are tracked in
 * lib/telegram/flow.ts so they survive stateless serverless invocations.
 */
import { Bot, InlineKeyboard, type Context } from 'grammy'
import {
  addFeedItem,
  updateFeedItem,
  deleteFeedItem,
  getFeedData,
  getCategories,
  updateSettings,
} from '@/lib/data-actions'
import { readSettingsData } from '@/lib/data'
import { isChatAuthenticated, loginWithCredentials, logoutChat } from '@/lib/telegram/auth'
import { getFlow, setFlow, clearFlow, type Flow } from '@/lib/telegram/flow'
import { uploadTelegramFileToCloudinary } from '@/lib/telegram/media'
import { telegramLog } from '@/lib/telegram/logger'

const token = process.env.TELEGRAM_BOT_TOKEN

let botInstance: Bot | null = null

/** Lazily constructs the singleton bot so importing this module never
 * throws when TELEGRAM_BOT_TOKEN isn't set (e.g. during build). */
export function getBot(): Bot {
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set')
  }
  if (botInstance) return botInstance

  const bot = new Bot(token)
  registerHandlers(bot)
  botInstance = bot
  return bot
}

// ── Settings field allowlist ──────────────────────────────────────────────────
// Only these dotted paths are editable via /site set — keeps the bot's
// surface area intentional and prevents arbitrary nested-object writes.
const SETTINGS_FIELDS: Record<string, { label: string; path: [keyof Awaited<ReturnType<typeof readSettingsData>>, string] }> = {
  name: { label: 'Display name', path: ['hero', 'name'] },
  title: { label: 'Headline / title', path: ['hero', 'title'] },
  bio: { label: 'Bio', path: ['hero', 'bio'] },
  meta_title: { label: 'SEO title', path: ['meta', 'title'] },
  meta_description: { label: 'SEO description', path: ['meta', 'description'] },
  email: { label: 'Contact email', path: ['contact', 'email'] },
  phone: { label: 'Contact phone', path: ['contact', 'phone'] },
  whatsapp: { label: 'WhatsApp', path: ['contact', 'whatsapp'] },
  address: { label: 'Address', path: ['contact', 'address'] },
}

function requireAuth(chatId: number) {
  return isChatAuthenticated(chatId)
}

async function replyLoginRequired(ctx: Context) {
  await ctx.reply('You need to log in first. Send /login to authenticate with your admin panel username and password.')
}

const HELP_TEXT = [
  '*Admin bot commands*',
  '',
  '/login — authenticate with your admin panel username & password',
  '/logout — end your session',
  '',
  '/post\\_new — create a new feed post',
  '/post\\_list — list recent posts',
  '/post\\_edit `<id>` — edit a post',
  '/post\\_delete `<id>` — delete a post',
  '',
  '/site\\_view — view current site settings',
  '/site\\_set — update a site setting',
  '',
  '/cancel — cancel the current multi-step action',
].join('\n')

function registerHandlers(bot: Bot) {
  // Log every incoming update at the top of the pipeline.
  bot.use(async (ctx, next) => {
    const chatId = ctx.chat?.id
    const kind = ctx.message?.text?.split(' ')[0] ?? (ctx.callbackQuery ? 'callback_query' : ctx.message ? 'message' : 'update')
    telegramLog('info', 'update', chatId, 'received update', { kind })
    try {
      await next()
    } catch (error) {
      telegramLog('error', 'update', chatId, 'unhandled error', {
        error: error instanceof Error ? error.message : String(error),
      })
      await ctx.reply('Something went wrong handling that. Please try again.').catch(() => {})
    }
  })

  bot.command(['start', 'help'], async (ctx) => {
    const chatId = ctx.chat.id
    const authed = await requireAuth(chatId)
    const intro = authed
      ? "You're logged in."
      : "You're not logged in. Send /login to get started."
    await ctx.reply(`${intro}\n\n${HELP_TEXT}`, { parse_mode: 'Markdown' })
  })

  bot.command('cancel', async (ctx) => {
    await clearFlow(ctx.chat.id)
    await ctx.reply('Cancelled.')
  })

  // ── /login ───────────────────────────────────────────────────────────────
  bot.command('login', async (ctx) => {
    const chatId = ctx.chat.id
    if (await requireAuth(chatId)) {
      await ctx.reply("You're already logged in. Send /logout first if you want to switch accounts.")
      return
    }
    await setFlow(chatId, { kind: 'login', step: 'username' })
    await ctx.reply('Please enter your admin panel *username*:', { parse_mode: 'Markdown' })
  })

  bot.command('logout', async (ctx) => {
    await logoutChat(ctx.chat.id)
    await clearFlow(ctx.chat.id)
    await ctx.reply('You have been logged out. Send /login to authenticate again.')
  })

  // ── /post_new ────────────────────────────────────────────────────────────
  bot.command('post_new', async (ctx) => {
    const chatId = ctx.chat.id
    if (!(await requireAuth(chatId))) return replyLoginRequired(ctx)
    await setFlow(chatId, { kind: 'create_post', step: 'title' })
    await ctx.reply('Creating a new post.\n\nSend the *title*:', { parse_mode: 'Markdown' })
  })

  // ── /post_list ───────────────────────────────────────────────────────────
  bot.command('post_list', async (ctx) => {
    const chatId = ctx.chat.id
    if (!(await requireAuth(chatId))) return replyLoginRequired(ctx)
    const items = await getFeedData()
    const recent = items.slice(0, 10)
    if (recent.length === 0) {
      await ctx.reply('No posts yet.')
      return
    }
    const lines = recent.map((item) => {
      const date = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return `\`${item.id}\` — ${item.title} _(${item.category}, ${date})_`
    })
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' })
  })

  // ── /post_edit <id> ──────────────────────────────────────────────────────
  bot.command('post_edit', async (ctx) => {
    const chatId = ctx.chat.id
    if (!(await requireAuth(chatId))) return replyLoginRequired(ctx)
    const itemId = ctx.match?.toString().trim()
    if (!itemId) {
      await ctx.reply('Usage: /post_edit <id>\nUse /post_list to find an ID.')
      return
    }
    const items = await getFeedData()
    const item = items.find((i) => i.id === itemId)
    if (!item) {
      await ctx.reply(`Post \`${itemId}\` not found.`, { parse_mode: 'Markdown' })
      return
    }
    const kb = new InlineKeyboard()
      .text('Title', `editfield:${itemId}:title`)
      .text('Content', `editfield:${itemId}:content`)
      .row()
      .text('Category', `editfield:${itemId}:category`)
    await ctx.reply(
      `*${item.title}*\n${item.content}\n\nCategory: ${item.category}\n\nWhich field do you want to edit?`,
      { parse_mode: 'Markdown', reply_markup: kb },
    )
  })

  // ── /post_delete <id> ────────────────────────────────────────────────────
  bot.command('post_delete', async (ctx) => {
    const chatId = ctx.chat.id
    if (!(await requireAuth(chatId))) return replyLoginRequired(ctx)
    const itemId = ctx.match?.toString().trim()
    if (!itemId) {
      await ctx.reply('Usage: /post_delete <id>\nUse /post_list to find an ID.')
      return
    }
    const kb = new InlineKeyboard()
      .text('Yes, delete', `delpost:${itemId}`)
      .text('Cancel', 'delpost:cancel')
    await ctx.reply(`Delete post \`${itemId}\`? This cannot be undone.`, {
      parse_mode: 'Markdown',
      reply_markup: kb,
    })
  })

  // ── /site_view ───────────────────────────────────────────────────────────
  bot.command('site_view', async (ctx) => {
    const chatId = ctx.chat.id
    if (!(await requireAuth(chatId))) return replyLoginRequired(ctx)
    const settings = await readSettingsData()
    const lines = [
      `*Name:* ${settings.hero.name || '—'}`,
      `*Title:* ${settings.hero.title || '—'}`,
      `*Bio:* ${settings.hero.bio || '—'}`,
      `*SEO title:* ${settings.meta.title || '—'}`,
      `*SEO description:* ${settings.meta.description || '—'}`,
      `*Email:* ${settings.contact.email || '—'}`,
      `*Phone:* ${settings.contact.phone || '—'}`,
      `*WhatsApp:* ${settings.contact.whatsapp || '—'}`,
      `*Address:* ${settings.contact.address || '—'}`,
      `*Socials:* ${settings.contact.socials.map((s) => `${s.platform}: ${s.url}`).join(', ') || '—'}`,
    ]
    await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' })
  })

  // ── /site_set ────────────────────────────────────────────────────────────
  bot.command('site_set', async (ctx) => {
    const chatId = ctx.chat.id
    if (!(await requireAuth(chatId))) return replyLoginRequired(ctx)
    const kb = new InlineKeyboard()
    const keys = Object.keys(SETTINGS_FIELDS)
    for (let i = 0; i < keys.length; i += 2) {
      const pair = keys.slice(i, i + 2)
      kb.row(...pair.map((k) => InlineKeyboard.text(SETTINGS_FIELDS[k].label, `setfield:${k}`)))
    }
    await ctx.reply('Which setting do you want to update?', { reply_markup: kb })
  })

  // ── Callback queries (inline keyboard buttons) ────────────────────────────
  bot.on('callback_query:data', async (ctx) => {
    const chatId = ctx.chat?.id
    if (chatId === undefined) return
    const data = ctx.callbackQuery.data
    await ctx.answerCallbackQuery().catch(() => {})

    if (!(await requireAuth(chatId))) {
      await ctx.editMessageText('Session expired. Send /login to authenticate again.').catch(() => {})
      return
    }

    if (data.startsWith('delpost:')) {
      const itemId = data.slice('delpost:'.length)
      if (itemId === 'cancel') {
        await ctx.editMessageText('Cancelled.').catch(() => {})
        return
      }
      const result = await deleteFeedItem(itemId)
      telegramLog('info', 'post_delete', chatId, 'delete result', { itemId, success: result.success })
      await ctx.editMessageText(result.success ? `Post \`${itemId}\` deleted.` : `Failed: ${result.error}`, {
        parse_mode: 'Markdown',
      }).catch(() => {})
      return
    }

    if (data.startsWith('editfield:')) {
      const [, itemId, field] = data.split(':')
      await setFlow(chatId, { kind: 'edit_post', step: 'value', itemId, field })
      await ctx.editMessageText(`Send the new value for *${field}*:`, { parse_mode: 'Markdown' }).catch(() => {})
      return
    }

    if (data.startsWith('setfield:')) {
      const field = data.slice('setfield:'.length)
      const meta = SETTINGS_FIELDS[field]
      if (!meta) return
      await setFlow(chatId, { kind: 'site_set', step: 'value', field, label: meta.label })
      await ctx.editMessageText(`Send the new value for *${meta.label}*:`, { parse_mode: 'Markdown' }).catch(() => {})
      return
    }
  })

  // ── Photos sent during the create-post flow ───────────────────────────────
  bot.on('message:photo', async (ctx) => {
    const chatId = ctx.chat.id
    const flow = await getFlow(chatId)
    if (!flow || flow.kind !== 'create_post' || flow.step !== 'media') {
      await ctx.reply('Not expecting a photo right now. Send /post_new to create a post.')
      return
    }
    const photos = ctx.message.photo
    const best = photos[photos.length - 1]
    try {
      const url = await uploadTelegramFileToCloudinary(getBot(), best.file_id, `bot-${chatId}-${Date.now()}`)
      await finalizePost(ctx, chatId, { ...flow, image: url })
    } catch (error) {
      telegramLog('error', 'post_new', chatId, 'media upload failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      await ctx.reply('Failed to upload that image. Send another photo, or send "skip" to continue without one.')
    }
  })

  // ── Plain text — routes to whichever flow step is active ─────────────────
  bot.on('message:text', async (ctx) => {
    const chatId = ctx.chat.id
    const text = ctx.message.text.trim()
    if (text.startsWith('/')) return // unknown command, ignore here

    const flow = await getFlow(chatId)
    if (!flow) {
      const authed = await requireAuth(chatId)
      await ctx.reply(authed ? 'Send /help to see available commands.' : "Send /login to authenticate first.")
      return
    }

    if (flow.kind === 'login') return handleLoginStep(ctx, chatId, flow, text)
    if (flow.kind === 'create_post') return handleCreatePostStep(ctx, chatId, flow, text)
    if (flow.kind === 'edit_post') return handleEditPostStep(ctx, chatId, flow, text)
    if (flow.kind === 'site_set') return handleSiteSetStep(ctx, chatId, flow, text)
  })
}

// ── Flow step handlers ───────────────────────────────────────────────────────

async function handleLoginStep(
  ctx: Context,
  chatId: number,
  flow: Flow & { kind: 'login' },
  text: string,
) {
  if (flow.step === 'username') {
    await setFlow(chatId, { kind: 'login', step: 'password', username: text })
    await ctx.reply('Now enter your admin panel *password*:', { parse_mode: 'Markdown' })
    // Best-effort: delete the username message isn't necessary (not a secret),
    // but we never echo the password back anywhere.
    return
  }

  // step === 'password'
  const username = flow.username ?? ''
  const password = text
  // Try to remove the password message from the chat history immediately.
  await ctx.deleteMessage().catch(() => {})

  const result = await loginWithCredentials(chatId, username, password)
  await clearFlow(chatId)

  if (!result.success) {
    await ctx.reply(result.error ?? 'Invalid username or password')
    return
  }
  await ctx.reply("Login successful. You now have access to admin commands. Send /help to see what's available.")
}

async function handleCreatePostStep(
  ctx: Context,
  chatId: number,
  flow: Flow & { kind: 'create_post' },
  text: string,
) {
  if (flow.step === 'title') {
    await setFlow(chatId, { ...flow, step: 'content', title: text })
    await ctx.reply('Now send the post *content*:', { parse_mode: 'Markdown' })
    return
  }

  if (flow.step === 'content') {
    const categories = await getCategories()
    const list = categories.length > 0 ? categories.join(', ') : 'general'
    await setFlow(chatId, { ...flow, step: 'category', content: text })
    await ctx.reply(`Which category? (existing: ${list})\nSend a category name, or "general" if unsure.`)
    return
  }

  if (flow.step === 'category') {
    await setFlow(chatId, { ...flow, step: 'media', category: text || 'general' })
    await ctx.reply('Send a photo to attach to this post, or type "skip" to publish without one.')
    return
  }

  if (flow.step === 'media') {
    if (text.toLowerCase() === 'skip') {
      await finalizePost(ctx, chatId, flow)
      return
    }
    await ctx.reply('Send a photo, or type "skip" to continue without one.')
  }
}

async function finalizePost(
  ctx: Context,
  chatId: number,
  flow: Flow & { kind: 'create_post' },
) {
  await clearFlow(chatId)
  const settings = await readSettingsData()
  const result = await addFeedItem({
    type: 'post',
    title: flow.title ?? 'Untitled',
    excerpt: (flow.content ?? '').slice(0, 160),
    content: flow.content ?? '',
    category: flow.category ?? 'general',
    image: flow.image,
    media: flow.image ? [flow.image] : [],
    author: settings.hero.feedAuthorName || 'Admin',
  })

  telegramLog('info', 'post_new', chatId, 'create result', { success: result.success })

  if (!result.success) {
    await ctx.reply(`Failed to create post: ${result.error}`)
    return
  }
  await ctx.reply(`Post published: *${result.item?.title}*\nID: \`${result.item?.id}\``, { parse_mode: 'Markdown' })
}

async function handleEditPostStep(
  ctx: Context,
  chatId: number,
  flow: Flow & { kind: 'edit_post' },
  text: string,
) {
  await clearFlow(chatId)
  const field = flow.field
  if (field !== 'title' && field !== 'content' && field !== 'category') {
    await ctx.reply('Unsupported field.')
    return
  }
  const result = await updateFeedItem(flow.itemId, { [field]: text })
  telegramLog('info', 'post_edit', chatId, 'update result', { itemId: flow.itemId, field, success: result.success })
  await ctx.reply(result.success ? `Updated. Post \`${flow.itemId}\` saved.` : `Failed: ${result.error}`, {
    parse_mode: 'Markdown',
  })
}

async function handleSiteSetStep(
  ctx: Context,
  chatId: number,
  flow: Flow & { kind: 'site_set' },
  text: string,
) {
  await clearFlow(chatId)
  const meta = SETTINGS_FIELDS[flow.field]
  if (!meta) {
    await ctx.reply('Unsupported field.')
    return
  }
  const [section, key] = meta.path
  const result = await updateSettings({ [section]: { [key]: text } } as never)
  telegramLog('info', 'site_set', chatId, 'update result', { field: flow.field, success: result.success })
  await ctx.reply(result.success ? `Updated *${meta.label}*.` : `Failed: ${result.error}`, { parse_mode: 'Markdown' })
}
