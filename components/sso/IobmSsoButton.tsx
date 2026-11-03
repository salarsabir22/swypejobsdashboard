"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { IobmPortal } from "@/lib/sso/iobm"

export function IobmSsoButton({
  portal,
  staffRole,
  identityClaim = false,
  label,
  variant = "default",
}: {
  portal: IobmPortal
  staffRole?: string
  identityClaim?: boolean
  label: string
  variant?: "default" | "outline"
}) {
  const [loading, setLoading] = useState(false)

  function start() {
    setLoading(true)
    localStorage.setItem("pending_sso", "iobm")
    localStorage.setItem("pending_portal", portal)
    if (portal === "faculty") localStorage.setItem("pending_role", "university")
    else if (portal === "employer") localStorage.setItem("pending_role", "recruiter")
    else localStorage.setItem("pending_role", "student")
    if (portal === "alumni") localStorage.setItem("pending_alumni", "1")
    else localStorage.removeItem("pending_alumni")
    if (staffRole) localStorage.setItem("pending_staff_role", staffRole)
    if (identityClaim) localStorage.setItem("pending_iobm_claim", "1")
    else localStorage.removeItem("pending_iobm_claim")
    const url = new URL("/api/sso/iobm/start", window.location.origin)
    url.searchParams.set("portal", portal)
    if (staffRole) url.searchParams.set("staff_role", staffRole)
    if (identityClaim) url.searchParams.set("claim", "1")
    window.location.href = url.toString()
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={
        variant === "outline"
          ? "h-12 min-h-11 w-full rounded-xl border-2 border-[#051C2C] bg-transparent text-[15px] font-semibold text-[#051C2C] hover:bg-[#051C2C]/[0.04]"
          : "h-12 min-h-11 w-full rounded-xl bg-[#051C2C] text-[15px] font-semibold text-white hover:bg-[#2251FF]"
      }
      loading={loading}
      loadingText="Redirecting to IoBM…"
      onClick={start}
    >
      {label}
    </Button>
  )
}
