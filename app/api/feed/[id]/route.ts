import { NextRequest, NextResponse } from 'next/server'
import { getFeedData } from '@/lib/data-actions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getFeedData()
    const item = (data.items || []).find((i: { id: string }) => i.id === id)
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(item, {
      headers: {
        // Allow the client (SWR) to serve a stale copy for up to 60 s while
        // revalidating in the background — no loading flash on repeat visits.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
