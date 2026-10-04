export function absoluteShareUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (typeof window === "undefined") return path
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`
}

export type ShareResult = "shared" | "copied" | "aborted" | "failed"

export function canNativeShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function"
}

export async function shareOrCopyLink({
  path,
  title,
  text,
}: {
  path: string
  title: string
  text?: string
}): Promise<ShareResult> {
  const url = absoluteShareUrl(path)

  if (canNativeShare()) {
    try {
      await navigator.share({ title, url, text: text ?? title })
      return "shared"
    } catch (err) {
      if ((err as { name?: string } | null)?.name === "AbortError") return "aborted"
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return "copied"
  } catch {
    return "failed"
  }
}

export async function copyShareLink(path: string): Promise<ShareResult> {
  try {
    await navigator.clipboard.writeText(absoluteShareUrl(path))
    return "copied"
  } catch {
    return "failed"
  }
}
