'use client'

import { useState, useEffect, useRef, useCallback, FormEvent } from 'react'
import { Send, Paperclip, Loader2, X, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MediaPickerModal } from '@/components/admin/media-picker-modal'
import type { Message } from '@/lib/types'

const POLL_INTERVAL_MS = 4_000

interface ChatWidgetProps {
  orderId: string
  currentRole: 'admin' | 'client'
  currentSenderName: string
  /** Accent color for the current sender's own bubbles (defaults to brand pink). */
  accent?: string
  className?: string
}

export function ChatWidget({ orderId, currentRole, currentSenderName, accent = '#f4a295', className }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [pendingMedia, setPendingMedia] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?orderId=${encodeURIComponent(orderId)}`)
      const data = await res.json()
      if (Array.isArray(data.messages)) setMessages(data.messages)
    } catch {
      // Silent — polling retries on the next interval.
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (!orderId) return
    fetchMessages()
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [orderId, fetchMessages])

  // Admin heartbeat — lets the messages API know the admin is actively viewing chat.
  useEffect(() => {
    if (currentRole !== 'admin') return
    const ping = () => fetch('/api/presence', { method: 'POST' }).catch(() => {})
    ping()
    const interval = setInterval(ping, 60_000)
    return () => clearInterval(interval)
  }, [currentRole])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() && pendingMedia.length === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, text: text.trim() || '📎 Attachment', media: pendingMedia }),
      })
      if (res.ok) {
        setText('')
        setPendingMedia([])
        fetchMessages()
      }
    } finally {
      setSending(false)
    }
  }

  if (!orderId) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 h-64 text-muted-foreground', className)}>
        <MessageCircle size={28} className="opacity-30" />
        <p className="text-sm">Select an order to start chatting.</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col rounded-2xl border border-border bg-card overflow-hidden', className)}>
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 min-h-64 max-h-[420px] overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageCircle size={26} className="opacity-30" />
            <p className="text-sm">No messages yet — say hello!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderRole === currentRole
            return (
              <div key={m.id} className={cn('flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
                <span className="text-[10px] font-semibold text-muted-foreground px-1">
                  {isMine ? 'You' : m.senderName}
                </span>
                <div
                  className={cn('max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words')}
                  style={isMine ? { backgroundColor: accent, color: '#1a1a1a' } : { backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
                >
                  {m.text}
                  {m.media && m.media.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {m.media.map((url) => (
                        <img key={url} src={url} alt="Attachment" className="w-24 h-24 rounded-lg object-cover border border-border/50" />
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/60 px-1">
                  {new Date(m.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Pending attachments preview */}
      {pendingMedia.length > 0 && (
        <div className="flex items-center gap-2 px-4 pt-3 flex-wrap">
          {pendingMedia.map((url) => (
            <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setPendingMedia((prev) => prev.filter((u) => u !== url))}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-border">
        <button
          type="button"
          onClick={() => setMediaPickerOpen(true)}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Attach media"
        >
          <Paperclip size={16} />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message as ${currentSenderName}...`}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && pendingMedia.length === 0)}
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all disabled:opacity-40 active:scale-95"
          style={{ backgroundColor: accent, color: '#1a1a1a' }}
        >
          {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(urls) => setPendingMedia((prev) => [...prev, ...urls])}
        multiple
      />
    </div>
  )
}
