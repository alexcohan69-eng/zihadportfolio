import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const isAuth = await isAuthenticated(request)
    return NextResponse.json({ authenticated: !!isAuth })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}