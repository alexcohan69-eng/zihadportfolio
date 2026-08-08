import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'
import { getResourcesByFolder, deleteResource, optimizeUrl } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch from the root portfolio folder (all sub-folders included)
    const { resources } = await getResourcesByFolder('portfolio', 100)

    // Ensure all URLs are optimized with f_auto,q_auto
    const optimizedResources = resources.map((r: any) => ({
      ...r,
      secure_url: optimizeUrl(r.secure_url),
      url: optimizeUrl(r.url),
    }))

    return NextResponse.json({ success: true, resources: optimizedResources })
  } catch (error) {
    console.error('[media GET error]', error)
    return NextResponse.json({ error: 'Failed to fetch media from Cloudinary' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { public_id, resource_type } = await request.json()

    if (!public_id) {
      return NextResponse.json({ success: false, error: 'Public ID is required' }, { status: 400 })
    }

    await deleteResource(public_id, resource_type || 'image')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[media DELETE error]', error)
    return NextResponse.json({ success: false, error: 'Failed to delete media from Cloudinary' }, { status: 500 })
  }
}
