/**
 * Site-settings management: /sitesettings, /updatesetting.
 *
 * Reuses the exact same server action the web admin panel's Edit Profile
 * page calls (`updateSettings` from `lib/data-actions.ts`, backing
 * `PUT /api/settings`) and the same reader (`readSettingsData` from
 * `lib/data.ts`) — nothing here reimplements persistence, it only drives
 * that function from a Telegram conversation. All commands are gated by
 * `requireAuth` from `lib/telegram/auth-middleware.ts`.
 *
 * Scope: the web admin's `SiteSettings` shape includes several array
 * fields (hero stats, tags, about media/timeline/stack/values, contact
 * socials) that are edited with dedicated add/remove UI in the browser.
 * Reproducing that as a chat flow would mean re-deriving that UI's
 * semantics rather than reusing it, so this module exposes the scalar
 * (single-value) fields — the ones a text prompt can safely replace in
 * one step — and points to the web admin panel for the array-based
 * sections. This mirrors how `posts.ts` scopes `/editpost` to one field
 * at a time rather than trying to represent every admin panel affordance.
 */
import { Bot, InlineKeyboard, type Context } from 'grammy'
import { requireAuth } from './auth-middleware'
import { updateSettings } from '@/lib/data-actions'
import { readSettingsData } from '@/lib/data'
import type { SiteSettings } from '@/lib/types'
import { GENERIC_ERROR_MESSAGE, logError } from './logger'

type Section = 'hero' | 'contact' | 'meta'

interface FieldDef {
  section: Section
  field: string
  label: string
  kind: 'text' | 'longtext' | 'email' | 'phone' | 'url'
}

// ── Editable field registry ──────────────────────────────────────────────────
// Ordered as shown in the section menus.

const FIELDS: FieldDef[] = [
  // Hero
  { section: 'hero', field: 'title', label: 'Headline / Title', kind: 'text' },
  { section: 'hero', field: 'bio', label: 'Short Bio', kind: 'longtext' },
  { section: 'hero', field: 'city', label: 'City', kind: 'text' },
  { section: 'hero', field: 'country', label: 'Country', kind: 'text' },
  { section: 'hero', field: 'profileButtonText', label: 'Profile Button Text', kind: 'text' },
  { section: 'hero', field: 'profileButtonLink', label: 'Profile Button Link', kind: 'url' },
  { section: 'hero', field: 'hireMeLink', label: 'Hire Me Link', kind: 'url' },
  { section: 'hero', field: 'feedAuthorName', label: 'Feed Author Name', kind: 'text' },
  // Contact
  { section: 'contact', field: 'email', label: 'Email', kind: 'email' },
  { section: 'contact', field: 'phone', label: 'Phone', kind: 'phone' },
  { section: 'contact', field: 'whatsapp', label: 'WhatsApp', kind: 'phone' },
  { section: 'contact', field: 'contactHeading', label: 'Contact Heading', kind: 'text' },
  { section: 'contact', field: 'contactSubHeading', label: 'Contact Sub-heading', kind: 'text' },
  { section: 'contact', field: 'shortText', label: 'Short Text', kind: 'longtext' },
  // Meta
  { section: 'meta', field: 'title', label: 'SEO Title', kind: 'text' },
  { section: 'meta', field: 'description', label: 'SEO Description', kind: 'longtext' },
  { section: 'meta', field: 'favicon', label: 'Favicon URL', kind: 'url' },
]

const SECTION_LABELS: Record<Section, string> = {
  hero: 'Hero / Profile',
  contact: 'Contact',
  meta: 'SEO / Meta',
}

const MAX_LENGTH: Record<FieldDef['kind'], number> = {
  text: 120,
  longtext: 600,
  email: 254,
  phone: 32,
  url: 500,
}

function fieldsFor(section: Section): FieldDef[] {
  return FIELDS.filter((f) => f.section === section)
}

function findField(section: Section, field: string): FieldDef | undefined {
  return FIELDS.find((f) => f.section === section && f.field === field)
}

function getValue(settings: SiteSettings, section: Section, field: string): string {
  const value = (settings[section] as unknown as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : ''
}

// ── Validation ────────────────────────────────────────────────────────────────
// Mirrors the validation intent already applied elsewhere in the codebase
// (e.g. the email regex in `app/api/orders/route.ts`) rather than inventing
// new rules, since the admin panel's own settings form does not enforce
// stricter checks than "non-empty" beyond that.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d][\d\s().-]{5,30}$/

function validateValue(fieldDef: FieldDef, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim()
  const max = MAX_LENGTH[fieldDef.kind]

  if (value.length > max) {
    return { ok: false, error: `That's too long — ${fieldDef.label} must be ${max} characters or fewer (got ${value.length}).` }
  }

  switch (fieldDef.kind) {
    case 'email':
      if (value && !EMAIL_RE.test(value)) {
        return { ok: false, error: 'That doesn\'t look like a valid email address. Please send a valid email (or /cancel).' }
      }
      return { ok: true, value }
    case 'phone':
      if (value && !PHONE_RE.test(value)) {
        return { ok: false, error: 'That doesn\'t look like a valid phone number. Use digits, spaces, +, - or () (or /cancel).' }
      }
      return { ok: true, value }
    case 'url':
      if (value && !isAcceptableUrl(value)) {
        return {
          ok: false,
          error: 'That doesn\'t look like a valid link. Use a full URL (https://…), mailto:, tel:, or a path like /contact (or /cancel).',
        }
      }
      return { ok: true, value }
    default:
      return { ok: true, value }
  }
}

function isAcceptableUrl(value: string): boolean {
  if (value.startsWith('/')) return true
  if (/^(mailto|tel):/i.test(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// ── Conversation state ───────────────────────────────────────────────────────

interface SettingsFlowState {
  section: Section
  field: string
}

declare global {
  // eslint-disable-next-line no-var
  var _telegramSettingsFlow: Map<number, SettingsFlowState> | undefined
}

function getFlows(): Map<number, SettingsFlowState> {
  if (!globalThis._telegramSettingsFlow) globalThis._telegramSettingsFlow = new Map()
  return globalThis._telegramSettingsFlow
}

/** Clears an in-progress settings edit for `chatId`. See `clearPostFlow` in `posts.ts` for why this is exported rather than owning its own `/cancel` handler. */
export function clearSettingsFlow(chatId: number): boolean {
  return getFlows().delete(chatId)
}

// ── Rendering ────────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

async function renderOverview(): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const settings = await readSettingsData()

  const lines = ['Current site settings:', '']
  for (const section of ['hero', 'contact', 'meta'] as Section[]) {
    lines.push(`— ${SECTION_LABELS[section]} —`)
    for (const fieldDef of fieldsFor(section)) {
      const value = getValue(settings, section, fieldDef.field)
      lines.push(`${fieldDef.label}: ${value ? truncate(value, 80) : '(empty)'}`)
    }
    lines.push('')
  }
  lines.push('Gallery media, hashtags, stats, timeline, stack, values, and socials are array-based and stay editable only from the web admin panel (Edit Profile).')

  const keyboard = new InlineKeyboard()
  for (const section of ['hero', 'contact', 'meta'] as Section[]) {
    keyboard.text(`Edit ${SECTION_LABELS[section]}`, `settings:section:${section}`).row()
  }

  return { text: lines.join('\n'), keyboard }
}

function sectionKeyboard(section: Section): InlineKeyboard {
  const keyboard = new InlineKeyboard()
  for (const fieldDef of fieldsFor(section)) {
    keyboard.text(fieldDef.label, `settings:field:${section}:${fieldDef.field}`).row()
  }
  keyboard.text('« Back', 'settings:overview')
  return keyboard
}

async function renderSection(section: Section): Promise<{ text: string; keyboard: InlineKeyboard }> {
  const settings = await readSettingsData()
  const lines = [`${SECTION_LABELS[section]} — choose a field to edit:`, '']
  for (const fieldDef of fieldsFor(section)) {
    const value = getValue(settings, section, fieldDef.field)
    lines.push(`${fieldDef.label}: ${value ? truncate(value, 80) : '(empty)'}`)
  }
  return { text: lines.join('\n'), keyboard: sectionKeyboard(section) }
}

// ── Registration ──────────────────────────────────────────────────────────────

export function registerSettingsHandlers(bot: Bot): void {
  const flows = getFlows()

  const showOverview = requireAuth(async (ctx: Context) => {
    const { text, keyboard } = await renderOverview()
    await ctx.reply(text, { reply_markup: keyboard })
  })

  // ── /sitesettings and /updatesetting are two entry points to the same UI ──
  bot.command('sitesettings', showOverview)
  bot.command('updatesetting', showOverview)

  bot.callbackQuery('settings:overview', requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    if (ctx.chat) flows.delete(ctx.chat.id)
    const { text, keyboard } = await renderOverview()
    await ctx.editMessageText(text, { reply_markup: keyboard })
  }))

  bot.callbackQuery(/^settings:section:(hero|contact|meta)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const section = ctx.match[1] as Section
    const { text, keyboard } = await renderSection(section)
    await ctx.editMessageText(text, { reply_markup: keyboard })
  }))

  bot.callbackQuery(/^settings:field:(hero|contact|meta):([a-zA-Z]+)$/, requireAuth(async (ctx) => {
    await ctx.answerCallbackQuery()
    const section = ctx.match[1] as Section
    const field = ctx.match[2]
    const fieldDef = findField(section, field)
    if (!fieldDef || !ctx.chat) {
      await ctx.editMessageText('Unknown field.')
      return
    }

    flows.set(ctx.chat.id, { section, field })
    const settings = await readSettingsData()
    const current = getValue(settings, section, field)
    await ctx.editMessageText(
      [
        `Editing: ${fieldDef.label}`,
        `Current value: ${current || '(empty)'}`,
        '',
        'Send the new value, or /cancel to abort.',
      ].join('\n'),
    )
  }))

  // ── Text input for whichever field is being edited ──
  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private') return next()
    const state = flows.get(ctx.chat.id)
    if (!state) return next()

    const fieldDef = findField(state.section, state.field)
    if (!fieldDef) {
      flows.delete(ctx.chat.id)
      return next()
    }

    const validated = validateValue(fieldDef, ctx.message.text)
    if (!validated.ok) {
      await ctx.reply(validated.error)
      return
    }

    flows.delete(ctx.chat.id)
    try {
      const result = await updateSettings({ [state.section]: { [state.field]: validated.value } } as Partial<SiteSettings>)
      if (!result.success) {
        await ctx.reply(`Couldn't update ${fieldDef.label}: ${result.error ?? 'unknown error'}.`)
        return
      }
      await ctx.reply(`Updated ${fieldDef.label}!\n\nNew value: ${validated.value || '(empty)'}`)
    } catch (err) {
      logError(`updatesetting:${state.section}.${state.field}`, ctx.chat.id, err)
      await ctx.reply(GENERIC_ERROR_MESSAGE)
    }
  })
}
