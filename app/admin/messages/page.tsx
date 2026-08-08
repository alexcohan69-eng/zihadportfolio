'use client'

import { useState, useEffect } from 'react'
import { Loader2, Package, Mail, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToastStack } from '@/components/admin/shared'
import { useToast } from '@/hooks/use-toast'
import { ChatWidget } from '@/components/chat-widget'
import type { Order } from '@/lib/types'

export default function AdminMessagesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const { toasts, addToast } = useToast()

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      addToast('Failed to load orders', false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <ToastStack toasts={toasts} />

      {selected ? (
        <div className="space-y-3">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Back to conversations
          </button>
          <div className="px-4 py-3 rounded-xl border border-border bg-card">
            <p className="text-sm font-semibold text-foreground">{selected.serviceTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Mail size={11} /> {selected.name} &middot; {selected.email}
            </p>
          </div>
          <ChatWidget orderId={selected.id} currentRole="admin" currentSenderName="Support Team" accent="#f4a295" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Package size={32} className="text-muted-foreground opacity-30" />
          <p className="text-sm font-medium text-foreground">No orders yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">Client conversations will appear here once orders come in.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelected(order)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-left',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{order.serviceTitle}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{order.name} &middot; {order.email}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {new Date(order.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
