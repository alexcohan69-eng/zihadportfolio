import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/client-auth'
import { getDb } from '@/lib/db'
import { PageShell } from '@/components/page-shell'
import { ClientDashboardView } from '@/components/client-dashboard-view'
import type { Order } from '@/lib/types'

export const metadata = {
  title: 'Client Dashboard',
}

export default async function ClientDashboardPage() {
  const session = await getServerSession()
  if (!session) redirect('/client/login?from=/client/dashboard')

  const db = await getDb()
  const docs = await db.collection('orders').find({ clientId: session.id }).sort({ submittedAt: -1 }).toArray()
  const orders = docs.map(({ _id, ...rest }) => rest) as unknown as Order[]

  return (
    <PageShell>
      <ClientDashboardView session={session} orders={orders} />
    </PageShell>
  )
}
