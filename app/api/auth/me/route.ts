import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const ok = await isAuthenticated(request)
    return NextResponse.json({ authenticated: ok })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
