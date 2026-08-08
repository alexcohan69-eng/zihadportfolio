import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDb()
    const projects = await db.collection('portfolio').find({}, { projection: { tech: 1 } }).toArray()
    const all = projects.flatMap((p) => (Array.isArray(p.tech) ? p.tech : []))
    const unique = [...new Set(all.map((t) => String(t).trim()).filter(Boolean))].sort()
    return NextResponse.json({ technologies: unique })
  } catch (error) {
    console.error('[GET /api/technologies]', error)
    return NextResponse.json({ technologies: [] })
  }
}
