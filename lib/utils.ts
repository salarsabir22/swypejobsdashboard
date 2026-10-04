import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return formatDate(date)
}

export function formatTime(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date))
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/** Only allow same-origin relative paths (share links after login). */
export function safeInternalPath(path: string | null | undefined): string | null {
  if (!path) return null
  if (!path.startsWith("/") || path.startsWith("//")) return null
  if (path.includes("://")) return null
  return path
}
