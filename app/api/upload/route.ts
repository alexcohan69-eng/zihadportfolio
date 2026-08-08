import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { uploadToCloudinary, optimizeUrl, type UploadEntityType } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityType = (formData.get('entityType') as UploadEntityType) || 'feed-media'
    const identifier = (formData.get('identifier') as string | null) || undefined
    const format = (formData.get('format') as string | null) || 'original'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const supportedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'audio/mpeg']
    if (!supportedMimes.includes(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 })
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Use the centralized upload utility with duplicate prevention & organization
    const result = await uploadToCloudinary(buffer, file.name, file.type, {
      entityType,
      identifier,
      format: format as 'webp' | 'avif' | 'original',
      overwrite: true, // Prevent duplicates by reusing the same public_id
    })

    return NextResponse.json({
      success: true,
      url: result.optimizedUrl, // Always return the optimized URL with f_auto,q_auto
      secure_url: result.secure_url,
      public_id: result.public_id,
    })
  } catch (error) {
    console.error('[Upload API Error]', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
