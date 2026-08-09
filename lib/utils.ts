import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Enforces exclusive video playback across the page: pauses every
 * <video> element except the one currently being interacted with.
 * Pass this as the `onPlay` handler on any video-rendering component
 * so starting one video always stops all others (prevents overlapping audio).
 */
export function pauseOtherVideos(current: HTMLVideoElement) {
  document.querySelectorAll('video').forEach((video) => {
    if (video !== current && !video.paused) {
      video.pause()
    }
  })
}
