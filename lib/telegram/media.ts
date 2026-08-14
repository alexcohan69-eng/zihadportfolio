/**
 * Downloads a file the user sent to the bot (photo/video/document) from
 * Telegram's file API, then pushes it through the exact same
 * `uploadToCloudinary` pipeline the web admin panel uses for feed media —
 * so bot-uploaded media ends up organized identically (same folder, same
 * tags, same optimized-URL behavior) to anything uploaded from the browser.
 */
import type { Context } from 'grammy'
import { getTelegramConfig } from './config'
import { uploadToCloudinary, type UploadEntityType } from '@/lib/cloudinary'

const MAX_TELEGRAM_FILE_BYTES = 20 * 1024 * 1024 // Telegram Bot API's own download limit.

export interface IncomingTelegramFile {
  fileId: string
  /** Best-guess MIME type from the message (photo/video/document). */
  mimeType: string
  /** Best-guess original filename, used only for metadata/logging. */
  filename: string
}

/** Extracts the largest photo, or the video/document, from an incoming message — whichever is present. */
export function extractIncomingFile(ctx: Context): IncomingTelegramFile | null {
  const message = ctx.message
  if (!message) return null

  if (message.photo && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1]
    return { fileId: largest.file_id, mimeType: 'image/jpeg', filename: `${largest.file_unique_id}.jpg` }
  }

  if (message.video) {
    return {
      fileId: message.video.file_id,
      mimeType: message.video.mime_type ?? 'video/mp4',
      filename: message.video.file_name ?? `${message.video.file_unique_id}.mp4`,
    }
  }

  if (message.document) {
    const mimeType = message.document.mime_type ?? ''
    // Only treat documents as usable media if they're actually image/video
    // (Telegram routes "send as file" images/videos through `document`).
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
      return {
        fileId: message.document.file_id,
        mimeType,
        filename: message.document.file_name ?? message.document.file_unique_id,
      }
    }
  }

  return null
}

/**
 * Downloads `fileId` from Telegram and uploads it to Cloudinary under
 * `entityType`, returning the same URL shape the admin panel stores on
 * `FeedItem.image`/`media`.
 */
export async function downloadAndUploadTelegramFile(
  file: IncomingTelegramFile,
  entityType: UploadEntityType,
  identifier?: string,
): Promise<{ url: string; optimizedUrl: string }> {
  const { TELEGRAM_BOT_TOKEN } = getTelegramConfig()

  // ctx.api.getFile() is context-bound; callers pass us the raw fileId so
  // this helper stays a plain function, so we hit the Bot API directly here.
  const infoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${file.fileId}`)
  const info = await infoRes.json()
  if (!info.ok || !info.result?.file_path) {
    throw new Error('Could not retrieve file from Telegram.')
  }

  const filePath = info.result.file_path as string
  if (typeof info.result.file_size === 'number' && info.result.file_size > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error('File is too large (Telegram bots can only download files up to 20MB).')
  }

  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`
  const fileRes = await fetch(downloadUrl)
  if (!fileRes.ok) {
    throw new Error('Failed to download file from Telegram.')
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer())

  const result = await uploadToCloudinary(buffer, file.filename, file.mimeType, {
    entityType,
    identifier,
  })

  return { url: result.secure_url, optimizedUrl: result.optimizedUrl }
}
