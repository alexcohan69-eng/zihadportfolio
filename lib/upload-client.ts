/**
 * Client-side (browser) direct-to-Cloudinary upload.
 *
 * Instead of streaming the file through our Next.js API route (capped at
 * ~4.5MB on Vercel's serverless functions), we:
 *   1. Ask our server for a short-lived signature (`/api/cloudinary/sign`).
 *   2. POST the raw file straight to Cloudinary's REST API from the browser.
 *
 * The server never touches the file bytes, so uploads are only limited by
 * Cloudinary's own account limits — not Vercel's payload size.
 */

export type UploadEntityType =
  | 'profile'
  | 'portfolio-projects'
  | 'portfolio-testimonials'
  | 'feed-posts'
  | 'feed-media'

interface DirectUploadOptions {
  entityType?: UploadEntityType
  identifier?: string
  /** Called with a 0–100 value as the browser streams the file to Cloudinary. */
  onProgress?: (percent: number) => void
}

export interface DirectUploadResult {
  url: string
  secure_url: string
  public_id: string
}

interface SignatureResponse {
  signature: string
  timestamp: number
  api_key: string
  cloud_name: string
  folder: string
  public_id: string
  tags: string
  overwrite: boolean
  use_filename: boolean
  unique_filename: boolean
  error?: string
}

/** Applies Cloudinary's f_auto,q_auto delivery transform for optimal format/size. */
function optimizeUrl(url: string): string {
  if (!url || !url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/f_auto,q_auto/')
}

/**
 * Uploads a file directly to Cloudinary from the browser, bypassing all
 * Next.js/Vercel serverless payload limits. Throws with a readable message
 * on failure so callers can surface it via toast/alert.
 */
export async function uploadFileDirect(
  file: File,
  options: DirectUploadOptions = {},
): Promise<DirectUploadResult> {
  const { entityType = 'feed-media', identifier, onProgress } = options

  // 1. Get a signed payload from our server — the server never sees the file.
  const signParams = new URLSearchParams({ entityType })
  if (identifier) signParams.set('identifier', identifier)

  const signRes = await fetch(`/api/cloudinary/sign?${signParams.toString()}`)
  const sign: SignatureResponse = await signRes.json().catch(() => ({}) as SignatureResponse)

  if (!signRes.ok || !sign.signature) {
    throw new Error(sign.error || 'Failed to authorize upload')
  }

  // 2. Upload the raw file straight to Cloudinary's REST API.
  //    resource_type "auto" (in the URL) lets Cloudinary accept images,
  //    videos, and audio through the same endpoint.
  const fd = new FormData()
  fd.append('file', file)
  fd.append('api_key', sign.api_key)
  fd.append('timestamp', String(sign.timestamp))
  fd.append('signature', sign.signature)
  fd.append('folder', sign.folder)
  fd.append('public_id', sign.public_id)
  fd.append('tags', sign.tags)
  fd.append('overwrite', String(sign.overwrite))
  fd.append('use_filename', String(sign.use_filename))
  fd.append('unique_filename', String(sign.unique_filename))

  // Use XHR (instead of fetch) only when the caller wants live progress —
  // it's the only browser API that exposes upload-progress events.
  const data = onProgress
    ? await uploadWithProgress(sign.cloud_name, fd, onProgress)
    : await uploadWithFetch(sign.cloud_name, fd)

  if (data.error) {
    throw new Error(data.error?.message || `Cloudinary rejected the upload (${file.name})`)
  }

  return {
    url: optimizeUrl(data.secure_url),
    secure_url: data.secure_url,
    public_id: data.public_id,
  }
}

function uploadWithFetch(cloudName: string, fd: FormData): Promise<any> {
  return fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: fd,
  })
    .catch(() => {
      throw new Error('Network error while uploading to Cloudinary')
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}))
      if (!res.ok && !data.error) data.error = { message: 'Cloudinary rejected the upload' }
      return data
    })
}

function uploadWithProgress(
  cloudName: string,
  fd: FormData,
  onProgress: (percent: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      let data: any = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = { error: { message: 'Cloudinary returned an invalid response' } }
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        if (!data.error) data.error = { message: 'Cloudinary rejected the upload' }
      } else {
        onProgress(100)
      }
      resolve(data)
    }

    xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary'))

    xhr.send(fd)
  })
}
