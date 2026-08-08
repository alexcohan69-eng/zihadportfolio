'use client'

import { useState, useEffect } from 'react'
import { Heart, MessageCircle, Send, User, Ghost } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JoinConversationModal } from '@/components/join-conversation-modal'
import type { SessionUser } from '@/lib/types'

interface Comment {
  id: string
  name: string
  avatar: string
  text: string
  date: string
}

interface PostInteractionsProps {
  postId: string
  initialLikes?: number
  initialComments?: Comment[]
  initialReplies?: number
}

interface VisitorIdentity {
  name: string
  avatar: string
  isAnonymous: boolean
}

export function PostInteractions({ postId, initialLikes = 0, initialComments = [], initialReplies }: PostInteractionsProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [isLiked, setIsLiked] = useState(false)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)

  const [isCommentOpen, setIsCommentOpen] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'like' | 'comment' | null>(null)

  const [commentText, setCommentText] = useState('')

  // Legacy anonymous identity (pre-auth feature) — kept for backward compatibility
  // with visitors who already saved one before this upgrade.
  const [identity, setIdentity] = useState<VisitorIdentity | null>(null)
  // Real, authenticated identity — bridged in from either OAuth (NextAuth) or the
  // inline "Create Account" form, both of which set the shared `client_session` cookie.
  const [authUser, setAuthUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('zd-visitor-identity')
    if (saved) setIdentity(JSON.parse(saved))

    // Resolves an existing session on mount — this is what lets an OAuth
    // redirect (Google/LinkedIn/Twitter) land back on this exact feed page
    // already signed in, with no extra step and no hard reload needed.
    fetch('/api/auth/client/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setAuthUser(data.user as SessionUser)
      })
      .catch(() => {})
  }, [])

  /** Resolves the identity to attribute a like/comment to, preferring a real account. */
  const resolveIdentity = (): VisitorIdentity | null => {
    if (authUser) return { name: authUser.name, avatar: authUser.avatar || '', isAnonymous: false }
    return identity
  }

  // Fetch persisted comments from DB eagerly on mount so counts & content are always fresh
  useEffect(() => {
    if (commentsLoaded) return
    setIsLoadingComments(true)
    fetch(`/api/interact?postId=${encodeURIComponent(postId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.comments)) {
          setComments(data.comments)
        }
        setCommentsLoaded(true)
      })
      .catch(() => setCommentsLoaded(true))
      .finally(() => setIsLoadingComments(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]) // re-fetch if postId changes (navigating between posts)

  const handleLikeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!resolveIdentity()) {
      setPendingAction('like')
      setIsAuthModalOpen(true)
      return
    }
    executeLike()
  }

  const executeLike = () => {
    if (isLiked) {
      setLikes(p => p - 1)
      setIsLiked(false)
    } else {
      setLikes(p => p + 1)
      setIsLiked(true)
      fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'like' }),
      }).catch(() => {})
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!commentText.trim()) return

    const resolved = resolveIdentity()
    if (!resolved) {
      setPendingAction('comment')
      setIsAuthModalOpen(true)
      return
    }
    await executeComment(resolved)
  }

  const executeComment = async (resolvedIdentity: VisitorIdentity) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      name: resolvedIdentity.isAnonymous ? 'Anonymous' : resolvedIdentity.name || 'Anonymous',
      avatar: resolvedIdentity.isAnonymous ? '' : resolvedIdentity.avatar,
      text: commentText,
      date: new Date().toISOString()
    }
    
    // Optimistic update
    setComments(prev => [...prev, newComment])
    setCommentText('')

    try {
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'comment', comment: newComment })
      })
      const data = await res.json()
      // Replace optimistic comment with server-confirmed comment (normalized date etc.)
      if (data.success && data.comment) {
        setComments(prev =>
          prev.map((c) => (c.id === newComment.id ? data.comment : c))
        )
      }
    } catch (e) {
      console.error('Comment save failed', e)
    }
  }

  /** Fired by JoinConversationModal once a session exists (OAuth bridge or fresh registration). */
  const handleAuthenticated = async (sessionUser: SessionUser) => {
    setAuthUser(sessionUser)
    setIsAuthModalOpen(false)

    const resolved: VisitorIdentity = { name: sessionUser.name, avatar: sessionUser.avatar || '', isAnonymous: false }
    if (pendingAction === 'like') executeLike()
    if (pendingAction === 'comment') await executeComment(resolved)
    setPendingAction(null)
  }

  /** Fired by JoinConversationModal when the visitor picks "Continue Anonymously". */
  const handleAnonymous = async (guestIdentity: VisitorIdentity) => {
    setIdentity(guestIdentity)
    setIsAuthModalOpen(false)

    if (pendingAction === 'like') executeLike()
    if (pendingAction === 'comment') await executeComment(guestIdentity)
    setPendingAction(null)
  }

  return (
    <div className="pt-3 border-t border-border mt-4">
      <div className="flex items-center gap-6">
        <button 
          onClick={handleLikeClick}
          className={cn("flex items-center gap-2 text-sm font-medium transition-colors", isLiked ? "text-[#f4a295]" : "text-muted-foreground hover:text-foreground")}
        >
          <Heart size={18} className={cn("transition-transform active:scale-75", isLiked && "fill-[#f4a295]")} />
          {likes > 0 && <span>{likes}</span>}
        </button>

        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsCommentOpen(!isCommentOpen) }}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle size={18} className={cn(isLoadingComments && 'animate-pulse')} />
          {comments.length > 0 && <span>{comments.length}</span>}
        </button>
      </div>

      {isCommentOpen && (
        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {comments.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {c.avatar ? <img src={c.avatar} alt="avatar" className="w-full h-full object-cover" /> : <Ghost size={14} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
          )}

          <form onSubmit={handleCommentSubmit} onClick={(e) => e.stopPropagation()} className="flex gap-2">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
               {authUser?.avatar ? (
                 <img src={authUser.avatar} alt="You" className="w-full h-full object-cover" />
               ) : authUser ? (
                 <span className="text-xs font-bold text-foreground">{authUser.name.charAt(0).toUpperCase()}</span>
               ) : identity && !identity.isAnonymous && identity.avatar ? (
                 <img src={identity.avatar} alt="You" className="w-full h-full object-cover" />
               ) : (
                 <User size={16} className="text-muted-foreground" />
               )}
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full bg-muted/50 border border-border px-4 py-2 rounded-full text-sm outline-none focus:border-[#f4a295] transition-colors pr-10"
              />
              <button 
                type="submit" 
                disabled={!commentText.trim()}
                className="absolute right-1 top-1 bottom-1 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-[#f4a295] disabled:opacity-50 transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </div>
      )}

      <JoinConversationModal
        open={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false)
          setPendingAction(null)
        }}
        onAuthenticated={handleAuthenticated}
        onAnonymous={handleAnonymous}
      />
    </div>
  )
}
