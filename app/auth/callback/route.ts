import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { safeInternalPath } from "@/lib/utils"
import {
  isStudentOnboardingComplete,
  isRecruiterOnboardingComplete,
  postAuthRedirect,
  STUDENT_ONBOARDING_SELECT,
  RECRUITER_ONBOARDING_SELECT,
} from "@/lib/profile/completeness"

function loginErrorRedirect(origin: string, message: string) {
  const url = new URL("/login", origin)
  url.searchParams.set("error", message)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next")
  const roleParam = searchParams.get("role")
  const oauthError =
    searchParams.get("error_description") ||
    searchParams.get("error")

  if (oauthError) {
    return loginErrorRedirect(origin, oauthError)
  }

  if (!code) {
    return loginErrorRedirect(origin, "Google sign-in did not complete. Try again.")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return loginErrorRedirect(origin, "Auth is not configured.")
  }

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(toSet) {
        cookiesToSet.push(...toSet)
      },
    },
  })

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError || !data.user) {
    console.error("[auth/callback]", exchangeError?.message)
    return loginErrorRedirect(
      origin,
      exchangeError?.message || "Could not complete Google sign-in."
    )
  }

  const redirect = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin))
    for (const { name, value, options } of cookiesToSet) {
      res.cookies.set(name, value, options)
    }
    return res
  }

  if (next === "reset-password") {
    return redirect("/reset-password")
  }

  const nextPath = safeInternalPath(next)
  const user = data.user

  if (roleParam === "student" || roleParam === "recruiter") {
    try {
      await Promise.race([
        supabase.from("profiles").update({ role: roleParam }).eq("id", user.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
      ])
    } catch (err) {
      console.error("[auth/callback] role update:", err)
    }
  }

  let profile: { role?: string | null } | null = null
  try {
    const result = await Promise.race([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
    ])
    profile = result.data
  } catch (err) {
    console.error("[auth/callback] profile lookup:", err)
    return redirect("/onboarding")
  }

  const role = roleParam === "student" || roleParam === "recruiter" ? roleParam : profile?.role
  let studentReady = false
  let recruiterReady = false
  if (role === "student") {
    try {
      const result = await Promise.race([
        supabase.from("student_profiles").select(STUDENT_ONBOARDING_SELECT).eq("id", user.id).maybeSingle(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
      ])
      studentReady = isStudentOnboardingComplete(result.data)
    } catch (err) {
      console.error("[auth/callback] student profile lookup:", err)
      return redirect("/onboarding")
    }
  }
  if (role === "recruiter") {
    try {
      const result = await Promise.race([
        supabase.from("recruiter_profiles").select(RECRUITER_ONBOARDING_SELECT).eq("id", user.id).maybeSingle(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
      ])
      recruiterReady = isRecruiterOnboardingComplete(result.data)
    } catch (err) {
      console.error("[auth/callback] recruiter profile lookup:", err)
      return redirect("/onboarding")
    }
  }

  if (!profile) return redirect("/onboarding")
  return redirect(postAuthRedirect({ role, studentReady, recruiterReady, next: nextPath }))
}
