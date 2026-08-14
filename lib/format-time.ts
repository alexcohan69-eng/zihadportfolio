/**
 * Twitter/X-style post timestamp formatting.
 *
 * - < 60 seconds:  "just now"
 * - < 60 minutes:  "X min ago"
 * - < 24 hours:    "X hour ago" / "X hours ago"
 * - >= 24 hours:   absolute date — "Apr 24" (same year) or "Apr 24, 2025" (different year)
 *
 * All comparisons use the viewer's local clock (`now`) against the post's
 * publication timestamp (`date`). `now` is an optional injectable parameter
 * (defaults to `new Date()`) purely so this stays trivially unit-testable —
 * production callers should never need to pass it.
 */
export function formatPostTimestamp(date: string | Date, now: Date = new Date()): string {
  const then = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(then.getTime())) return ''

  const diffSeconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000))

  if (diffSeconds < 60) return 'just now'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  return formatAbsolutePostDate(then, now)
}

/**
 * Absolute fallback used once a post is >= 24h old: "Apr 24" when `date`
 * falls in the same calendar year as `now`, otherwise "Apr 24, 2025".
 * English month abbreviations are forced via the 'en-US' locale regardless
 * of the viewer's system locale, per the Twitter/X convention this mirrors.
 */
export function formatAbsolutePostDate(date: Date, now: Date = new Date()): string {
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}
