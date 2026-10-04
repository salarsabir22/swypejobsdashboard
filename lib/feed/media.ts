export type FeedMediaKind = "image" | "video"

export const MAX_FEED_IMAGE_BYTES = 16 * 1024 * 1024
export const MAX_FEED_VIDEO_BYTES = 40 * 1024 * 1024

export const FEED_MEDIA_ACCEPT =
  "image/*,video/mp4,video/webm,video/quicktime,video/*,.gif,.webp,.heic,.heif,.mp4,.mov,.webm,.m4v"

export function classifyFeedFile(file: File): FeedMediaKind | null {
  const mime = (file.type || "").toLowerCase()
  const name = file.name.toLowerCase()
  if (mime.startsWith("image/") || /\.(gif|jpe?g|png|webp|heic|heif|bmp|avif)$/.test(name)) return "image"
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(name)) return "video"
  return null
}

export function feedMediaKind(url?: string | null, mediaType?: string | null): FeedMediaKind | null {
  if (!url) return null
  if (mediaType === "video" || mediaType === "image") return mediaType
  if (/\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(url)) return "video"
  return "image"
}

export function validateFeedMedia(file: File): { kind: FeedMediaKind } | { error: string; description?: string } {
  const kind = classifyFeedFile(file)
  if (!kind) return { error: "Choose a photo or video" }
  const max = kind === "video" ? MAX_FEED_VIDEO_BYTES : MAX_FEED_IMAGE_BYTES
  if (file.size > max) {
    return {
      error: kind === "video" ? "Video is too large" : "Image is too large",
      description: kind === "video" ? "Keep it under 40 MB." : "Keep it under 16 MB.",
    }
  }
  return { kind }
}
