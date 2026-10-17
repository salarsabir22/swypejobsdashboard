"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { isAllowedReturn } from "@/lib/auth-sites"
import { provisionUniversityAccount } from "@/lib/campus/provision"
import {
  applySignupRole,
  clearSignupIntent,
  isRecruiterOnboardingComplete,
  isStudentOnboardingComplete,
  postAuthRedirect,
  resolveAppRole,
  signupIntentRole,
  RECRUITER_ONBOARDING_SELECT,
  STUDENT_ONBOARDING_SELECT,
} from "@/lib/profile/completeness"

let started = false

function fail(message: string, _portal?: string | null) {
  window.location.replace(`/login?error=${encodeURIComponent(message)}`)
}

export default function AuthCallbackPage() {
  useEffect(() => {
    if (started) return
    started = true

    async function run() {
      const params = new URLSearchParams(window.location.search)
      const portal = params.get("portal")
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const oauthError =
        params.get("error_description") ||
        hash.get("error_description") ||
        params.get("error") ||
        hash.get("error")
      if (oauthError) {
        fail(oauthError, portal)
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
          fail(error.message, portal)
          return
        }
      } else {
        const code = params.get("code")
        if (!code) {
          fail("Google sign-in did not complete. Try again.", portal)
          return
        }
        const exchanged = await supabase.auth.exchangeCodeForSession(code)
        if (exchanged.error) {
          const existing = await supabase.auth.getSession()
          if (!existing.data.session) {
            fail(exchanged.error.message, portal)
            return
          }
        }
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      if (!session?.user) {
        fail("Google sign-in did not complete. Try again.", portal)
        return
      }

      const returnTo = params.get("returnTo")
      if (returnTo && isAllowedReturn(returnTo) && new URL(returnTo).origin !== window.location.origin) {
        const dest = new URL("/auth/callback", returnTo)
        const role = params.get("role")
        const next = params.get("next")
        if (role) dest.searchParams.set("role", role)
        if (portal) dest.searchParams.set("portal", portal)
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
      const pendingRole = localStorage.getItem("pending_role")
      const pendingUniversity = localStorage.getItem("pending_university") || ""
      const pendingStaff = localStorage.getItem("pending_staff_role") || ""
      const meta = session.user.user_metadata || {}
      const metaRole = typeof meta.role === "string" ? meta.role : null
      const universityName = pendingUniversity || (typeof meta.university === "string" ? meta.university : "")
      const intent = signupIntentRole({
        roleParam: portal === "university" ? "university" : roleParam,
        pendingRole,
        metaRole,
      })

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
      const establishedRole =
        profile?.role === "admin" ||
        profile?.role === "university" ||
        profile?.role === "recruiter" ||
        profile?.role === "student"
          ? profile.role
          : null

      if (establishedRole === "admin") {
        clearSignupIntent()
        window.location.replace("/admin/users")
        return
      }

      // University signup intent wins over a trigger-default student profile.
      if (intent === "university" || establishedRole === "university") {
        if (establishedRole === "recruiter") {
          clearSignupIntent()
          fail("This email is already a recruiter account.", "university")
          return
        }
        if (establishedRole === "university") {
          clearSignupIntent()
          window.location.replace("/campus")
          return
        }
        if (!universityName) {
          clearSignupIntent()
          fail("Choose your university and try again.", "university")
          return
        }
        // Google OAuth often drops custom metadata — stamp university before provision.
        await supabase.auth.updateUser({
          data: {
            role: "university",
            university: universityName,
            staff_role: pendingStaff || (typeof meta.staff_role === "string" ? meta.staff_role : "advisor"),
            full_name: typeof meta.full_name === "string" ? meta.full_name : meta.name,
          },
        })
        const saved = await provisionUniversityAccount({
          university: universityName,
          staffRole: pendingStaff || (typeof meta.staff_role === "string" ? meta.staff_role : undefined),
          fullName: typeof meta.full_name === "string" ? meta.full_name : undefined,
        })
        clearSignupIntent()
        if (!saved.ok) {
          await supabase.auth.signOut()
          fail(saved.message, "university")
          return
        }
        const { data: office } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle()
        if (office?.role !== "university") {
          await supabase.auth.signOut()
          fail("Use a career-office account, or create one.", "university")
          return
        }
        window.location.replace("/campus")
        return
      }

      let appliedRole = establishedRole
      if (intent === "student" || intent === "recruiter") {
        appliedRole = await applySignupRole(supabase, session.user.id, intent, {
          existingRole: establishedRole,
          fullName: typeof meta.full_name === "string" ? meta.full_name : null,
        })
      }
      clearSignupIntent()

      const role = await resolveAppRole(supabase, session.user.id, {
        profileRole: appliedRole,
        metaRole,
      })

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
