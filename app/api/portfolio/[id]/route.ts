import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioData } from '@/lib/data-actions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await getPortfolioData()
    const project = (data.projects || []).find((p: { id: string }) => p.id === id)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(project)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
