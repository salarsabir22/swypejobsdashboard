"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { googleStartUrl, usesLocalGoogle } from "@/lib/auth-sites"
import { isIobmPortal, IOBM_HOSTED_DOMAIN } from "@/lib/sso/iobm"

export default function IobmGoogleSsoPage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const portal = params.get("portal")
    if (!isIobmPortal(portal) || portal === "employer") {
      setError("Unknown IoBM login.")
      return
    }
    const staffRole = params.get("staff_role") || ""
    const claim = params.get("claim") === "1"
    const nextPath = params.get("next")
    localStorage.setItem("pending_sso", "iobm")
    localStorage.setItem("pending_portal", portal)
    if (portal === "alumni") localStorage.setItem("pending_alumni", "1")
    if (portal === "faculty") localStorage.setItem("pending_role", "university")
    else localStorage.setItem("pending_role", "student")
    if (staffRole) localStorage.setItem("pending_staff_role", staffRole)
    if (claim) localStorage.setItem("pending_iobm_claim", "1")

    const callback = new URL("/auth/callback", window.location.origin)
    callback.searchParams.set("sso", "iobm")
    callback.searchParams.set("portal", portal)
    if (staffRole) callback.searchParams.set("staff_role", staffRole)
    if (claim) callback.searchParams.set("claim", "1")
    if (nextPath) callback.searchParams.set("next", nextPath)

    if (!usesLocalGoogle(window.location.origin)) {
      window.location.replace(
        googleStartUrl(window.location.origin, {
          role: portal === "faculty" ? "university" : "student",
          next: `${callback.pathname}${callback.search}`,
        })
      )
      return
    }

    const supabase = createClient()
    const queryParams: Record<string, string> = { prompt: "select_account" }
    if (!claim) queryParams.hd = IOBM_HOSTED_DOMAIN
    void supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString(), queryParams },
      })
      .then(({ error: oauthError }) => {
        if (oauthError) setError(oauthError.message || "Google campus sign-in failed.")
      })
  }, [])

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.04em]">Connecting to IoBM SSO</h1>
      <p className="mt-3 text-sm text-white/70">
        {error || "You will be asked for your IoBM Google account."}
      </p>
    </div>
  )
}
