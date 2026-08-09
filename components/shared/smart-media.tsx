interface SmartMediaProps {
  src: string
  alt?: string
  className?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  onPlay?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
}

const VIDEO_PATTERN = /\.(mp4|webm|ogg|mov|m4v|avi)(\?|$)/i
const CLOUDINARY_VIDEO_PATTERN = /\/video\/upload\//i

/**
 * Strict 1:1 media renderer. Detects the real media kind from the URL
 * (file extension or Cloudinary resource path) and renders the matching
 * native element — a <video> for video sources, an <img> for everything
 * else (images, GIFs, etc). Never assumes a type based on context.
 */
export function isVideoSrc(src: string): boolean {
  if (!src) return false
  return VIDEO_PATTERN.test(src) || CLOUDINARY_VIDEO_PATTERN.test(src)
}

export function SmartMedia({
  src,
  alt = '',
  className,
  controls,
  autoPlay = false,
  muted = false,
  loop = false,
  onPlay,
}: SmartMediaProps) {
  if (!src) return null

  if (isVideoSrc(src)) {
    // Default to showing controls unless explicitly disabled.
    const showControls = controls !== false

    return (
      <video
        src={src}
        controls={showControls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        className={className}
        aria-label={alt || undefined}
        onPlay={onPlay}
      />
    )
  }

  return <img src={src} alt={alt} className={className} loading="lazy" />
}
