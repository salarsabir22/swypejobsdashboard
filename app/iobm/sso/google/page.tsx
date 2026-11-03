"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { CoBrand } from "@/components/sso/CoBrand"
import { createClient } from "@/lib/supabase/client"
import { googleStartUrl, usesLocalGoogle } from "@/lib/auth-sites"
import { isIobmPortal, iobmGoogleHostedDomain } from "@/lib/sso/iobm"

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
    const hostedDomain = iobmGoogleHostedDomain()
    if (hostedDomain && !claim) queryParams.hd = hostedDomain
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
    <div className="w-full max-w-[400px] rounded-[28px] border border-[#111111]/10 bg-white px-7 py-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <CoBrand size={32} className="justify-center" />
      <h1 className="mt-5 text-[24px] font-normal leading-8 tracking-[-0.02em] text-[#111111]">Sign in</h1>
      <p className="mt-3 inline-flex items-center justify-center gap-2 text-[14px] leading-5 text-[#5C6370]">
        {error ? null : <Loader2 className="size-4 animate-spin" aria-hidden />}
        {error || "Continue with your IoBM Google account"}
      </p>
    </div>
  )
}
