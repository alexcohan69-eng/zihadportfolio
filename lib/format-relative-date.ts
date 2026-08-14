/**
 * Twitter/X-style timestamp formatting.
 *
 * - < 60s        → "just now"
 * - < 60min      → "X min ago"
 * - < 24h        → "X hour(s) ago"
 * - >= 24h       → "Apr 24" (same year) or "Apr 24, 2025" (different year)
 *
 * Always computed against the viewer's local clock/timezone.
 */
export function formatRelativeDate(input: string | Date, now: Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input

  if (Number.isNaN(date.getTime())) return ''

  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))

  if (diffSec < 60) return 'just now'

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const sameYear = date.getFullYear() === now.getFullYear()

  return sameYear ? `${month} ${day}` : `${month} ${day}, ${date.getFullYear()}`
}
