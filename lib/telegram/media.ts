/**
 * Downloads a file the admin sent to the bot (photo/video) from Telegram's
 * file servers and re-uploads it through the SAME `uploadToCloudinary`
 * pipeline the web admin composer uses — so media created via the bot
 * lives in the same folders/tags and renders identically on the site.
 */
import type { Bot } from 'grammy'
import { uploadToCloudinary } from '@/lib/cloudinary'

export async function uploadTelegramFileToCloudinary(
  bot: Bot,
  fileId: string,
  identifier: string,
): Promise<string> {
  const file = await bot.api.getFile(fileId)
  if (!file.file_path) {
    throw new Error('Telegram did not return a file path for this file')
  }

  const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to download file from Telegram (status ${response.status})`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const ext = file.file_path.split('.').pop()?.toLowerCase() ?? 'jpg'
  const mimeType = ext === 'mp4' ? 'video/mp4' : ext === 'png' ? 'image/png' : 'image/jpeg'

  const result = await uploadToCloudinary(buffer, `telegram-${identifier}.${ext}`, mimeType, {
    entityType: 'feed-posts',
    identifier,
  })

  return result.secure_url
}
