"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { signedStorageUrl } from "@/lib/storage/signed-url"

export function useSignedStorageUrl(bucket: string, urlOrPath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(
    urlOrPath && (urlOrPath.startsWith("blob:") || urlOrPath.startsWith("data:")) ? urlOrPath : null
  )

  useEffect(() => {
    if (!urlOrPath) {
      setUrl(null)
      return
    }
    if (urlOrPath.startsWith("blob:") || urlOrPath.startsWith("data:")) {
      setUrl(urlOrPath)
      return
    }
    const supabase = createClient()
    let cancelled = false
    void signedStorageUrl(supabase, bucket, urlOrPath).then((next) => {
      if (!cancelled) setUrl(next)
    })
    return () => {
      cancelled = true
    }
  }, [bucket, urlOrPath])

  return url
}
