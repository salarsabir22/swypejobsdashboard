"use client"

import { useRouter } from "next/navigation"
import { IOBM_UNIVERSITY_NAME } from "@/lib/sso/iobm"

export function EmployerContinue({
  mode,
  className,
  children,
}: {
  mode: "login" | "signup"
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()

  function go() {
    localStorage.setItem("pending_role", "recruiter")
    localStorage.setItem("pending_sso", "iobm")
    localStorage.setItem("pending_university", IOBM_UNIVERSITY_NAME)
    if (mode === "signup") {
      router.push(`/signup?role=recruiter&university=${encodeURIComponent(IOBM_UNIVERSITY_NAME)}&sso=iobm`)
      return
    }
    router.push("/login")
  }

  return (
    <button type="button" className={className} onClick={go}>
      {children}
    </button>
  )
}
