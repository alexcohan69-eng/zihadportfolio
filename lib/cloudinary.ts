import crypto from 'crypto'
import { v2 as cloudinary, UploadApiOptions } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Entity type → folder mapping for Cloudinary organization.
 * Folders are automatically prefixed with 'portfolio/' for clean separation.
 */
export type UploadEntityType =
  | 'profile'
  | 'portfolio-projects'
  | 'portfolio-testimonials'
  | 'feed-posts'
  | 'feed-media'

interface UploadOptions {
  entityType: UploadEntityType
  identifier?: string // Entity name/ID for deterministic public_id (prevents duplicates)
  format?: 'webp' | 'avif' | 'original'
  overwrite?: boolean // Allow replacing an existing resource with the same public_id
}

/**
 * Maps entity type to folder path.
 */
function getFolderPath(entityType: UploadEntityType): string {
  const folderMap: Record<UploadEntityType, string> = {
    'profile': 'portfolio/profile',
    'portfolio-projects': 'portfolio/projects',
    'portfolio-testimonials': 'portfolio/testimonials',
    'feed-posts': 'portfolio/feed/posts',
    'feed-media': 'portfolio/feed/media',
  }
  return folderMap[entityType]
}

/**
 * Maps entity type to tag(s) for Cloudinary Collections.
 */
function getTags(entityType: UploadEntityType): string[] {
  const tagMap: Record<UploadEntityType, string[]> = {
    'profile': ['portfolio', 'profile', 'hero'],
    'portfolio-projects': ['portfolio', 'projects', 'work'],
    'portfolio-testimonials': ['portfolio', 'testimonials', 'reviews'],
    'feed-posts': ['portfolio', 'feed', 'posts', 'articles'],
    'feed-media': ['portfolio', 'feed', 'media', 'attachments'],
  }
  return tagMap[entityType]
}

/**
 * Generates a deterministic public_id using SHA256 hash.
 * If two identical files are uploaded with the same identifier, they'll get the same public_id.
 * Combined with `overwrite: true`, this prevents storage duplication.
 */
function generatePublicId(entityType: UploadEntityType, identifier?: string): string {
  if (!identifier) {
    // No identifier = generate a random one (allows multiple uploads)
    return `${entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Slugify identifier + hash for deterministic, collision-resistant naming
  const slug = identifier
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Hash the full string for uniqueness while keeping public_id readable
  const hash = crypto
    .createHash('sha256')
    .update(`${entityType}:${slug}`)
    .digest('hex')
    .slice(0, 8)

  return `${entityType}/${slug}_${hash}`
}

/**
 * Appends Cloudinary optimization parameters for automatic format & quality selection.
 * This ensures modern image delivery across all browsers.
 */
export function optimizeUrl(url: string): string {
  if (!url || !url.includes('cloudinary.com')) return url
  // Insert transformation params before filename
  // e.g., https://res.cloudinary.com/cloud/image/upload/v123/folder/file.jpg
  //    → https://res.cloudinary.com/cloud/image/upload/f_auto,q_auto/v123/folder/file.jpg
  return url.replace('/upload/', '/upload/f_auto,q_auto/')
}

/**
 * High-performance Cloudinary upload with duplicate prevention, organization, and optimization.
 *
 * @param buffer - File buffer to upload
 * @param filename - Original filename (for metadata)
 * @param mimeType - MIME type
 * @param options - Upload options (entityType, identifier, format, overwrite)
 * @returns Object with { url, optimizedUrl, public_id, secure_url }
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  options: UploadOptions,
): Promise<{
  url: string
  optimizedUrl: string
  public_id: string
  secure_url: string
  original_filename: string
}> {
  const { entityType, identifier, format = 'original', overwrite = true } = options

  const folder = getFolderPath(entityType)
  const tags = getTags(entityType)
  const public_id = generatePublicId(entityType, identifier)

  // Build upload options
  const uploadOpts: UploadApiOptions = {
    folder,
    public_id, // Deterministic naming for duplicate prevention
    overwrite, // Replace if exists (efficient for retries)
    tags, // Organize into Cloudinary Collections
    resource_type: 'auto',
    use_filename: true,
    unique_filename: false, // We control naming via public_id
  }

  // Apply format conversion only if it's an image and not 'original'
  const isImage = mimeType.startsWith('image/')
  if (isImage && format !== 'original') {
    uploadOpts.format = format
    uploadOpts.quality = 'auto' // Intelligent compression
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOpts, (error, result) => {
      if (error) {
        reject(new Error(`Cloudinary upload failed: ${error.message}`))
      } else if (result) {
        const optimizedUrl = optimizeUrl(result.secure_url)
        resolve({
          url: result.url,
          optimizedUrl,
          public_id: result.public_id,
          secure_url: result.secure_url,
          original_filename: result.original_filename,
        })
      } else {
        reject(new Error('Cloudinary upload returned no result'))
      }
    })

    stream.end(buffer)
  })
}

/**
 * Fetch all resources by tags, with optimization params applied to all URLs.
 */
export async function getResourcesByTag(tag: string, maxResults = 100) {
  const result = await cloudinary.search
    .expression(`tags:${tag}`)
    .sort_by('created_at', 'desc')
    .max_results(maxResults)
    .execute()

  return {
    resources: result.resources?.map((r: any) => ({
      ...r,
      secure_url: optimizeUrl(r.secure_url),
      url: optimizeUrl(r.url),
    })) || [],
  }
}

/**
 * Fetch all resources in a folder, with optimization params applied.
 */
export async function getResourcesByFolder(folder: string, maxResults = 100) {
  const result = await cloudinary.search
    .expression(`folder:${folder}`)
    .sort_by('created_at', 'desc')
    .max_results(maxResults)
    .execute()

  return {
    resources: result.resources?.map((r: any) => ({
      ...r,
      secure_url: optimizeUrl(r.secure_url),
      url: optimizeUrl(r.url),
    })) || [],
  }
}

/**
 * Delete a resource by public_id.
 */
export async function deleteResource(public_id: string, resource_type = 'image') {
  return cloudinary.uploader.destroy(public_id, { resource_type })
}
