'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, LogOut, MessageCircle, Clock, ArrowLeft, Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastStack } from '@/components/admin/shared'
import { useToast } from '@/hooks/use-toast'
import { ChatWidget } from '@/components/chat-widget'
import { MediaPickerModal } from '@/components/admin/media-picker-modal'
import type { Order, SessionUser } from '@/lib/types'

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pending', bg: '#f4a29520', color: '#f4a295' },
  'in-progress': { label: 'In Progress', bg: '#9db8e820', color: '#9db8e8' },
  completed: { label: 'Completed', bg: '#a8d5c220', color: '#a8d5c2' },
  cancelled: { label: 'Cancelled', bg: '#e8534420', color: '#e85344' },
}

export function ClientDashboardView({ session, orders }: { session: SessionUser; orders: Order[] }) {
  const router = useRouter()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [avatar, setAvatar] = useState(session.avatar ?? '')
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const { toasts, addToast } = useToast()

  async function handleAvatarSelect(urls: string[]) {
    const url = urls[0]
    if (!url) return
    setIsSavingAvatar(true)
    try {
      const res = await fetch('/api/auth/client/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      })
      const data = await res.json()
      if (data.success) {
        setAvatar(url)
        addToast('Profile picture updated')
      } else {
        addToast(data.error || 'Failed to update profile picture', false)
      }
    } catch {
      addToast('Network error while updating profile picture', false)
    } finally {
      setIsSavingAvatar(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/client/logout', { method: 'POST' })
      router.replace('/')
    } catch {
      addToast('Failed to log out', false)
      setLoggingOut(false)
    }
  }

  return (
    <div className="px-5 py-4">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border mb-5">
        <button
          onClick={() => setIsPickerOpen(true)}
          disabled={isSavingAvatar}
          className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 group border border-border"
          style={{ backgroundColor: avatar ? undefined : '#9db8e820' }}
          aria-label="Change profile picture"
        >
          {avatar ? (
            <img src={avatar} alt={session.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={18} style={{ color: '#9db8e8' }} />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            {isSavingAvatar ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base text-foreground leading-tight">Welcome, {session.name}</h1>
          <p className="text-xs text-muted-foreground">Track your orders &amp; chat with our team</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50 shrink-0"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">{loggingOut ? 'Logging out...' : 'Log out'}</span>
        </button>
      </div>

      {selectedOrder ? (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedOrder(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Back to orders
          </button>
          <div className="px-4 py-3 rounded-xl border border-border bg-card">
            <p className="text-sm font-semibold text-foreground">{selectedOrder.serviceTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Order #{selectedOrder.id.replace('order-', '')}</p>
          </div>
          <ChatWidget
            orderId={selectedOrder.id}
            currentRole="client"
            currentSenderName={session.name}
            accent="#9db8e8"
          />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Package size={32} className="text-muted-foreground opacity-30" />
          <p className="text-sm font-medium text-foreground">No orders yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Once you order a service, it will show up here along with a direct chat line to our team.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const status = STATUS_STYLES[order.status ?? 'pending']
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{order.serviceTitle}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Clock size={11} />
                    {new Date(order.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span
                  className={cn('shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold')}
                  style={{ backgroundColor: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
                <MessageCircle size={16} className="shrink-0 text-muted-foreground" />
              </button>
            )
          })}
        </div>
      )}

      <MediaPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAvatarSelect}
        multiple={false}
      />
    </div>
  )
}
