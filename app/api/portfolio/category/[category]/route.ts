import { NextRequest, NextResponse } from 'next/server'
import { getPortfolioData } from '@/lib/data-actions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params
    const exclude = request.nextUrl.searchParams.get('exclude')
    
    const data = await getPortfolioData()
    const projects = (data.projects || []).filter(
      (p: { category: string; id: string }) =>
        p.category.toLowerCase() === category.toLowerCase() &&
        (!exclude || p.id !== exclude)
    )
    
    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
