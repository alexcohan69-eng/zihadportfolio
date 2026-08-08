import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { CLIENT_SESSION_COOKIE } from '@/lib/client-auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(CLIENT_SESSION_COOKIE)
  return NextResponse.json({ success: true })
}
