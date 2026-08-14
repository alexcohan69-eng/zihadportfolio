/**
 * Service management: /newservice, /services, /editservice, /deleteservice.
 *
 * Every mutation reuses the exact same server actions the web admin
 * panel's Services manager uses (`addService` / `updateService` /
 * `deleteService` / `getServicesData`, all from `lib/data-actions.ts`) —
 * nothing here reimplements service persistence or slug generation, it
 * only drives those functions from a Telegram conversation. All commands
 * are gated by `requireAuth`.
 *
 * Media and linked-testimonial management stay web-admin-only: there is no
 * `services` Cloudinary entity type configured (see `lib/cloudinary.ts`),
 * and testimonial linking is inherently a multi-select-from-a-list UI that
 * a chat flow can't represent any better than the browser form already
 * does. This module covers the scalar fields and the active/inactive
 * toggle, following the same "one field at a time" pattern as
 * `/editpost` in `posts.ts`.
 */
import { Bot, InlineKeyboard, type Context } from 'grammy'
import { requireAuth } from './auth-middleware'
import { getServicesData, addService, updateService, deleteService } from '@/lib/data-actions'
import type { Service } from '@/lib/types'
import { GENERIC_ERROR_MESSAGE, logError } from './logger'

const PAGE_SIZE = 10

// ── Conversation state ───────────────────────────────────────────────────────

interface NewServiceState {
  mode: 'newservice'
  step: 'title' | 'description' | 'price' | 'deliveryTime' | 'features' | 'confirm'
  title?: string
  description?: string
  price?: string
  deliveryTime?: string
  features?: string[]
}

interface EditServiceState {
  mode: 'editservice'
  step: 'choose_field' | 'awaiting_value'
  serviceId: string
  field?: 'title' | 'description' | 'price' | 'deliveryTime' | 'features'
}

type FlowState = NewServiceState | EditServiceState

declare global {
  // eslint-disable-next-line no-var
  var _telegramServiceFlows: Map<number, FlowState> | undefined
}

function getFlows(): Map<number, FlowState> {
  if (!globalThis._telegramServiceFlows) globalThis._telegramServiceFlows = new Map()
  return globalThis._telegramServiceFlows
}

/** Clears an in-progress /newservice or /editservice flow for `chatId`. See `clearPostFlow` in `posts.ts`. */
export function clearServiceFlow(chatId: number): boolean {
  return getFlows().delete(chatId)
}

// ── Formatting helpers ───────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function serviceLine(service: Service): string {
  return `ID: ${service.id} | ${service.title} | ${service.price || 'no price set'} | ${service.isActive ? 'active' : 'inactive'}`
}

function summaryFor(service: Service): string {
  const lines = [
    `Title: ${service.title}`,
    `Description: ${truncate(service.description, 200)}`,
    `Price: ${service.price || '(not set)'}`,
    `Delivery time: ${service.deliveryTime || '(not set)'}`,
    `Features: ${service.features.length ? service.features.join(', ') : '(none)'}`,
    `Status: ${service.isActive ? 'active' : 'inactive'}`,
  ]
  return lines.join('\n')
}

function fieldChoiceKeyboard(serviceId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('Title', `svcedit:title:${serviceId}`)
    .text('Description', `svcedit:description:${serviceId}`)
    .row()
    .text('Price', `svcedit:price:${serviceId}`)
    .text('Delivery time', `svcedit:deliveryTime:${serviceId}`)
    .row()
    .text('Features', `svcedit:features:${serviceId}`)
    .text('Cancel', `svcedit:cancel:${serviceId}`)
}

// ── /services listing + pagination ───────────────────────────────────────────

async function renderServicesPage(page: number): Promise<{ text: string; keyboard?: InlineKeyboard }> {
  const { services } = await getServicesData()

  if (services.length === 0) {
    return { text: 'No services yet. Use /newservice to add one.' }
  }

  const totalPages = Math.max(1, Math.ceil(services.length / PAGE_SIZE))
  const clampedPage = Math.min(Math.max(page, 0), totalPages - 1)
  const slice = services.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  const keyboard = new InlineKeyboard()
  for (const service of slice) {
    const shortId = service.id.slice(-6)
    keyboard
      .text(`✏️ Edit ${shortId}`, `service:edit:${service.id}`)
      .text(service.isActive ? `⏸ Deactivate ${shortId}` : `▶️ Activate ${shortId}`, `service:toggle:${service.id}`)
      .row()
      .text(`🗑 Delete ${shortId}`, `service:delete:${service.id}`)
      .row()
  }
  if (totalPages > 1) {
    if (clampedPage > 0) keyboard.text('« Prev', `services:page:${clampedPage - 1}`)
    keyboard.text(`${clampedPage + 1}/${totalPages}`, 'services:noop')
    if (clampedPage < totalPages - 1) keyboard.text('Next »', `services:page:${clampedPage + 1}`)
  }

  const text = [`Services (page ${clampedPage + 1}/${totalPages}):`, '', ...slice.map(serviceLine)].join('\n')
  return { text, keyboard }
}

async function startEditFlow(ctx: Context, serviceId: string): Promise<void> {
  const { services } = await getServicesData()
  const service = services.find((s) => s.id === serviceId)
  if (!service) {
    await ctx.reply(`No service found with ID ${serviceId}.`)
    return
  }
  if (ctx.chat) getFlows().set(ctx.chat.id, { mode: 'editservice', step: 'choose_field', serviceId })
  await ctx.reply(`${summaryFor(service)}\n\nWhat would you like to edit?`, { reply_markup: fieldChoiceKeyboard(serviceId) })
}

async function startDeleteFlow(ctx: Context, serviceId: string): Promise<void> {
  const { services } = await getServicesData()
  const service = services.find((s) => s.id === serviceId)
  if (!service) {
    await ctx.reply(`No service found with ID ${serviceId}.`)
    return
  }
  const keyboard = new InlineKeyboard()
    .text('Yes, delete it', `svcdelconfirm:${serviceId}`)
    .text('No, cancel', `svcdelcancel:${serviceId}`)
  await ctx.reply(`Delete this service?\n\nTitle: ${service.title}\nID: ${service.id}`, { reply_markup: keyboard })
}

function newServiceKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('✅ Confirm', 'svc:confirm').text('❌ Cancel', 'svc:cancel')
}

function buildNewServiceSummary(state: NewServiceState): string {
  return [
    'Preview:',
    '',
    `Title: ${state.title}`,
    `Description: ${truncate(state.description ?? '', 200)}`,
    `Price: ${state.price || '(not set)'}`,
    `Delivery time: ${state.deliveryTime || '(not set)'}`,
    `Features: ${state.features?.length ? state.features.join(', ') : '(none)'}`,
    '',
    'The service will be created as active. Confirm to add it, or cancel to discard it.',
  ].join('\n')
}

// ── Registration ──────────────────────────────────────────────────────────────

export function registerServiceHandlers(bot: Bot): void {
  const flows = getFlows()

  // ── /newservice ──
  bot.command(
    'newservice',
    requireAuth(async (ctx) => {
      if (!ctx.chat) return
      flows.set(ctx.chat.id, { mode: 'newservice', step: 'title' })
      await ctx.reply('Enter the service title:\n\n(Type /cancel at any time to abort.)')
    }),
  )

  // ── /services ──
  bot.command(
    'services',
    requireAuth(async (ctx) => {
      const { text, keyboard } = await renderServicesPage(0)
      await ctx.reply(text, keyboard ? { reply_markup: keyboard } : undefined)
    }),
  )

  // ── /editservice <id> ──
  bot.command(
    'editservice',
    requireAuth(async (ctx) => {
      const serviceId = ctx.match?.toString().trim()
      if (!serviceId) {
        await ctx.reply('Usage: /editservice <id>\n\nTip: use /services to see service IDs.')
        return
      }
      await startEditFlow(ctx, serviceId)
    }),
  )

  // ── /deleteservice <id> ──
  bot.command(
    'deleteservice',
    requireAuth(async (ctx) => {
      const serviceId = ctx.match?.toString().trim()
      if (!serviceId) {
        await ctx.reply('Usage: /deleteservice <id>\n\nTip: use /services to see service IDs.')
        return
      }
      await startDeleteFlow(ctx, serviceId)
    }),
  )

  // ── Pagination ──
  bot.callbackQuery(/^services:page:(\d+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const page = Number(ctx.match[1])
    const { text, keyboard } = await renderServicesPage(page)
    await ctx.editMessageText(text, keyboard ? { reply_markup: keyboard } : undefined)
  }))
  bot.callbackQuery('services:noop', async (ctx) => {
    await ctx.answerCallbackQuery()
  })

  // ── Inline "Edit"/"Delete"/"Toggle" buttons from /services ──
  bot.callbackQuery(/^service:edit:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    await startEditFlow(ctx, ctx.match[1])
  }))
  bot.callbackQuery(/^service:delete:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    await startDeleteFlow(ctx, ctx.match[1])
  }))
  bot.callbackQuery(/^service:toggle:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const serviceId = ctx.match[1]
    const { services } = await getServicesData()
    const service = services.find((s) => s.id === serviceId)
    if (!service) {
      await ctx.reply(`No service found with ID ${serviceId}.`)
      return
    }
    const result = await updateService(serviceId, { isActive: !service.isActive })
    if (!result.success || !result.service) {
      await ctx.reply(`Couldn't update service ${serviceId}: ${result.error ?? 'unknown error'}.`)
      return
    }
    await ctx.reply(`Updated!\n\n${summaryFor(result.service)}`)
  }))

  // ── Delete confirmation ──
  bot.callbackQuery(/^svcdelconfirm:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const serviceId = ctx.match[1]
    const result = await deleteService(serviceId)
    if (!result.success) {
      await ctx.editMessageText(`Couldn't delete service ${serviceId}: ${result.error ?? 'unknown error'}.`)
      return
    }
    await ctx.editMessageText(`Service ${serviceId} deleted successfully.`)
  }))
  bot.callbackQuery(/^svcdelcancel:(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Delete cancelled.')
  }))

  // ── Edit: field choice ──
  bot.callbackQuery(/^svcedit:(title|description|price|deliveryTime|features|cancel):(.+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const [, field, serviceId] = ctx.match
    if (!ctx.chat) return

    if (field === 'cancel') {
      flows.delete(ctx.chat.id)
      await ctx.editMessageText('Edit cancelled.')
      return
    }

    flows.set(ctx.chat.id, {
      mode: 'editservice',
      step: 'awaiting_value',
      serviceId,
      field: field as EditServiceState['field'],
    })
    const prompt =
      field === 'features'
        ? 'Send the new features as a comma-separated list (e.g. "2 revisions, source files").'
        : `Send the new ${field}.`
    await ctx.editMessageText(`${prompt}\n\n(Type /cancel to abort.)`)
  }))

  // ── newservice: confirm/cancel ──
  bot.callbackQuery('svc:cancel', requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (ctx.chat) flows.delete(ctx.chat.id)
    await ctx.editMessageText('New service cancelled.')
  }))
  bot.callbackQuery('svc:confirm', requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (!ctx.chat) return
    const state = flows.get(ctx.chat.id)
    if (!state || state.mode !== 'newservice' || state.step !== 'confirm') return
    flows.delete(ctx.chat.id)

    try {
      const result = await addService({
        title: state.title ?? 'Untitled',
        description: state.description ?? '',
        price: state.price ?? '',
        deliveryTime: state.deliveryTime ?? '',
        features: state.features ?? [],
        media: [],
        isActive: true,
        linkedTestimonials: [],
      })

      if (!result.success || !result.service) {
        await ctx.editMessageText(`Couldn't create the service: ${result.error ?? 'unknown error'}. Please try again with /newservice.`)
        return
      }

      await ctx.editMessageText(`Service created!\n\nTitle: ${result.service.title}\nID: ${result.service.id}\nSlug: ${result.service.slug}`)
    } catch (err) {
      logError('newservice:confirm', ctx.chat.id, err)
      await ctx.editMessageText('Something went wrong creating the service. Please try again with /newservice.')
    }
  }))

  // ── Text input for whichever flow step is active ──
  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next()
    const state = flows.get(ctx.chat.id)
    if (!state) return next()

    const text = ctx.message.text.trim()

    if (state.mode === 'newservice') {
      if (state.step === 'title') {
        if (!text) {
          await ctx.reply('Please send a non-empty title (or /cancel to abort).')
          return
        }
        flows.set(ctx.chat.id, { ...state, step: 'description', title: text })
        await ctx.reply('Now send the service description:\n\n(Type /cancel to abort.)')
        return
      }
      if (state.step === 'description') {
        if (!text) {
          await ctx.reply('Please send non-empty description (or /cancel to abort).')
          return
        }
        flows.set(ctx.chat.id, { ...state, step: 'price', description: text })
        await ctx.reply('Send the price (e.g. "Starting at $500"), or send "skip" to leave it blank:\n\n(Type /cancel to abort.)')
        return
      }
      if (state.step === 'price') {
        flows.set(ctx.chat.id, { ...state, step: 'deliveryTime', price: text.toLowerCase() === 'skip' ? '' : text })
        await ctx.reply('Send the delivery time (e.g. "5-7 days"), or send "skip" to leave it blank:\n\n(Type /cancel to abort.)')
        return
      }
      if (state.step === 'deliveryTime') {
        flows.set(ctx.chat.id, { ...state, step: 'features', deliveryTime: text.toLowerCase() === 'skip' ? '' : text })
        await ctx.reply('Send the deliverables/features as a comma-separated list, or send "skip" to leave it empty:\n\n(Type /cancel to abort.)')
        return
      }
      if (state.step === 'features') {
        const features = text.toLowerCase() === 'skip' ? [] : text.split(',').map((f) => f.trim()).filter(Boolean)
        const next: NewServiceState = { ...state, step: 'confirm', features }
        flows.set(ctx.chat.id, next)
        await ctx.reply(buildNewServiceSummary(next), { reply_markup: newServiceKeyboard() })
        return
      }
      await ctx.reply('Please use the buttons above to continue (or /cancel to abort).')
      return
    }

    // editservice
    if (state.step === 'awaiting_value' && state.field) {
      const { field, serviceId } = state
      let update: Partial<Service>

      if (field === 'features') {
        update = { features: text.split(',').map((f) => f.trim()).filter(Boolean) }
      } else if (field === 'title' || field === 'description') {
        if (!text) {
          await ctx.reply('Please send a non-empty value (or /cancel to abort).')
          return
        }
        update = { [field]: text }
      } else {
        // price / deliveryTime — allowed to be blank
        update = { [field]: text.toLowerCase() === 'skip' ? '' : text }
      }

      flows.delete(ctx.chat.id)
      try {
        const result = await updateService(serviceId, update)
        if (!result.success || !result.service) {
          await ctx.reply(`Couldn't update service ${serviceId}: ${result.error ?? 'unknown error'}.`)
          return
        }
        await ctx.reply(`Updated!\n\n${summaryFor(result.service)}`)
      } catch (err) {
        logError(`editservice:${field}`, ctx.chat.id, err)
        await ctx.reply(GENERIC_ERROR_MESSAGE)
      }
      return
    }

    await next()
  })
}
