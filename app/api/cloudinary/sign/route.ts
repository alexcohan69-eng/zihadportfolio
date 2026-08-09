import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { isAuthenticated } from '@/lib/auth'
import { buildUploadParams, type UploadEntityType } from '@/lib/cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const dynamic = 'force-dynamic'

/**
 * Issues a short-lived signature so the browser can upload directly to
 * Cloudinary (bypassing Vercel's ~4.5MB serverless payload limit entirely).
 * The server never receives the file — only the metadata needed to sign it.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json({ error: 'Cloudinary is not configured' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const entityType = (searchParams.get('entityType') as UploadEntityType) || 'feed-media'
    const identifier = searchParams.get('identifier') || undefined

    const { folder, public_id, tags } = buildUploadParams(entityType, identifier)

    // Do NOT hardcode file size here — Cloudinary enforces size/format limits
    // on its own account-level settings, not per-signature.
    const timestamp = Math.round(Date.now() / 1000)

    const paramsToSign = {
      timestamp,
      folder,
      public_id,
      tags,
      overwrite: true,
      use_filename: true,
      unique_filename: false,
    }

    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET)

    return NextResponse.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
      public_id,
      tags,
      overwrite: true,
      use_filename: true,
      unique_filename: false,
    })
  } catch (error) {
    console.error('[Cloudinary Sign Error]', error)
    return NextResponse.json({ error: 'Failed to generate upload signature' }, { status: 500 })
  }
}
