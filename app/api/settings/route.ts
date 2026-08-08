import { NextRequest, NextResponse } from 'next/server'
import { readSettingsData } from '@/lib/data'
import { updateSettings } from '@/lib/data-actions'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  try {
    const settings = await readSettingsData()
    return NextResponse.json(settings)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const updates = await req.json()
    const result = await updateSettings(updates)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, settings: result.settings })
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
