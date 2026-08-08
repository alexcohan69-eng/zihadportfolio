import { NextRequest, NextResponse } from 'next/server'
import { readServicesData } from '@/lib/data'
import { addService } from '@/lib/data-actions'
import { isAuthenticated } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const wantsAll = request.nextUrl.searchParams.get('all') === 'true'
    const authed = wantsAll && (await isAuthenticated(request))
    const data = await readServicesData({ activeOnly: !authed })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    if (!body?.title?.trim() || !body?.description?.trim()) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }
    const payload = {
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      price: String(body.price ?? '').trim(),
      deliveryTime: String(body.deliveryTime ?? '').trim(),
      features: Array.isArray(body.features) ? body.features.filter(Boolean).map(String) : [],
      media: Array.isArray(body.media) ? body.media.filter(Boolean).map(String) : [],
      isActive: body.isActive !== false,
      linkedTestimonials: Array.isArray(body.linkedTestimonials)
        ? body.linkedTestimonials.filter(Boolean).map(String)
        : [],
    }
    const result = await addService(payload)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add service' }, { status: 500 })
  }
}
