import type { ChatMessageType } from "@/types"

export const MAX_CHAT_ATTACHMENTS = 10
export const MAX_IMAGE_BYTES = 16 * 1024 * 1024
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024
export const MAX_AUDIO_BYTES = 16 * 1024 * 1024
export const MAX_FILE_BYTES = 32 * 1024 * 1024

export const GALLERY_ACCEPT = "image/*,video/*,image/gif,.gif,.webp,.heic,.heif,.mp4,.mov,.webm"
export const CAMERA_ACCEPT = "image/*,video/*"
export const AUDIO_ACCEPT = "audio/*,.mp3,.m4a,.wav,.ogg,.aac,.flac,.webm"
export const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z,.rtf,.json,.xml,application/pdf,text/plain,*/*"

export function classifyStoredMedia(opts: {
  messageType?: string | null
  mimeType?: string | null
  fileName?: string | null
  content?: string | null
}): "image" | "video" | "audio" | "file" | null {
  const type = opts.messageType
  if (type === "image" || type === "video" || type === "audio") return type
  if (type !== "file") return null
  const mime = (opts.mimeType || "").toLowerCase()
  const name = (opts.fileName || opts.content || "").toLowerCase()
  if (mime.startsWith("image/") || /\.(gif|jpe?g|png|webp|heic|heif|bmp|avif)$/.test(name)) return "image"
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(name)) return "video"
  if (mime.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|flac|opus)$/.test(name)) return "audio"
  return "file"
}

export function classifyChatFile(file: File): Exclude<ChatMessageType, "text" | "voice"> {
  const mime = (file.type || "").toLowerCase()
  const name = file.name.toLowerCase()
  if (mime === "image/svg+xml" || name.endsWith(".svg")) return "file"
  if (mime.startsWith("image/") || /\.(gif|jpe?g|png|webp|heic|heif|bmp|avif)$/.test(name)) return "image"
  if (mime.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(name)) return "video"
  if (mime.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|flac|opus)$/.test(name)) return "audio"
  return "file"
}

export function maxBytesForType(type: Exclude<ChatMessageType, "text" | "voice">) {
  if (type === "image") return MAX_IMAGE_BYTES
  if (type === "video") return MAX_VIDEO_BYTES
  if (type === "audio") return MAX_AUDIO_BYTES
  return MAX_FILE_BYTES
}

export function defaultMediaLabel(type: Exclude<ChatMessageType, "text" | "voice">, fileName: string) {
  if (type === "image") return "Photo"
  if (type === "video") return "Video"
  if (type === "audio") return "Audio"
  return fileName || "File"
}

export function isGenericMediaCaption(content: string | null | undefined, type?: string | null, fileName?: string | null) {
  const c = content?.trim() ?? ""
  if (!c) return true
  if (["Photo", "Video", "Audio", "Voice message", "File"].includes(c)) return true
  if (fileName && c === fileName && type !== "file") return true
  return false
}

export function sanitizeChatFileName(name: string) {
  const trimmed = name.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "")
  return trimmed.slice(0, 120) || "file"
}

export function formatFileSize(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

export function fileExtension(name: string | null | undefined) {
  const match = name?.split(".").pop()
  if (!match || match === name) return "FILE"
  return match.replace(/[^\w]/g, "").slice(0, 5).toUpperCase() || "FILE"
}

export function validateChatFile(file: File): string | null {
  const type = classifyChatFile(file)
  const max = maxBytesForType(type)
  if (file.size > max) {
    const label = type === "image" ? "Photo" : type === "video" ? "Video" : type === "audio" ? "Audio" : "File"
    return `${label} is too large (max ${formatFileSize(max)}).`
  }
  return null
}

export function readMediaDuration(file: File): Promise<number | null> {
  const type = classifyChatFile(file)
  if (type !== "video" && type !== "audio") return Promise.resolve(null)
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(type === "video" ? "video" : "audio")
    el.preload = "metadata"
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    el.onloadedmetadata = () => {
      const duration = el.duration
      done(Number.isFinite(duration) ? Math.max(1, Math.round(duration)) : null)
    }
    el.onerror = () => done(null)
    el.src = url
  })
}
