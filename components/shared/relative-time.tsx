'use client'

import { formatRelativeDate } from '@/lib/format-relative-date'

interface RelativeTimeProps {
  /** ISO date string (or any string parseable by `new Date`) marking publication time. */
  date: string
  className?: string
}

/**
 * Twitter/X-style timestamp ("just now", "5 min ago", "3 hours ago", "Apr 24").
 *
 * The formatted string depends on the viewer's local clock, so it can differ
 * by a second (or cross a minute/hour boundary) between the server render and
 * the client's first paint. `suppressHydrationWarning` tells React that's
 * expected instead of surfacing a hydration-mismatch warning.
 */
export function RelativeTime({ date, className }: RelativeTimeProps) {
  return (
    <time dateTime={date} className={className} suppressHydrationWarning>
      {formatRelativeDate(date)}
    </time>
  )
}
