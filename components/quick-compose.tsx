'use client'

import { useState, useEffect } from 'react'
import { PenLine } from 'lucide-react'
import { NewPostComposer, type PostKind } from '@/components/admin/new-post-composer'

export function QuickCompose() {
  const [isAuth, setIsAuth] = useState(false)
  const [open, setOpen] = useState(false)
  const [defaultKind, setDefaultKind] = useState<PostKind>('post')

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setIsAuth(d.authenticated))
      .catch(() => setIsAuth(false))
  }, [])

  // Listen for legacy edit-post events fired from other components
  useEffect(() => {
    const handleEditEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {}
      const type: string = detail.type ?? ''
      let kind: PostKind = 'post'
      if (type === 'testimonial') kind = 'testimonial'
      else if (type === 'project' || type === 'portfolio') kind = 'project'
      setDefaultKind(kind)
      setOpen(true)
    }
    window.addEventListener('edit-post', handleEditEvent)
    return () => window.removeEventListener('edit-post', handleEditEvent)
  }, [])

  if (!isAuth) return null

  const handleSuccess = () => {
    // Refresh the page so any feed/portfolio lists update
    window.location.reload()
  }

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => { setDefaultKind('post'); setOpen(true) }}
        className="fixed bottom-24 right-5 md:bottom-28 md:right-8 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(244,162,149,0.3)] hover:shadow-[0_8px_30px_rgba(244,162,149,0.5)]"
        style={{ backgroundColor: '#f4a295', color: '#1a1a1a' }}
        aria-label="Create Post"
      >
        <PenLine size={24} strokeWidth={2.5} />
      </button>

      <NewPostComposer
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={handleSuccess}
        defaultKind={defaultKind}
        asModal={true}
      />
    </>
  )
}
