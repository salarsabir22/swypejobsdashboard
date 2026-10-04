/**
 * Publishable keys (`sb_publishable_...`) are not JWTs. supabase-js uses the
 * project key as `Authorization: Bearer <key>` when there is no user session;
 * PostgREST then returns 401 (often surfaced with a misleading RLS message).
 *
 * Only rewrite **PostgREST** (`/rest/v1`) headers. Auth/Storage must use the
 * original fetch call — cloning a POST `Request` (PKCE token exchange) can hang
 * on Vercel/undici until a Gateway Timeout.
 *
 * @see https://supabase.com/docs/guides/api/api-keys#known-limitations-and-compatibility-differences
 */
function requestUrl(input: RequestInfo | URL): URL {
  if (typeof input === "string") return new URL(input)
  if (input instanceof URL) return input
  return new URL(input.url)
}

export function createSupabaseFetch(baseFetch: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = requestUrl(input)
    if (!url.pathname.includes("/rest/v1")) {
      return baseFetch(input, init)
    }

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    )
    const auth = headers.get("authorization")
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const token = auth.slice(7).trim()
      if (token && !token.startsWith("eyJ")) {
        headers.delete("authorization")
        return baseFetch(input, { ...init, headers })
      }
    }
    return baseFetch(input, init)
  }
}
