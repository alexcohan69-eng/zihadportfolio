'use client'

import Link from 'next/link'
import { UserCircle, ArrowRight, Info } from 'lucide-react'

export function SiteSettingsManager() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-muted border border-border">
        <Info size={28} className="text-muted-foreground" />
      </div>

      <h2 className="text-lg font-bold text-foreground mb-2">Nothing here</h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
        All profile, about, contact, and stack editing has been consolidated into the&nbsp;
        <span className="font-semibold text-foreground">Edit Profile</span> page.
      </p>

      <Link
        href="/admin/edit-profile"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-95 shadow-sm"
        style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
      >
        <UserCircle size={15} />
        Go to Edit Profile
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}
