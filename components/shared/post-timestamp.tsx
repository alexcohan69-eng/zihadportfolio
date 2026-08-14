'use client'

import { useEffect, useState } from 'react'
import { formatAbsolutePostDate, formatPostTimestamp } from '@/lib/format-time'

interface PostTimestampProps {
  /** ISO timestamp string (or any value `new Date()` can parse) for the post's publish time. */
  date: string
  className?: string
}

/**
 * Renders a post's publish time the Twitter/X way: "just now" / "5 min ago" /
 * "3 hours ago" for the first 24h, then "Apr 24" or "Apr 24, 2025" after.
 *
 * Hydration safety: the *real* relative label depends on the viewer's local
 * clock at render time, which can differ by seconds (or more, under slow
 * hydration) between the server-rendered HTML and the client's first paint —
 * a classic source of "text content did not match" warnings. To avoid that
 * entirely, the component renders a clock-independent placeholder (the
 * absolute date, computed relative to the post's own timestamp rather than
 * "now") until it has mounted on the client, then swaps to the true
 * relative/absolute label. `suppressHydrationWarning` is added as a second,
 * belt-and-suspenders guard in case any edge case still slips through.
 */
export function PostTimestamp({ date, className }: PostTimestampProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const then = new Date(date)
  if (Number.isNaN(then.getTime())) return null

  const label = mounted ? formatPostTimestamp(then) : formatAbsolutePostDate(then, then)

  return (
    <time dateTime={then.toISOString()} className={className} suppressHydrationWarning>
      {label}
    </time>
  )
}
