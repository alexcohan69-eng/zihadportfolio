import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/client-auth'

export async function GET() {
  const user = await getServerSession()
  return NextResponse.json({ user })
}
