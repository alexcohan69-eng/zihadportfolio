'use server'

import { getDb } from '@/lib/db'
import { readFeedData, readPortfolioData, readServicesData, readSettingsData, DEFAULT_SETTINGS } from '@/lib/data'
import type { FeedItem, Project, Service, SiteSettings } from '@/lib/types'

// Re-export read helpers so server actions and route handlers share one source.
export { readFeedData as getFeedData, readPortfolioData as getPortfolioData, readServicesData as getServicesData }

// ── Utility ───────────────────────────────────────────────────────────────────

function stripId<T extends { _id?: unknown }>(doc: T): Omit<T, '_id'> {
  const { _id, ...rest } = doc
  return rest as Omit<T, '_id'>
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function generateUniqueSlug(db: Awaited<ReturnType<typeof getDb>>, title: string, excludeId?: string): Promise<string> {
  const base = slugify(title) || 'service'
  let slug = base
  let counter = 2
  while (true) {
    const existing = await db.collection('services').findOne({ slug, ...(excludeId ? { id: { $ne: excludeId } } : {}) })
    if (!existing) return slug
    slug = `${base}-${counter++}`
  }
}

// ── Feed mutations ────────────────────────────────────────────────────────────

export async function addFeedItem(
  item: Omit<FeedItem, 'id' | 'date' | 'likes' | 'replies'>,
): Promise<{ success: boolean; item?: FeedItem; error?: string }> {
  try {
    const db = await getDb()
    const newItem: FeedItem = {
      ...item,
      id: `feed-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      replies: 0,
    }
    await db.collection('feed').insertOne(newItem)
    return { success: true, item: newItem }
  } catch (error) {
    console.error('[addFeedItem]', error)
    return { success: false, error: 'Failed to add feed item' }
  }
}

export async function updateFeedItem(
  itemId: string,
  updates: Partial<FeedItem>,
): Promise<{ success: boolean; item?: FeedItem; error?: string }> {
  if (!itemId) return { success: false, error: 'Missing item ID' }
  try {
    const db = await getDb()
    const result = await db
      .collection('feed')
      .findOneAndUpdate({ id: itemId }, { $set: updates }, { returnDocument: 'after' })

    if (!result) return { success: false, error: 'Item not found' }
    return { success: true, item: stripId(result) as unknown as FeedItem }
  } catch (error) {
    console.error('[updateFeedItem]', error)
    return { success: false, error: 'Failed to update feed item' }
  }
}

export async function deleteFeedItem(
  itemId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!itemId) return { success: false, error: 'Missing item ID' }
  try {
    const db = await getDb()
    const result = await db.collection('feed').deleteOne({ id: itemId })
    if (result.deletedCount === 0) return { success: false, error: 'Item not found' }
    return { success: true }
  } catch (error) {
    console.error('[deleteFeedItem]', error)
    return { success: false, error: 'Failed to delete feed item' }
  }
}

export async function incrementFeedItemLikes(
  itemId: string,
): Promise<{ success: boolean; likes?: number; error?: string }> {
  if (!itemId) return { success: false, error: 'Missing item ID' }
  try {
    const db = await getDb()
    const result = await db
      .collection('feed')
      .findOneAndUpdate({ id: itemId }, { $inc: { likes: 1 } }, { returnDocument: 'after' })
    if (!result) return { success: false, error: 'Item not found' }
    return { success: true, likes: (result as unknown as FeedItem).likes }
  } catch (error) {
    console.error('[incrementFeedItemLikes]', error)
    return { success: false, error: 'Failed to update likes' }
  }
}

// ── Portfolio mutations ───────────────────────────────────────────────────────

export async function addPortfolioProject(
  project: Omit<Project, 'id'>,
): Promise<{ success: boolean; project?: Project; error?: string }> {
  try {
    const db = await getDb()
    const newProject: Project = { ...project, id: `proj-${Date.now()}` }
    await db.collection('portfolio').insertOne(newProject)
    return { success: true, project: newProject }
  } catch (error) {
    console.error('[addPortfolioProject]', error)
    return { success: false, error: 'Failed to add project' }
  }
}

export async function updatePortfolioProject(
  projectId: string,
  updates: Partial<Project>,
): Promise<{ success: boolean; project?: Project; error?: string }> {
  if (!projectId) return { success: false, error: 'Missing project ID' }
  try {
    const db = await getDb()
    const result = await db
      .collection('portfolio')
      .findOneAndUpdate({ id: projectId }, { $set: updates }, { returnDocument: 'after' })
    if (!result) return { success: false, error: 'Project not found' }
    return { success: true, project: stripId(result) as unknown as Project }
  } catch (error) {
    console.error('[updatePortfolioProject]', error)
    return { success: false, error: 'Failed to update project' }
  }
}

export async function deletePortfolioProject(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!projectId) return { success: false, error: 'Missing project ID' }
  try {
    const db = await getDb()
    const result = await db.collection('portfolio').deleteOne({ id: projectId })
    if (result.deletedCount === 0) return { success: false, error: 'Project not found' }
    return { success: true }
  } catch (error) {
    console.error('[deletePortfolioProject]', error)
    return { success: false, error: 'Failed to delete project' }
  }
}

// ── Service mutations ─────────────────────────────────────────────────────────

export async function addService(
  service: Omit<Service, 'id' | 'slug'>,
): Promise<{ success: boolean; service?: Service; error?: string }> {
  try {
    const db = await getDb()
    const slug = await generateUniqueSlug(db, service.title)
    const newService: Service = { ...service, id: `svc-${Date.now()}`, slug }
    await db.collection('services').insertOne(newService)
    return { success: true, service: newService }
  } catch (error) {
    console.error('[addService]', error)
    return { success: false, error: 'Failed to add service' }
  }
}

export async function updateService(
  serviceId: string,
  updates: Partial<Service>,
): Promise<{ success: boolean; service?: Service; error?: string }> {
  if (!serviceId) return { success: false, error: 'Missing service ID' }
  try {
    const db = await getDb()
    const nextUpdates = { ...updates }
    if (typeof updates.title === 'string' && updates.title.trim()) {
      nextUpdates.slug = await generateUniqueSlug(db, updates.title, serviceId)
    }
    const result = await db
      .collection('services')
      .findOneAndUpdate({ id: serviceId }, { $set: nextUpdates }, { returnDocument: 'after' })
    if (!result) return { success: false, error: 'Service not found' }
    return { success: true, service: stripId(result) as unknown as Service }
  } catch (error) {
    console.error('[updateService]', error)
    return { success: false, error: 'Failed to update service' }
  }
}

export async function deleteService(
  serviceId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!serviceId) return { success: false, error: 'Missing service ID' }
  try {
    const db = await getDb()
    const result = await db.collection('services').deleteOne({ id: serviceId })
    if (result.deletedCount === 0) return { success: false, error: 'Service not found' }
    return { success: true }
  } catch (error) {
    console.error('[deleteService]', error)
    return { success: false, error: 'Failed to delete service' }
  }
}

export async function shareServiceToFeed(
  serviceId: string,
  customCaption: string,
): Promise<{ success: boolean; item?: FeedItem; error?: string }> {
  if (!serviceId) return { success: false, error: 'Missing service ID' }
  try {
    const db = await getDb()
    const serviceDoc = await db.collection('services').findOne({ id: serviceId })
    if (!serviceDoc) return { success: false, error: 'Service not found' }
    const service = stripId(serviceDoc) as unknown as Service

    const caption = customCaption?.trim() || service.description
    const coverMedia = service.media?.[0]

    const newItem: FeedItem = {
      id: `feed-${Date.now()}`,
      type: 'post',
      title: service.title,
      excerpt: caption,
      content: caption,
      category: 'services',
      image: coverMedia,
      media: coverMedia ? [coverMedia] : [],
      author: 'Zihad Imtiase',
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      replies: 0,
      link: `/services/${service.slug}`,
    }

    await db.collection('feed').insertOne(newItem)
    return { success: true, item: newItem }
  } catch (error) {
    console.error('[shareServiceToFeed]', error)
    return { success: false, error: 'Failed to share service to feed' }
  }
}

export async function addServiceOrder(
  order: Omit<import('@/lib/types').ServiceOrder, 'id' | 'submittedAt'>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb()
    await db.collection('orders').insertOne({
      ...order,
      id: `order-${Date.now()}`,
      submittedAt: new Date().toISOString(),
    })
    return { success: true }
  } catch (error) {
    console.error('[addServiceOrder]', error)
    return { success: false, error: 'Failed to save order' }
  }
}

// ── Category mutations ────────────────────────────────────────────────────────

export async function getCategories(): Promise<string[]> {
  try {
    const db = await getDb()
    const docs = await db.collection('categories').find({}).sort({ name: 1 }).toArray()
    return docs.map((d) => d.name as string)
  } catch (error) {
    console.error('[getCategories]', error)
    return []
  }
}

export async function addCategory(
  name: string,
): Promise<{ success: boolean; name?: string; error?: string }> {
  if (!name) return { success: false, error: 'Category name is required' }
  try {
    const db = await getDb()
    const existing = await db.collection('categories').findOne({ name })
    if (existing) return { success: false, error: 'Category already exists' }
    await db.collection('categories').insertOne({ name, createdAt: new Date().toISOString() })
    return { success: true, name }
  } catch (error) {
    console.error('[addCategory]', error)
    return { success: false, error: 'Failed to add category' }
  }
}

// ── Settings mutation ─────────────────────────────────────────────────────────

const SETTINGS_ID = 'site_settings'

export async function updateSettings(
  updates: Partial<SiteSettings>,
): Promise<{ success: boolean; settings?: SiteSettings; error?: string }> {
  try {
    const current = await readSettingsData()
    const next: SiteSettings = {
      hero: { ...current.hero, ...(updates.hero ?? {}) },
      about: { ...current.about, ...(updates.about ?? {}) },
      contact: { ...current.contact, ...(updates.contact ?? {}) },
      meta: { ...current.meta, ...(updates.meta ?? {}) },
    }

    const db = await getDb()
    await db
      .collection('settings')
      .updateOne(
        { _id: SETTINGS_ID as unknown as undefined },
        { $set: next },
        { upsert: true },
      )

    return { success: true, settings: next }
  } catch (error) {
    console.error('[updateSettings]', error)
    return { success: false, error: 'Failed to save settings' }
  }
}
