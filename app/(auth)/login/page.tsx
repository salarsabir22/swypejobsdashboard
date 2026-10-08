"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { googleStartUrl, usesLocalGoogle } from "@/lib/auth-sites"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { safeInternalPath } from "@/lib/utils"
import {
  isStudentOnboardingComplete,
  isRecruiterOnboardingComplete,
  postAuthRedirect,
  STUDENT_ONBOARDING_SELECT,
  RECRUITER_ONBOARDING_SELECT,
} from "@/lib/profile/completeness"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("error")
    if (!raw) return
    const decoded = decodeURIComponent(raw.replace(/\+/g, " "))
    if (decoded === "auth_callback_error") {
      setError("Google sign-in did not complete. Check that Google is enabled in Supabase and try again.")
      return
    }
    setError(decoded)
  }, [])

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address"
    if (!password) errs.password = "Password is required"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      if (error.message.includes("Invalid login")) setError("Incorrect email or password. Please try again.")
      else if (error.message.includes("Email not confirmed")) setError("Please verify your email before signing in. Check your inbox.")
      else setError(error.message)
      return
    }
    setSuccess(true)
    const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"))
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
    let studentReady = false
    let recruiterReady = false
    if (profile?.role === "student") {
      const { data: student } = await supabase
        .from("student_profiles")
        .select(STUDENT_ONBOARDING_SELECT)
        .eq("id", data.user.id)
        .maybeSingle()
      studentReady = isStudentOnboardingComplete(student)
    }
    if (profile?.role === "recruiter") {
      const { data: recruiter } = await supabase
        .from("recruiter_profiles")
        .select(RECRUITER_ONBOARDING_SELECT)
        .eq("id", data.user.id)
        .maybeSingle()
      recruiterReady = isRecruiterOnboardingComplete(recruiter)
    }
    window.location.href = postAuthRedirect({
      role: profile?.role,
      studentReady,
      recruiterReady,
      next,
    })
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    const nextPath = safeInternalPath(new URLSearchParams(window.location.search).get("next"))
    if (!usesLocalGoogle(window.location.origin)) {
      window.location.href = googleStartUrl(window.location.origin, { next: nextPath })
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${
          nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
        }`,
      },
    })
    if (error) {
      setError(error.message || "Google sign-in failed. Please try again.")
      setGoogleLoading(false)
    }
  }

  const inputClass =
    "h-12 rounded-full border-input bg-white px-5 text-[15px] focus-visible:ring-primary focus-visible:ring-offset-0"

  return (
    <div>
      <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Sign in to swypejobs.</p>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mt-6 border-[var(--lp-mint-ink)]/40 bg-[#e6fbf2]">
          <AlertDescription>Signed in. Redirecting…</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-8 h-12 w-full border border-[#14102e]/30 bg-white text-[15px] font-semibold text-foreground hover:bg-secondary"
        onClick={handleGoogleLogin}
        disabled={googleLoading || loading}
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="relative my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[12px] text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleLogin} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); setError(null) }}
            autoComplete="email"
            className={`${inputClass} ${fieldErrors.email ? "border-destructive" : ""}`}
          />
          {fieldErrors.email && (
            <p className="mt-1 pl-1 text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); setError(null) }}
              autoComplete="current-password"
              className={`${inputClass} pr-12 ${fieldErrors.password ? "border-destructive" : ""}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 pl-1 text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <Button type="submit" className="h-12 w-full text-[15px] font-semibold" disabled={loading || success}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
