'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { FeedItem } from '@/components/feed-item'
import type { FeedItem as FeedItemType } from '@/lib/data'

interface FeedCategoryClientProps {
  items: FeedItemType[]
  label: string
}

export function FeedCategoryClient({ items, label }: FeedCategoryClientProps) {
  const router = useRouter()

  return (
    <PageShell>
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-bold text-base text-foreground">{label}</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
      </div>

      <section>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <p className="text-sm text-muted-foreground">No posts in this category yet.</p>
          </div>
        ) : (
          items.map((item) => (
            <FeedItem
              key={item.id}
              id={item.id}
              type={item.type as 'testimonial' | 'project' | 'post'}
              title={item.title}
              body={item.type === 'testimonial' ? item.content : item.excerpt}
              author={item.type === 'testimonial' ? (item.clientName ?? item.author) : item.author}
              authorRole={item.type === 'testimonial' ? item.clientRole : undefined}
              date={item.date}
              initialLikes={item.likes}
              replies={item.replies}
              rating={item.rating}
              image={item.image}
              clientImage={item.clientImage}
              projectTech={item.tech}
              projectLink={item.link}
              linkedProjectId={item.linkedProjectId}
              pinned={item.pinned}
            />
          ))
        )}
      </section>
    </PageShell>
  )
}
