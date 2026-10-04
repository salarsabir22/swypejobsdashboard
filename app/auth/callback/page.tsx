"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAllowedReturn } from "@/lib/auth-sites"
import {
  isRecruiterOnboardingComplete,
  isStudentOnboardingComplete,
  postAuthRedirect,
  RECRUITER_ONBOARDING_SELECT,
  STUDENT_ONBOARDING_SELECT,
} from "@/lib/profile/completeness"

let started = false

function fail(message: string) {
  window.location.replace(`/login?error=${encodeURIComponent(message)}`)
}

export default function AuthCallbackPage() {
  useEffect(() => {
    if (started) return
    started = true

    async function run() {
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const oauthError =
        params.get("error_description") ||
        hash.get("error_description") ||
        params.get("error") ||
        hash.get("error")
      if (oauthError) {
        fail(oauthError)
        return
      }

      const supabase = createClient()
      const accessToken = hash.get("access_token")
      const refreshToken = hash.get("refresh_token")
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          fail(error.message)
          return
        }
      } else {
        const code = params.get("code")
        if (!code) {
          fail("Google sign-in did not complete. Try again.")
          return
        }
        const exchanged = await supabase.auth.exchangeCodeForSession(code)
        if (exchanged.error) {
          const existing = await supabase.auth.getSession()
          if (!existing.data.session) {
            fail(exchanged.error.message)
            return
          }
        }
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session?.user) {
        fail("Google sign-in did not complete. Try again.")
        return
      }

      const returnTo = params.get("returnTo")
      if (returnTo && isAllowedReturn(returnTo) && new URL(returnTo).origin !== window.location.origin) {
        const dest = new URL("/auth/callback", returnTo)
        const role = params.get("role")
        const next = params.get("next")
        if (role) dest.searchParams.set("role", role)
        if (next) dest.searchParams.set("next", next)
        const fragment = new URLSearchParams({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        })
        window.location.replace(`${dest.toString()}#${fragment.toString()}`)
        return
      }

      const next = params.get("next")
      if (next === "reset-password") {
        window.location.replace("/reset-password")
        return
      }

      const roleParam = params.get("role")
      if (roleParam === "student" || roleParam === "recruiter") {
        await supabase.from("profiles").update({ role: roleParam }).eq("id", session.user.id)
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
      const role = roleParam === "student" || roleParam === "recruiter" ? roleParam : profile?.role
      let studentReady = false
      let recruiterReady = false
      if (role === "student") {
        const { data } = await supabase
          .from("student_profiles")
          .select(STUDENT_ONBOARDING_SELECT)
          .eq("id", session.user.id)
          .maybeSingle()
        studentReady = isStudentOnboardingComplete(data)
      }
      if (role === "recruiter") {
        const { data } = await supabase
          .from("recruiter_profiles")
          .select(RECRUITER_ONBOARDING_SELECT)
          .eq("id", session.user.id)
          .maybeSingle()
        recruiterReady = isRecruiterOnboardingComplete(data)
      }
      if (!profile && roleParam !== "student" && roleParam !== "recruiter") {
        window.location.replace("/onboarding")
        return
      }
      window.location.replace(postAuthRedirect({ role, studentReady, recruiterReady, next }))
    }

    void run()
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </main>
  )
}
