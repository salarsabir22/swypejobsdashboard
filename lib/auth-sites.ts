export const LANDING_ORIGIN = "https://job-match-self.vercel.app"
export const DASHBOARD_ORIGIN = "https://swypejobsdashboard.vercel.app"

export function isAllowedReturn(value: string) {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.origin === DASHBOARD_ORIGIN || url.origin === LANDING_ORIGIN) return true
  return url.hostname === "localhost" || url.hostname === "127.0.0.1"
}

export function usesLocalGoogle(origin: string) {
  if (origin === LANDING_ORIGIN) return true
  try {
    const host = new URL(origin).hostname
    return host === "localhost" || host === "127.0.0.1"
  } catch {
    return false
  }
}

export function googleStartUrl(returnOrigin: string, opts?: { role?: string; next?: string | null }) {
  const url = new URL("/auth/google", LANDING_ORIGIN)
  url.searchParams.set("returnTo", returnOrigin)
  if (opts?.role === "student" || opts?.role === "recruiter") url.searchParams.set("role", opts.role)
  if (opts?.next) url.searchParams.set("next", opts.next)
  return url.toString()
}
