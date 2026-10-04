import type { SupabaseClient } from "@supabase/supabase-js"

export function extractStoragePath(bucket: string, urlOrPath: string): string | null {
  const value = urlOrPath.trim()
  if (!value) return null
  if (value.startsWith("blob:") || value.startsWith("data:")) return null
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return value.replace(/^\//, "")
  }

  const markers = [`/object/public/${bucket}/`, `/object/sign/${bucket}/`, `/object/authenticated/${bucket}/`]
  for (const marker of markers) {
    const index = value.indexOf(marker)
    if (index === -1) continue
    const rest = value.slice(index + marker.length)
    return decodeURIComponent(rest.split("?")[0])
  }
  return null
}

export async function signedStorageUrl(
  supabase: SupabaseClient,
  bucket: string,
  urlOrPath: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  if (!urlOrPath) return null
  if (urlOrPath.startsWith("blob:") || urlOrPath.startsWith("data:")) return urlOrPath

  const path = extractStoragePath(bucket, urlOrPath)
  if (!path) return urlOrPath.startsWith("http") ? urlOrPath : null

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
