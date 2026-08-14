/**
 * Centralized TypeScript interfaces — single source of truth.
 * Import from here instead of redefining in individual components/routes.
 */

// ── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedComment {
  id: string
  name: string
  avatar: string
  text: string
  date: string
}

export interface FeedItem {
  id: string
  type: 'testimonial' | 'project' | 'post'
  title: string
  excerpt: string
  content: string
  category: string
  image?: string
  media?: string[]
  author: string
  clientName?: string
  clientRole?: string
  clientImage?: string
  date: string
  likes: number
  replies: number
  rating?: number
  tech?: string[]
  link?: string
  featured?: boolean
  linkedProjectId?: string
  pinned?: boolean
  comments?: FeedComment[]
  /**
   * Publish state. Optional and defaults to published behavior when absent
   * so existing items (created before this field existed) are unaffected.
   * Introduced for the Telegram bot's draft/publish step; the web admin
   * panel does not yet expose a UI for it.
   */
  status?: 'draft' | 'published'
}

// ── Services ───────────────────────────────────────────────────────────────────

export interface Service {
  id: string
  slug: string
  title: string
  description: string
  price: string
  deliveryTime: string
  features: string[]
  media: string[]
  isActive: boolean
  linkedTestimonials?: string[]
  /** Populated at read time from `linkedTestimonials` — never persisted directly. */
  testimonials?: FeedItem[]
}

export interface ServiceOrder {
  id: string
  serviceId: string
  serviceTitle: string
  name: string
  email: string
  details: string
  submittedAt: string
  clientId?: string
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled'
}

/** Alias used by the Agency SaaS layer — same shape as ServiceOrder. */
export type Order = ServiceOrder

// ── Agency SaaS: Accounts & Messaging ───────────────────────────────────────────

export interface User {
  id: string
  role: 'admin' | 'client'
  name: string
  email: string
  /** PBKDF2 password hash — never returned to the client. */
  passwordHash: string
  salt: string
  createdAt: string
  /** URL of the user's profile picture, uploaded via the media library. */
  avatar?: string
}

/** Safe subset of `User` for client-side/session use — never includes hash/salt. */
export interface SessionUser {
  id: string
  role: 'admin' | 'client'
  name: string
  email: string
  avatar?: string
}

export interface Message {
  id: string
  orderId: string
  senderId: string
  senderRole: 'admin' | 'client'
  senderName: string
  text: string
  media?: string[]
  createdAt: string
  read: boolean
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface ContentBlock {
  id: string
  type: 'paragraph' | 'heading' | 'image' | 'divider'
  text?: string
  url?: string
  caption?: string
}

export interface Project {
  id: string
  title: string
  category: string
  description: string
  tech: string[]
  results: Record<string, string>
  link?: string
  github?: string
  image?: string
  images?: string[]
  content?: ContentBlock[]
  featured: boolean
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface TimelineItem {
  year: string
  title: string
  place: string
  desc: string
}

export interface StackItem {
  name: string
  level: number
}

export interface ValueItem {
  title: string
  desc: string
}

export interface SocialItem {
  platform: string
  url: string
}

export interface HeroSettings {
  coverMedia: string
  profileMedia: string
  // Composite name fields — firstName + lastName populate `name`
  firstName: string
  lastName: string
  nickname: string
  name: string
  title: string
  bio: string
  tags: string[]
  // Location split
  country: string
  city: string
  location: string
  joinDate: string
  stats: { value: string; label: string }[]
  hireMeLink: string
  profileButtonText: string
  profileButtonLink: string
  // Global identity shown on the author header of every feed post
  feedAuthorName: string
  feedAuthorMedia: string
}

export interface AboutSettings {
media: string[]
introText: string
timeline: TimelineItem[]
stack: StackItem[]
values: ValueItem[]
aboutVideoAutoplay: boolean
aboutVideoControls: boolean
aboutVideoMuted: boolean
}

export interface ContactSettings {
  email: string
  phone: string
  whatsapp: string
  address: string
  shortText: string
  contactHeading: string
  contactSubHeading: string
  socials: SocialItem[]
}

export interface MetaSettings {
  title: string
  description: string
  favicon: string
}

export interface SiteSettings {
  hero: HeroSettings
  about: AboutSettings
  contact: ContactSettings
  meta: MetaSettings
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthStatus {
  authenticated: boolean
}

// ── API Responses ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = undefined> {
  success: boolean
  error?: string
  data?: T
}

export interface FeedApiResponse {
  items: FeedItem[]
}

export interface PortfolioApiResponse {
  projects: Project[]
}
