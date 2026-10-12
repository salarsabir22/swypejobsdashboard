"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { googleStartUrl, usesLocalGoogle } from "@/lib/auth-sites"
import { provisionUniversityAccount } from "@/lib/campus/provision"
import { safeInternalPath } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

export default function UniversityLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("error")
    if (!raw) return
    setError(decodeURIComponent(raw.replace(/\+/g, " ")))
  }, [])

  const openCampus = async (userId: string) => {
    const supabase = createClient()
    const { data: userData } = await supabase.auth.getUser()
    const meta = userData.user?.user_metadata || {}
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
    const { data: staff } = await supabase.from("campus_staff").select("university").eq("user_id", userId).maybeSingle()
    const university = (staff?.university as string | undefined) || (meta.university as string | undefined) || ""
    const needsOffice = profile?.role !== "university" || !staff?.university

    if (needsOffice && meta.role === "university" && university) {
      const saved = await provisionUniversityAccount({
        university,
        staffRole: meta.staff_role as string | undefined,
        fullName: meta.full_name as string | undefined,
      })
      if (!saved.ok && profile?.role !== "university") {
        await supabase.auth.signOut()
        setError(saved.message)
        setLoading(false)
        return
      }
    } else if (profile?.role !== "university") {
      await supabase.auth.signOut()
      setError("This sign-in is for university career offices. Students and recruiters use the main sign-in.")
      setLoading(false)
      return
    }

    const next = safeInternalPath(new URLSearchParams(window.location.search).get("next"))
    window.location.href = next && next.startsWith("/campus") ? next : "/campus"
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const errs: { email?: string; password?: string } = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address"
    if (!password) errs.password = "Password is required"
    setFieldErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    const supabase = createClient()
    const { data, error: signError } = await supabase.auth.signInWithPassword({ email, password })
    if (signError || !data.user) {
      setLoading(false)
      if (signError?.message.includes("Invalid login")) setError("Incorrect email or password.")
      else if (signError?.message.includes("Email not confirmed")) setError("Confirm your email, then sign in.")
      else setError(signError?.message || "Could not sign in.")
      return
    }
    await openCampus(data.user.id)
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setGoogleLoading(true)
    const next = "/campus"
    if (!usesLocalGoogle(window.location.origin)) {
      window.location.href = googleStartUrl(window.location.origin, { role: "university", next })
      return
    }
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?portal=university&next=${encodeURIComponent(next)}`,
      },
    })
    if (oauthError) {
      setError(oauthError.message || "Google sign-in failed.")
      setGoogleLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
        Career office sign in
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">Outcomes and student activity for your university.</p>

      {error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="mt-8 h-12 w-full border border-[#14102e]/30 bg-white text-[15px] font-semibold hover:bg-secondary"
        onClick={() => void handleGoogleLogin()}
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

      <form onSubmit={(e) => void handleLogin(e)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="uni-login-email">Email</Label>
          <Input
            id="uni-login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@university.edu"
            className="h-12 rounded-full bg-white px-5"
          />
          {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="uni-login-password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="uni-login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 rounded-full bg-white px-5 pr-12"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
        </div>
        <Button type="submit" className="h-12 w-full text-[15px] font-semibold" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New career office?{" "}
        <Link href="/university/signup" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Student or recruiter?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Main sign in
        </Link>
      </p>
    </div>
  )
}
