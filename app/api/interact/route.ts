import { NextRequest, NextResponse } from 'next/server'
import { incrementFeedItemLikes } from '@/lib/data-actions'
import { getDb } from '@/lib/db'
import type { FeedComment } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, action, comment } = body as {
      postId?: string
      action?: string
      comment?: FeedComment
    }

    if (!postId || typeof postId !== 'string') {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }

    if (action === 'like') {
      const result = await incrementFeedItemLikes(postId)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, likes: result.likes })
    }

    if (action === 'comment' && comment) {
      if (!comment.text?.trim()) {
        return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
      }
      const safeComment: FeedComment = {
        id: comment.id || Date.now().toString(),
        name: (comment.name || 'Anonymous').slice(0, 100),
        avatar: comment.avatar || '',
        text: comment.text.trim().slice(0, 2000),
        date: new Date().toISOString(),
      }
      const db = await getDb()
      await db.collection('feed').updateOne(
        { id: postId },
        {
          $push: { comments: safeComment } as never,
          $inc: { replies: 1 },
        },
      )
      return NextResponse.json({ success: true, comment: safeComment })
    }

    // Unknown action — no-op success so optimistic UI works for future actions
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to process interaction' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }
    const db = await getDb()
    const doc = await db.collection('feed').findOne(
      { id: postId },
      { projection: { comments: 1, _id: 0 } },
    )
    return NextResponse.json({ comments: doc?.comments ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}
