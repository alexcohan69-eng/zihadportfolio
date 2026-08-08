# Zihad Imtiase — Portfolio & Personal Site

A full-stack personal portfolio built with **Next.js 16 App Router**, **MongoDB**, and **Cloudinary**. Every word, image, and link on the public site is managed from a private admin panel — no code edits needed.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [How the Data Layer Works](#3-how-the-data-layer-works)
4. [Environment Variables](#4-environment-variables)
5. [Authentication & Security](#5-authentication--security)
6. [Public Pages](#6-public-pages)
7. [Admin Panel](#7-admin-panel)
8. [Site Settings — Field-by-Field Guide](#8-site-settings--field-by-field-guide)
9. [Feed Posts — How to Create & Edit](#9-feed-posts--how-to-create--edit)
10. [Portfolio Projects — How to Create & Edit](#10-portfolio-projects--how-to-create--edit)
11. [Image & Video Uploads](#11-image--video-uploads)
12. [Adding a New Page](#12-adding-a-new-page)
13. [Adding a New Editable Field](#13-adding-a-new-editable-field)
14. [Common Errors & Fixes](#14-common-errors--fixes)
15. [Deployment Checklist](#15-deployment-checklist)

---

## 1. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Components, file-based routing, RSC |
| Database | MongoDB Atlas | Flexible document store for dynamic content |
| Media CDN | Cloudinary | Auto-format, auto-compress, CDN delivery |
| Styling | Tailwind CSS v4 | Utility-first, design tokens in `globals.css` |
| Auth | Custom HMAC-SHA-256 | Lightweight, no third-party SDK needed |
| Icons | Lucide React | Consistent, tree-shakable icon set |
| Deployment | Vercel | Zero-config Next.js hosting |

---

## 2. Project Structure

```
/
├── app/                         # All routes (Next.js App Router)
│   ├── page.tsx                 # Homepage — fetches feed + settings from DB
│   ├── about/page.tsx           # About page
│   ├── contact/page.tsx         # Contact page
│   ├── portfolio/               # Portfolio list + individual project pages
│   ├── feed/                    # Feed item detail pages
│   ├── login/page.tsx           # Admin login form
│   ├── admin/                   # Admin panel (protected by middleware)
│   │   ├── layout.tsx           # Admin shell: sidebar, header, mobile nav
│   │   ├── page.tsx             # Admin dashboard home
│   │   ├── feed/page.tsx        # Manage feed posts
│   │   ├── portfolio/page.tsx   # Manage portfolio projects
│   │   └── site-settings/       # Manage all site-wide content
│   └── api/                     # API Route Handlers
│       ├── auth/                # login / logout / me / status
│       ├── feed/                # CRUD for feed items
│       ├── portfolio/           # CRUD for projects
│       ├── settings/            # Read / write site settings
│       ├── upload/              # Cloudinary upload proxy
│       ├── interact/            # Like / reply interactions
│       ├── media/               # Media library listing
│       └── contact/             # Contact form submission
│
├── components/
│   ├── admin/                   # Admin-only UI components
│   │   ├── site-settings-manager.tsx   # Full settings form
│   │   ├── feed-manager.tsx            # Feed CRUD UI
│   │   ├── portfolio-manager.tsx       # Portfolio CRUD UI
│   │   ├── media-picker-modal.tsx      # Browse uploaded media
│   │   ├── image-cropper-modal.tsx     # In-browser image crop
│   │   └── shared.tsx                  # ToastStack, UploadFormatPicker
│   ├── profile-hero.tsx         # Homepage hero with name, bio, email, stats
│   ├── nav-sidebar.tsx          # Desktop left nav
│   ├── mobile-nav.tsx           # Bottom mobile nav
│   ├── mobile-topbar.tsx        # Mobile top bar
│   ├── page-shell.tsx           # Layout wrapper (sidebar + main)
│   ├── home-client.tsx          # Client wrapper for homepage feed + filters
│   ├── feed-item.tsx            # Single feed card
│   ├── quick-compose.tsx        # Quick post button (admin only, client-side)
│   └── post-interactions.tsx    # Like + reply buttons
│
├── lib/
│   ├── types.ts        # ALL shared TypeScript interfaces (single source of truth)
│   ├── db.ts           # MongoDB singleton connection
│   ├── data.ts         # Read-only DB helpers (Server Components safe)
│   ├── data-actions.ts # Write mutations as Next.js Server Actions
│   ├── auth.ts         # HMAC session token + isAuthenticated helper
│   └── utils.ts        # cn() Tailwind class merge utility
│
├── hooks/
│   └── use-toast.ts    # Shared toast state hook (used by all admin managers)
│
├── middleware.ts        # Protects all /admin routes server-side
└── next.config.mjs     # Security headers, image config, Server Actions size limit
```

---

## 3. How the Data Layer Works

The data flow is simple and intentional:

```
Browser Request
     │
     ▼
Next.js Server Component (app/page.tsx, app/about/page.tsx, etc.)
     │  calls
     ▼
lib/data.ts  ──────────► MongoDB Atlas (reads only)
     │ returns typed data
     ▼
React Component tree renders with real data

─────────────────────────────────────────────

Admin saves a change
     │
     ▼
Admin Component (e.g. SiteSettingsManager)
     │  calls fetch('/api/settings', { method: 'POST' })
     ▼
API Route (app/api/settings/route.ts)
     │  calls
     ▼
lib/data-actions.ts  ──► MongoDB Atlas (writes)
```

**Key rule:** `lib/data.ts` is for **reading** (safe in any Server Component). `lib/data-actions.ts` is for **writing** (used by API routes and Server Actions). Never import `data-actions.ts` directly from a client component.

### MongoDB Collections

| Collection | What it stores |
|---|---|
| `feed` | All feed posts (articles, testimonials, project posts) |
| `portfolio` | Portfolio projects |
| `settings` | One document with `_id: "site_settings"` containing hero, about, contact, meta sections |

---

## 4. Environment Variables

Set these in your Vercel project dashboard under **Settings → Environment Variables**:

```env
# MongoDB connection string from MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/

# Cloudinary credentials (for image/video uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin login credentials
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
```

**Local development:** Copy these into `.env.local` at the project root. Never commit `.env.local` to git.

---

## 5. Authentication & Security

### How Login Works

1. You submit username + password at `/login`.
2. The server (`/api/auth/login`) computes `HMAC-SHA-256(username:password)` keyed by your `ADMIN_PASSWORD`.
3. The resulting token is stored in a `HttpOnly; Secure; SameSite=Strict` cookie named `admin_session`.
4. Every subsequent request to `/admin/*` is checked by `middleware.ts` — it recomputes the HMAC and compares using constant-time `safeEqual` to prevent timing attacks.
5. The client sidebar uses `/api/auth/me` to show/hide the admin back-button, also validated via the same HMAC check.

### Changing Your Admin Password

Update `ADMIN_PASSWORD` in your Vercel environment variables and redeploy. The old session cookie will automatically become invalid because the HMAC will no longer match.

### Security Headers

`next.config.mjs` applies these headers to every response:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: SAMEORIGIN`

---

## 6. Public Pages

| URL | What renders |
|---|---|
| `/` | Homepage with profile hero, feed filter tabs, and feed list |
| `/about` | About page with timeline, tech stack, values |
| `/portfolio` | Portfolio grid |
| `/portfolio/[id]` | Individual project detail |
| `/portfolio/category/[slug]` | Portfolio filtered by category |
| `/feed/[id]` | Individual feed item detail |
| `/feed/category/[slug]` | Feed filtered by category |
| `/contact` | Contact form |

All data for these pages is fetched **server-side at request time** (`export const dynamic = 'force-dynamic'`), so changes you make in the admin panel appear immediately on the next page load — no rebuild needed.

---

## 7. Admin Panel

### Accessing the Admin Panel

1. Navigate to `/login`
2. Enter your `ADMIN_USERNAME` and `ADMIN_PASSWORD`
3. You are redirected to `/admin`

### Admin Sections

| Section | URL | What you can do |
|---|---|---|
| Feed Posts | `/admin/feed` | Create, edit, reorder, delete all feed items |
| Portfolio | `/admin/portfolio` | Create, edit, delete portfolio projects |
| Site Settings | `/admin/site-settings` | Edit every piece of text, image, and link on the site |

### Logging Out

Click the **Log out** button in the top-right of the admin header. Your session cookie is deleted and you are redirected to `/login`.

---

## 8. Site Settings — Field-by-Field Guide

Go to `/admin/site-settings`. Changes save to the `settings` MongoDB collection instantly.

### Hero Section
Controls everything visible in the homepage hero card.

| Field | What it does |
|---|---|
| Cover Media | Background banner image or video on the homepage hero |
| Profile Media | Your avatar/profile picture |
| Name | Your display name (large heading) |
| Title | One-line job title below your name |
| Bio | Short paragraph about you |
| Tags | Hashtags shown in orange after the bio (one per line, `#` is added automatically) |
| Location | Shown with a pin icon below the bio |
| Join Date | Shown with a calendar icon (e.g. "Joined March 2022") |
| Stats | Up to 3 number/label pairs (e.g. "50+ Projects") |
| Hire Me Link | URL for the Hire Me button — use `/contact`, `mailto:`, or a WhatsApp `https://wa.me/` link |

### About Section
Controls the `/about` page.

| Field | What it does |
|---|---|
| Media | Images shown in the about page gallery |
| Intro Text | The main paragraph at the top of the about page |
| Timeline | Career/education history — year, title, place, description |
| Tech Stack | Skills list — name and proficiency level (0–100) |
| Values | Three value cards — title and description each |

### Contact Section

| Field | What it does |
|---|---|
| Email | Shown in the homepage hero below location, and on the contact page |
| Phone | Shown on the contact page |
| Address | Shown on the contact page |
| Short Text | A one-liner displayed on the contact page under the heading |
| Socials | Platform name + URL — rendered as icon links on the contact page |

### Meta Section
Controls SEO and browser tab appearance.

| Field | What it does |
|---|---|
| Site Title | Browser tab title and `<title>` tag |
| Description | Meta description for search engines |
| Favicon | URL to your favicon image |

---

## 9. Feed Posts — How to Create & Edit

Go to `/admin/feed`.

### Post Types

| Type | Use it for |
|---|---|
| `article` | Blog posts, writeups, long-form content |
| `post` | Short social-style updates |
| `testimonial` | Client reviews — includes client name, role, avatar, rating |
| `project` | Project showcase posts — can link to a portfolio project |

### Creating a Post

1. Click **New Post** (top-right).
2. Choose a type from the dropdown.
3. Fill in the fields — only **Title** and **Category** are required.
4. Upload a cover image using the upload button (images are auto-converted to WebP unless you change the format picker).
5. Click **Save**.

### Editing a Post

Click the pencil icon on any post card to open the edit form. Make your changes and click **Save**.

### Deleting a Post

Click the trash icon. A confirmation prompt appears before deletion.

### Reordering Posts

Drag the grip handle on the left of any post card to reorder. The new order is saved automatically.

### Image Format Picker

The **Image Upload Format** selector at the top of the Feed manager applies to all uploads in that session:
- **WebP** (default) — best balance of quality and file size
- **AVIF** — maximum compression, slightly slower
- **Original** — no conversion, uploads as-is

---

## 10. Portfolio Projects — How to Create & Edit

Go to `/admin/portfolio`.

### Creating a Project

1. Click **New Project**.
2. Fill in Title, Category, and Description.
3. Add tech stack tags (press Enter after each one).
4. Add result metrics as key/value pairs (e.g. "Conversion Rate" / "+32%").
5. Upload a cover image and optionally a gallery of additional images.
6. Add a live link or GitHub link.
7. Toggle **Featured** to pin the project at the top of the portfolio grid.
8. Click **Save**.

### Rich Content Blocks

Each project has a **Content** section where you can add:
- `paragraph` — a block of text
- `heading` — a section title
- `image` — an image with optional caption
- `divider` — a horizontal rule

These render on the individual project detail page (`/portfolio/[id]`).

---

## 11. Image & Video Uploads

All media is uploaded to **Cloudinary** through the `/api/upload` route. The upload route:
- Accepts any file type (images, video, audio)
- Converts images to WebP or AVIF automatically (based on the format picker)
- Returns a `secure_url` from Cloudinary's CDN

### Media Picker

When editing any field that requires a URL (cover image, gallery, profile photo, etc.), you can either:
1. **Upload a new file** — click the upload button, select a file
2. **Pick from existing media** — click the gallery icon to open the Media Picker modal, which lists all previously uploaded files

### Supported Formats

Images: JPG, PNG, GIF, WebP, AVIF, SVG
Video: MP4, WebM, MOV
Audio: MP3, WAV, OGG

---

## 12. Adding a New Page

1. Create a file at `app/your-page/page.tsx`.
2. If the page needs data from the database, import from `lib/data.ts`:

```tsx
import { readSettingsData } from '@/lib/data'

export const dynamic = 'force-dynamic'

export default async function YourPage() {
  const settings = await readSettingsData()
  return <div>{settings.hero.name}</div>
}
```

3. To add it to the sidebar navigation, edit `components/nav-sidebar.tsx` and add a new entry to the `NAV_ITEMS` array.

---

## 13. Adding a New Editable Field

Example: adding a `tagline` field to the Hero section.

**Step 1 — Add to the TypeScript interface** (`lib/types.ts`):
```ts
export interface HeroSettings {
  // ...existing fields...
  tagline: string  // add this
}
```

**Step 2 — Add the default value** (`lib/data.ts`, `DEFAULT_SETTINGS`):
```ts
hero: {
  // ...existing defaults...
  tagline: 'Available for freelance work',
}
```

**Step 3 — Add the form field** (`components/admin/site-settings-manager.tsx`):
Inside the Hero section of the form, add:
```tsx
<label className="block">
  <span className="text-xs font-medium text-muted-foreground">Tagline</span>
  <input
    value={settings.hero.tagline}
    onChange={(e) => updateField('hero', 'tagline', e.target.value)}
    className="mt-1 w-full ..."
  />
</label>
```

**Step 4 — Use it in the component** (`components/profile-hero.tsx`):
```tsx
const tagline = heroData.tagline || ''
// then in JSX:
{tagline && <p className="text-sm text-muted-foreground">{tagline}</p>}
```

That is the full cycle — type → default → admin form → display.

---

## 14. Common Errors & Fixes

### "Please define the MONGODB_URI environment variable"
You have not set `MONGODB_URI`. Add it to `.env.local` locally or to Vercel environment variables for production.

### "Invalid MONGODB_URI format"
Your URI has extra quote characters. Check that the value in your environment variable does not have leading/trailing `"` or `'` characters.

### Admin page redirects to `/login` even after logging in
Your `ADMIN_USERNAME` or `ADMIN_PASSWORD` environment variables are not set, or the values differ between when you logged in and the current deployment. Update the env vars and redeploy.

### Upload fails with "Failed to upload"
Your Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are missing or incorrect. Check them in your Vercel dashboard.

### Changes in admin don't appear on the public site
The public pages use `export const dynamic = 'force-dynamic'` which bypasses the cache. Try a hard refresh (`Ctrl+Shift+R`). If the problem persists, check the Vercel function logs for DB errors.

### Image shows a broken link
The media URL stored in the database is from a deleted Cloudinary asset. Re-upload the image in the admin panel and save again.

---

## 15. Deployment Checklist

Before going live on Vercel, verify:

- [ ] `MONGODB_URI` is set and points to your Atlas cluster
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are set
- [ ] `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set to strong values
- [ ] MongoDB Atlas Network Access allows connections from `0.0.0.0/0` (Vercel uses dynamic IPs)
- [ ] Cloudinary upload preset is set to **unsigned** or you are using API-key signed uploads (current setup uses signed uploads via the API secret)
- [ ] Site Settings are filled in via `/admin/site-settings` so the public site has real content
- [ ] At least one Feed post and one Portfolio project are created

---

*Built and maintained by Zihad Imtiase. For questions, open an issue on the GitHub repository.*
