import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { readSettingsData } from '@/lib/data'
import { EditProfilePage } from '@/components/admin/edit-profile-page'
import type { NextRequest } from 'next/server'

export default async function AdminEditProfilePage() {
  // Build a minimal NextRequest-compatible object from the cookie store
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  // Reconstruct the Cookie header string for isAuthenticated
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join('; ')

  // isAuthenticated expects a NextRequest — craft a minimal one
  const fakeReq = new Request('http://localhost', {
    headers: { cookie: cookieHeader },
  }) as unknown as NextRequest
  // Attach cookies getter that isAuthenticated uses
  ;(fakeReq as any).cookies = {
    get: (name: string) => allCookies.find((c) => c.name === name),
  }

  const authenticated = await isAuthenticated(fakeReq as NextRequest)
  if (!authenticated) {
    redirect('/admin')
  }

  const settings = await readSettingsData()

  return <EditProfilePage settings={settings} />
}
