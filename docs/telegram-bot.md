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
12. [Process Management & Reliability](#12-process-management--reliability)
13. [Health Checks & Monitoring](#13-health-checks--monitoring)
14. [Deployment Checklist](#14-deployment-checklist)
15. [Troubleshooting](#15-troubleshooting)

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
3. Register the webhook with Telegram once (it stays registered until changed). Two equivalent ways to do this:

   **Using the bundled script** (reads `TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_URL`/`TELEGRAM_WEBHOOK_SECRET` from your environment):
   ```bash
   npm run telegram:webhook:set
   ```

   **Or by calling the Bot API directly:**
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=https://yourdomain.com/api/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
4. Verify it's registered:
   ```bash
   npm run telegram:webhook:info
   # or: curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
   ```
   You should see your URL under `"url"` and `"last_error_message"` empty (or absent).

To switch back to polling later, run `npm run telegram:webhook:delete` (or call `setWebhook` with an empty `url`) first — Telegram refuses to deliver updates via both modes to the same bot at once.

> **Running on Vercel specifically:** environment variables go in Project Settings → Environment Variables (not a `.env` file, which isn't deployed). Run the `telegram:webhook:set` script from your local machine or CI **after** the deployment with the new URL is live — the script only talks to Telegram's API, it doesn't need to run on the server itself.

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
- [ ] Log in from a second Telegram account with the wrong credentials → also gets `Invalid username or password.` (there's no per-account allowlist — the same single `ADMIN_USERNAME`/`ADMIN_PASSWORD` pair gates every chat, matching the web admin panel).
- [ ] Run through `/login` → `/newpost` → `/posts` on a mobile Telegram client, not just Desktop/Web — inline keyboards and the photo-upload step both render and behave the same.

---

## 12. Process Management & Reliability

This app deploys to **Vercel**, which is serverless — there is no long-running process for a process manager (pm2, systemd) to supervise, and Vercel itself handles restarts, crash recovery, and restart-on-deploy. This changes which of the two bot modes is viable in production:

- **Webhook mode is the only viable mode on Vercel.** Each incoming update is a normal, short-lived serverless function invocation (`app/api/telegram/webhook/route.ts`) — it starts, handles one update, and exits, which fits Vercel's model perfectly and responds well within Telegram's 60-second delivery timeout.
- **Long polling cannot run reliably on Vercel.** `bot.start()` (used in `TELEGRAM_BOT_MODE=polling`) holds an open connection to Telegram indefinitely, which a serverless function invocation cannot do — it will be killed after the platform's execution limit and immediately reconnect on the next cold start, causing repeated `409 Conflict` errors and dropped updates. Polling is intended for **local development only** in this app; production must set `TELEGRAM_BOT_MODE=webhook`.
- **Reliability on Vercel comes from the platform, not a process supervisor:** every deployment automatically restarts all functions, a crashing function invocation doesn't take down others, and there's no persistent process to leak memory or need a `pm2 restart`. This is why `instrumentation.ts`'s `register()` hook — not a custom `server.js` — is what calls `startTelegramBot()`.

### If self-hosting instead (e.g. `next start` on a VM)

If you deploy this app somewhere other than Vercel — a VM, a container host, anything running `next start` as a long-lived process — you *can* use either mode, and a process manager becomes genuinely useful for keeping that one process alive across crashes and reboots. Two common options:

**pm2:**
```bash
npm install -g pm2
pm2 start "npm run start" --name zihad-portfolio
pm2 save            # persist the process list
pm2 startup         # print + run the OS-specific boot script so pm2 restarts it on reboot
pm2 logs zihad-portfolio     # tail logs
pm2 restart zihad-portfolio  # after a deploy
```

**systemd** (`/etc/systemd/system/zihad-portfolio.service`):
```ini
[Unit]
Description=Zihad Portfolio (Next.js + Telegram bot)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/zihad-portfolio
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/zihad-portfolio/.env.production
User=www-data

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now zihad-portfolio
sudo systemctl status zihad-portfolio
journalctl -u zihad-portfolio -f     # tail logs
```

Either mode works with either supervisor here; polling is simpler to set up (no public URL, no `setWebhook` call) but only one process may poll a given token at a time, so it doesn't horizontally scale the way webhook mode does behind a load balancer with multiple app instances.

### Graceful shutdown

`lib/telegram/start.ts` registers `SIGINT`/`SIGTERM` handlers that call `stopTelegramBot()` before the process exits — in polling mode this stops the poll loop cleanly (`bot.stop()`) instead of leaving Telegram's long-poll connection dangling; in webhook mode it's a no-op since nothing is polling. This matters for the self-hosted path above, where pm2/systemd send `SIGTERM` on every restart/redeploy — without it, a restart could occasionally overlap with an in-flight poll request. It's irrelevant to Vercel's own restart behavior, which recycles whole function invocations rather than sending signals to a persistent process.

In-memory state (login/post/settings/service conversation flows, the shared `Bot` instance) is intentionally **not** persisted — see [Architecture Overview](#9-architecture-overview). A restart mid-conversation just means the admin re-sends the command; sessions themselves survive restarts because they live in MongoDB, not memory.

---

## 13. Health Checks & Monitoring

### Health check endpoint

`GET /api/telegram/health` always returns `200` (it reports on the bot's health, but doesn't fail the site's own health check just because the bot isn't configured — see the route's own doc comment) with a small JSON body:

```json
{ "status": "ok", "configured": true, "ready": true, "mode": "webhook", "botUsername": "zihad_admin_bot" }
```

| `status` | Meaning |
|---|---|
| `unconfigured` | `TELEGRAM_BOT_TOKEN` isn't set. Expected/fine if you're not using the bot at all. |
| `starting` | Configured, but `startTelegramBot()` hasn't finished yet (e.g. right at cold start). |
| `misconfigured` | Configured but invalid — e.g. `TELEGRAM_BOT_MODE=webhook` without `TELEGRAM_WEBHOOK_URL`. Check the `error` field. |
| `ok` | Ready. In webhook mode this only confirms the app's own state, not that Telegram is actually delivering to it — pair with `getWebhookInfo` below. |

Point an uptime monitor (Vercel's own, UptimeRobot, Better Stack, etc.) at this URL if you want an alert when the bot silently stops being configured after a deploy (e.g. an env var got removed).

### Verifying Telegram's side (webhook mode)

The health endpoint only reports local state — it deliberately never calls the Telegram API (to avoid adding latency or eating into rate limits on every monitor poll). To confirm Telegram itself is delivering successfully:

```bash
npm run telegram:webhook:info
```

Check `last_error_date`/`last_error_message` in the output — a non-empty `last_error_message` means Telegram tried to deliver and failed (see [Troubleshooting](#15-troubleshooting)).

### Logs

All bot activity goes through `lib/telegram/logger.ts` (see [Logging](#8-logging)) as structured `console.log`/`console.error` lines prefixed `[telegram-bot]`. On Vercel, view these under your project → **Deployments → (latest) → Runtime Logs**, or stream them live with:

```bash
vercel logs <deployment-url> --follow
```

Every line is safe to read or export anywhere — chat IDs are masked, and credentials are never logged (see [Security Notes](#7-security-notes)).

### Critical-error alerting

`bot.ts`'s global `bot.catch()` — the last-resort handler for anything that escaped every command/callback's own error handling — calls `logCritical()` for genuine programming errors (as opposed to expected Telegram-API/network hiccups, which are logged but don't alert). `logCritical()`:

- Always logs the full error server-side first (same as `logError()`).
- If `RESEND_API_KEY` is set, also sends a one-off email alert via Resend — reusing the exact same `Resend` client + fixed-recipient pattern already used for offline-chat-message notifications in `app/api/messages/route.ts`, so no new alerting infrastructure was introduced.
- Is rate-limited to at most one email every 15 minutes, so a burst of repeated failures (e.g. MongoDB briefly down) sends one alert, not a mailbox flood.
- Never includes the bot token, admin credentials, or an unmasked chat id in the email body.

If `RESEND_API_KEY` isn't set, alerting is silently skipped — logging still happens either way, so this is optional hardening, not a requirement.

---

## 14. Deployment Checklist

Run through this whenever deploying the bot to a new environment or rotating its token:

- [ ] `TELEGRAM_BOT_TOKEN` set in the target environment (Vercel Project Settings → Environment Variables, or the host's env mechanism).
- [ ] `TELEGRAM_BOT_MODE=webhook` set for any deployed environment (`polling` is for local dev only — see [Process Management & Reliability](#12-process-management--reliability)).
- [ ] `TELEGRAM_WEBHOOK_URL` set to the exact deployed URL, e.g. `https://yourdomain.com/api/telegram/webhook` (must be HTTPS).
- [ ] `TELEGRAM_WEBHOOK_SECRET` set to a long random string (not required, but strongly recommended — without it, anyone who guesses the webhook URL can POST forged updates to it).
- [ ] `ADMIN_USERNAME`/`ADMIN_PASSWORD`, `MONGODB_URI`, and the `CLOUDINARY_*` vars are already set for the web app and don't need duplicating — the bot reuses them.
- [ ] Deploy the app.
- [ ] `npm run telegram:webhook:set` (run locally/CI, after the deploy is live).
- [ ] `npm run telegram:webhook:info` — confirm `url` matches and `last_error_message` is empty.
- [ ] `GET /api/telegram/health` returns `"status": "ok"`.
- [ ] Send `/start` and `/login` from Telegram and confirm a reply arrives within a couple of seconds.
- [ ] Run the [Manual Test Checklist](#11-manual-test-checklist) end-to-end at least once against the new deployment.
- [ ] If `RESEND_API_KEY` is set, confirm you're comfortable receiving alert emails at the hardcoded recipient in `logCritical()` (`lib/telegram/logger.ts`) — update it there if the alerting inbox should change.

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `getWebhookInfo` shows no `url`, or bot never responds | Webhook was never registered (or was cleared) | Run `npm run telegram:webhook:set` |
| Webhook route returns 404 | `TELEGRAM_BOT_MODE` isn't `webhook` in that environment, or the URL registered with Telegram doesn't match the deployed route path | Check the env var is actually set in that environment (not just `.env.local`, which doesn't deploy); confirm `TELEGRAM_WEBHOOK_URL` ends in `/api/telegram/webhook` exactly |
| `getWebhookInfo` → `last_error_message` mentions an SSL/certificate error | The webhook URL isn't served over valid HTTPS (self-signed cert, expired cert, or plain HTTP) | Use a host with a valid TLS certificate — Vercel provides this automatically for its own domains; a custom domain needs its own valid cert |
| Bot doesn't respond, but `getWebhookInfo` shows no errors and a recent `url` | The deployment itself may be failing before reaching the route, or `TELEGRAM_BOT_TOKEN` is wrong/revoked for this environment | Check `GET /api/telegram/health` — `misconfigured`/`unconfigured` points at an env var problem; also check runtime logs for the request actually arriving |
| `401 Unauthorized` from Telegram when calling `setWebhook`/`getWebhookInfo` | Wrong or revoked `TELEGRAM_BOT_TOKEN` | Get a fresh token from @BotFather (`/mybots` → your bot → API Token) and update the env var everywhere it's set |
| Webhook requests arrive but the bot ignores them / no log lines appear | `TELEGRAM_WEBHOOK_SECRET` mismatch — Telegram's `X-Telegram-Bot-Api-Secret-Token` header doesn't match what the route expects | Confirm the same value is set for `TELEGRAM_WEBHOOK_SECRET` in both the deployed env **and** whatever you passed to `setWebhook`/the CLI script |
| `409 Conflict` in logs, from Telegram | Two processes are polling the same bot token simultaneously (e.g. a leftover local `next dev` still running, or both polling and webhook configured at once) | Stop the other process, or use separate bot tokens for local dev vs. production; `deleteWebhook` before switching to polling |
| "File is too large" error when sending a photo/video to the bot | Telegram's Bot API only lets bots download files up to 20MB (`MAX_TELEGRAM_FILE_BYTES` in `lib/telegram/media.ts`) — this is a hard Telegram limit, not something this app can raise | Upload larger media from the web admin panel instead |
| `Please /login first.` immediately after a successful `/login` | Session lookup is failing — usually a `MONGODB_URI` problem, since sessions live in the `telegram_sessions` collection | Check `GET /api/telegram/health` and runtime logs for MongoDB connection errors; confirm `MONGODB_URI` is set correctly in that environment |
| Bot responds to some commands but times out on others (e.g. slow `/posts`, `/newpost` media upload) | A slow MongoDB or Cloudinary round trip inside a single serverless invocation, close to Telegram's 60-second webhook delivery timeout | Check the runtime logs for the slow call; this usually indicates a database/network issue rather than a bot bug — the bot itself does no heavy local processing |
| Not receiving critical-error alert emails | `RESEND_API_KEY` isn't set (alerting is optional), or the 15-minute cooldown suppressed a burst, or Resend itself rejected the send | Check runtime logs — `logCritical()` always logs even if the email fails; a failed send logs `Failed to send critical-error alert email` separately |
| Everything above checks out but the bot still seems broken | — | Re-run the [Manual Test Checklist](#11-manual-test-checklist) from a fresh chat (not one that was mid-flow before the fix) to rule out stale in-memory conversation state |
