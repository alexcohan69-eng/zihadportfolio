# Telegram Admin Bot

A Telegram bot that lets the site admin manage posts, services, and site settings remotely, using the exact same credentials and server-side functions as the web admin panel. No separate accounts, no duplicated business logic — the bot is just another client of `lib/data-actions.ts` and `lib/auth.ts`.

---

## Table of Contents

1. [Getting a Bot Token from @BotFather](#1-getting-a-bot-token-from-botfather)
2. [Environment Variables](#2-environment-variables)
3. [Running Locally (Long Polling)](#3-running-locally-long-polling)
4. [Running in Production (Webhook)](#4-running-in-production-webhook)
5. [Testing Webhooks Locally with ngrok](#5-testing-webhooks-locally-with-ngrok)
6. [Available Commands](#6-available-commands)
7. [Security Notes](#7-security-notes)
8. [Logging](#8-logging)
9. [Architecture Overview](#9-architecture-overview)
10. [Known Limitations & Future Improvements](#10-known-limitations--future-improvements)
11. [Manual Test Checklist](#11-manual-test-checklist)

---

## 1. Getting a Bot Token from @BotFather

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts:
   - Choose a display name (e.g. "Zihad Admin Bot").
   - Choose a username ending in `bot` (e.g. `zihad_admin_bot`).
3. BotFather replies with a token that looks like:
   ```
   123456789:AAHn2ZbT4_examplefaketokendonotuse
   ```
4. Copy that token — it goes into `TELEGRAM_BOT_TOKEN` (see below). Treat it like a password: anyone with this token can act as your bot.
5. Optional but recommended: send `/setprivacy` to BotFather and disable group privacy mode only if you need the bot to read every message in a group. For this bot, privacy mode should stay **enabled** (default) — all admin commands are designed to run in a private 1:1 chat only.

---

## 2. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | The token from @BotFather. Without this, the bot silently skips startup (see `lib/telegram/start.ts`) — the rest of the app keeps running normally. |
| `TELEGRAM_BOT_MODE` | No (default `polling`) | `polling` for local dev, `webhook` for production. |
| `TELEGRAM_WEBHOOK_URL` | Only if `TELEGRAM_BOT_MODE=webhook` | Public HTTPS URL Telegram should POST updates to, e.g. `https://yourdomain.com/api/telegram/webhook`. |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended in webhook mode | A random string. Telegram echoes it back in the `X-Telegram-Bot-Api-Secret-Token` header on every webhook request, so the route handler can reject forged requests that don't know the secret. |

These are validated on first use by `lib/telegram/config.ts` (via `zod`) — a missing or malformed value throws a clear error message instead of failing silently deep in the bot's logic.

The bot also reuses admin auth and upload env vars that already exist for the web app — no new secrets needed for those:

- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — checked via `verifyAdminCredentials` in `lib/auth.ts`, the same function the web login form uses.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — used when uploading photos/videos sent to the bot.
- `MONGODB_URI` — Telegram sessions (`chatId -> authenticated`) are stored in the same MongoDB database as everything else, in a `telegram_sessions` collection with a TTL index.

Add all of the above to `.env.local` for local dev, and to your Vercel project's **Settings → Environment Variables** for production.

---

## 3. Running Locally (Long Polling)

Long polling is the default and the simplest way to run the bot locally — the bot process itself asks Telegram for updates, so no public URL is needed.

1. Set in `.env.local`:
   ```env
   TELEGRAM_BOT_TOKEN=your_token_from_botfather
   # TELEGRAM_BOT_MODE defaults to "polling" — no need to set it
   ```
2. Start the dev server as usual:
   ```bash
   npm run dev
   ```
3. Watch the terminal for:
   ```
   [telegram-bot] Running in long-polling mode as @your_bot_username.
   ```
4. Open a DM with your bot on Telegram and send `/start`.

**Important:** only one process can long-poll a given bot token at a time. If you run two `next dev` instances (or a local dev server and a deployed webhook) against the same token, Telegram will return a 409 conflict to whichever one polls second.

---

## 4. Running in Production (Webhook)

In production, don't poll — let Telegram push updates to an HTTPS endpoint. This app receives webhook updates at `app/api/telegram/webhook/route.ts`.

1. Deploy the app to Vercel (or any host with a public HTTPS URL) with:
   ```env
   TELEGRAM_BOT_TOKEN=your_token_from_botfather
   TELEGRAM_BOT_MODE=webhook
   TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
   TELEGRAM_WEBHOOK_SECRET=some-long-random-string
   ```
2. On boot, `lib/telegram/start.ts` detects webhook mode and does **not** start polling — it just warms up `bot.botInfo` and logs a reminder.
3. Register the webhook with Telegram once (it stays registered until changed), by calling the Bot API directly:
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=https://yourdomain.com/api/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
4. Verify it's registered:
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
   ```
   You should see your URL under `"url"` and `"last_error_message"` empty (or absent).

To switch back to polling later, call `setWebhook` with an empty `url` value first — Telegram refuses to deliver updates via both modes to the same bot at once.

---

## 5. Testing Webhooks Locally with ngrok

To test webhook mode without deploying:

1. Start the dev server: `npm run dev` (usually `http://localhost:3000`).
2. In another terminal, tunnel it:
   ```bash
   npx ngrok http 3000
   ```
3. Copy the `https://xxxx.ngrok-free.app` URL ngrok prints.
4. Set in `.env.local`:
   ```env
   TELEGRAM_BOT_MODE=webhook
   TELEGRAM_WEBHOOK_URL=https://xxxx.ngrok-free.app/api/telegram/webhook
   TELEGRAM_WEBHOOK_SECRET=some-long-random-string
   ```
5. Restart `next dev`, then register the webhook exactly as in step 3 of [Running in Production](#4-running-in-production-webhook), pointing at the ngrok URL.
6. Message the bot — updates should now arrive via the ngrok tunnel instead of polling.

Remember to re-run `setWebhook` (or switch back to `TELEGRAM_BOT_MODE=polling`) once you're done, since the ngrok URL expires when the tunnel closes.

---

## 6. Available Commands

Send `/help` in the bot chat at any time for this same list, grouped by category.

### Account

| Command | Behavior |
|---|---|
| `/login` | Starts a 2-step conversation (username, then password) in a **private chat only**. On success, creates a 24-hour session for that chat. The password message is auto-deleted from the chat history immediately after being read. |
| `/logout` | Clears the session for that chat immediately. |
| `/cancel` | Aborts whatever multi-step flow is in progress (new post, edit, settings, service) for that chat. Safe to send even when nothing is in progress. |

### Posts

| Command | Behavior |
|---|---|
| `/newpost` | Multi-step: title → content → attach media? (Yes/No) → media upload (if yes) → publish now or save as draft → preview + confirm. On confirm, calls the same `addFeedItem` server action the admin panel's Feed manager uses. |
| `/posts` | Lists the most recent posts (paginated, 10 per page) with inline **Edit**/**Delete** buttons per post. |
| `/editpost <id>` | Jumps straight to editing one post's title, content, media, or status — one field at a time. |
| `/deletepost <id>` | Shows the post's title and ID, then requires an explicit **Yes, delete it** / **No, cancel** confirmation before calling `deleteFeedItem`. |

### Settings

| Command | Behavior |
|---|---|
| `/sitesettings` | Shows current values for Hero/Profile, Contact, and SEO/Meta fields, with inline **Edit** buttons per section. |
| `/updatesetting` | Same screen as `/sitesettings` — a second, more action-oriented entry point into the same flow. |

Array-based sections (gallery images, hashtags, hero stats, about timeline/stack/values, contact socials) are intentionally **not** editable from the bot — they have dedicated add/remove UI in the web admin's Edit Profile page that a chat prompt can't safely replace. The bot will point you to the web admin panel for those.

### Services

| Command | Behavior |
|---|---|
| `/newservice` | Multi-step: title → description → price → delivery time → features (comma-separated) → preview + confirm. |
| `/services` | Lists services (paginated) with inline **Edit** / **Activate**\|**Deactivate** / **Delete** buttons. |
| `/editservice <id>` | Edits one service's title, description, price, delivery time, or features. |
| `/deleteservice <id>` | Delete with confirmation, same pattern as `/deletepost`. |

### Other

| Command | Behavior |
|---|---|
| `/stats` | Read-only counts: total/published/draft posts, total/active services, total orders. |
| `/orders` | Read-only list of the most recent order/contact requests. Replying to a client stays on the web admin's Messages page — that flow also handles online-presence detection and an offline-email fallback that wouldn't be meaningful to duplicate in a bot session. |

---

## 7. Security Notes

- **Credentials are never stored or logged.** `/login` verifies against `verifyAdminCredentials` (the same function the web `/api/auth/login` route uses) and only ever logs a masked chat ID and `success`/`failure` — never the username or password.
- **The password message is deleted from chat history** immediately after the bot reads it, on a best-effort basis (Telegram lets bots delete their own recent messages and the user's messages in private chats they're both in).
- **Login only works in a private 1:1 chat.** If `/login` is sent from a group, the bot refuses and asks you to DM it instead, so credentials are never typed somewhere other members could see.
- **Sessions expire after 24 hours.** A session is just "this chat completed `/login` less than 24 hours ago," stored as a MongoDB document with a TTL index — Mongo deletes expired sessions automatically. There's no persistent token to leak.
- **Failed logins are rate-limited** with a 3-second cooldown per chat, to slow down rapid brute-force retries.
- **Every admin command requires an active session.** Unauthenticated chats get `Please /login first.` and the underlying handler never runs — enforced centrally in `lib/telegram/auth-middleware.ts`'s `requireAuth`, not repeated per command.
- **Logs never include full chat IDs, usernames, or passwords.** Chat IDs are masked to their first 4 characters (e.g. `1234...`) everywhere they appear in logs.

---

## 8. Logging

There's no pre-existing project-wide logger, so `lib/telegram/logger.ts` provides a small, consistent wrapper around `console`, used everywhere in the bot code instead of ad-hoc `console.log`/`console.error` calls:

- `logCommand(chatId, action, status)` — every command or button press that goes through `requireAuth` is logged once, with a masked chat ID, the command/callback name, an ISO 8601 timestamp, and `success` / `failure` / `denied`.
- `logAuth(chatId, status)` — every `/login` attempt, `success` or `failure`, without ever including the username or password.
- `logError(context, chatId, err)` — full error stack traces, server-side only. The chat only ever receives a generic message (`GENERIC_ERROR_MESSAGE`), never the stack trace, a file path, or a database error string.
- `logWarn(context, chatId, message)` — best-effort operations that failed without blocking the flow (e.g. couldn't auto-delete the password message).

Example log lines (chat ID always masked):

```
[telegram-bot] 2025-01-15T10:22:31.104Z chat=1234... action="login" status=success
[telegram-bot] 2025-01-15T10:23:02.881Z chat=1234... action="/newpost" status=success
[telegram-bot] 2025-01-15T10:24:15.552Z chat=1234... action="post:delete:65f1a2b3c4d5" status=denied
[telegram-bot] 2025-01-15T10:25:40.019Z chat=1234... action="editpost:title" status=error: Error: ...
```

---

## 9. Architecture Overview

```
lib/telegram/
├── config.ts           # zod-validated env vars (TELEGRAM_BOT_TOKEN, mode, webhook URL/secret)
├── logger.ts            # Masked-chat-id, timestamped logging + the generic error message
├── bot.ts               # Creates the shared Bot instance, registers /start /help /cancel,
│                         # the global bot.catch() fallback, and every module below
├── auth-middleware.ts    # requireAuth() — the single gate + logger + try/catch every
│                         # admin command and callback query goes through
├── session-store.ts      # MongoDB-backed chatId -> session, 24h TTL
├── login.ts              # /login, /logout, and the 2-step login conversation
├── media.ts               # Downloads a Telegram file and re-uses uploadToCloudinary()
├── posts.ts               # /newpost /posts /editpost /deletepost
├── settings.ts            # /sitesettings /updatesetting
├── services.ts            # /newservice /services /editservice /deleteservice
├── stats.ts               # /stats /orders (read-only)
└── start.ts                # startTelegramBot()/stopTelegramBot() + SIGINT/SIGTERM hooks
```

Key decisions:

- **No business logic is duplicated.** Every mutation calls the exact same `lib/data-actions.ts` functions (`addFeedItem`, `updateFeedItem`, `deleteFeedItem`, `addService`, `updateService`, `deleteService`, `updateSettings`) that the web admin panel's own components and API routes call. The bot is just another caller.
- **Auth, logging, and error handling are centralized in `requireAuth`.** Because every admin-gated command and callback query is wrapped with it, adding logging or a generic error fallback there covers ~30 call sites without repeating try/catch everywhere. A handful of free-text "continuation" handlers (the messages that drive an in-progress `/newpost`/`/editservice`/etc. flow) aren't wrapped in `requireAuth` — being mid-flow already implies a prior authenticated command — so those wrap their own risky calls in try/catch directly.
- **Conversation state lives in memory**, in `Map`s cached on `globalThis` (same pattern as the Mongo client singleton in `lib/db.ts`), so it survives Next.js dev hot-reloads. It's not persisted anywhere — a server restart mid-flow just means the admin re-runs the command, which is an acceptable tradeoff for something that only needs to survive a few chat messages.
- **`/cancel` is centralized in `bot.ts`**, not owned by any one flow module. Each module exports a `clear*Flow(chatId)` helper; `/cancel` tries all of them since a chat can only be mid-flow in one at a time.
- **Startup never crashes the app.** If `TELEGRAM_BOT_TOKEN` is unset, `lib/telegram/start.ts` logs and skips instead of throwing — the web app keeps running normally without the bot.

---

## 10. Known Limitations & Future Improvements

- **Array-based settings fields** (gallery media, hashtags, hero stats, about timeline/stack/values, contact socials) and **service testimonial linking** are web-admin-only. They have dedicated add/remove/reorder UI in the browser that a linear chat conversation can't reproduce as well.
- **Only one bot process may long-poll a given token at a time.** Running a second local dev instance against the same `TELEGRAM_BOT_TOKEN` will cause a 409 conflict — use a second bot token for a second local environment, or switch to webhook mode.
- **Telegram's own 20MB file-download limit** applies to media the bot receives (`MAX_TELEGRAM_FILE_BYTES` in `lib/telegram/media.ts`). Larger files must be uploaded from the web admin panel instead.
- **No multi-admin support.** `/login` checks a single `ADMIN_USERNAME`/`ADMIN_PASSWORD` pair, matching the web admin panel. Any chat that successfully authenticates gets full admin access for 24 hours — there's no per-admin audit trail beyond the masked-chat-ID logs.
- **Order replies stay on the web admin's Messages page.** `/orders` is intentionally read-only since replying also involves online-presence detection and an offline-email fallback that isn't meaningful to replicate from a bot session.
- **Possible future work:** inline "Back" buttons for linear text-driven flows (currently `/cancel` is the universal escape, but there's no way to go back one step without restarting); a `/whoami` command showing session expiry time; audit-log export.

---

## 11. Manual Test Checklist

Run through this after any change to the bot code:

- [ ] Unauthenticated chat sends `/posts` (or any admin command) → gets `Please /login first.`
- [ ] `/login` with a wrong password → `Invalid username or password.`, and a 3-second cooldown before the next attempt is accepted.
- [ ] `/login` with correct credentials → `Login successful.`, and the password message disappears from the chat.
- [ ] `/newpost` end-to-end with an attached image → post appears on the live site with the image.
- [ ] `/newpost` end-to-end with "No" media and "Save as draft" → post is created but not visible on the public site.
- [ ] `/posts` → list renders with working inline Edit/Delete buttons and pagination (if more than 10 posts).
- [ ] Edit a post's title via `/editpost <id>` → change reflects on the site.
- [ ] Delete a post via the inline button, confirm the Yes/No dialog → post is removed from the site.
- [ ] `/sitesettings` → edit a field (e.g. Hero Bio) → change reflects on the live site.
- [ ] Enter an invalid email/phone/URL in a settings edit → validation error shown, value not saved.
- [ ] `/newservice` end-to-end → service appears in `/services` and (if active) on the site.
- [ ] `/stats` and `/orders` return sensible read-only data.
- [ ] `/cancel` mid-flow (try it during `/newpost`, `/editpost`, `/sitesettings`, and `/newservice`) → flow aborts cleanly, no leftover state (verify by starting the same command again immediately after).
- [ ] `/logout` → immediately after, an admin command returns `Please /login first.` again.
- [ ] Existing web admin panel pages (Feed, Site Settings, Services) still work and reflect bot-made changes and vice versa.
