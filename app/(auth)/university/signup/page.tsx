"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { googleStartUrl, usesLocalGoogle } from "@/lib/auth-sites"
import { provisionUniversityAccount } from "@/lib/campus/provision"
import { UniversityPicker } from "@/components/profile/UniversityPicker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const STAFF_ROLES = [
  { id: "director", label: "Career services director" },
  { id: "advisor", label: "Advisor" },
  { id: "dean", label: "Dean" },
] as const

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

export default function UniversitySignupPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [university, setUniversity] = useState("")
  const [staffRole, setStaffRole] = useState<(typeof STAFF_ROLES)[number]["id"]>("advisor")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [verifyMode, setVerifyMode] = useState(false)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!fullName.trim() || fullName.trim().length < 2) errs.fullName = "Full name is required"
    if (!university.trim() || university === "Other (type your own)") errs.university = "Choose your university"
    if (!email) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address"
    if (!password) errs.password = "Password is required"
    else if (password.length < 6) errs.password = "Password must be at least 6 characters"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const rememberOffice = () => {
    localStorage.setItem("pending_role", "university")
    localStorage.setItem("pending_university", university.trim())
    localStorage.setItem("pending_staff_role", staffRole)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: "university",
          university: university.trim(),
          staff_role: staffRole,
        },
      },
    })
    if (signError) {
      setLoading(false)
      if (signError.message.includes("already registered") || signError.message.includes("already exists")) {
        setError("An account with this email already exists. Sign in instead.")
      } else {
        setError(signError.message)
      }
      return
    }
    if (data.session) {
      const saved = await provisionUniversityAccount({
        university: university.trim(),
        staffRole,
        fullName: fullName.trim(),
      })
      if (!saved.ok) {
        setError(saved.message)
        setLoading(false)
        return
      }
      window.location.href = "/campus"
      return
    }
    rememberOffice()
    setVerifyMode(true)
    setLoading(false)
  }

  const handleGoogleSignup = async () => {
    setError(null)
    if (!university.trim() || university === "Other (type your own)") {
      setFieldErrors((prev) => ({ ...prev, university: "Choose your university" }))
      return
    }
    setGoogleLoading(true)
    rememberOffice()
    if (!usesLocalGoogle(window.location.origin)) {
      window.location.href = googleStartUrl(window.location.origin, { role: "university", next: "/campus" })
      return
    }
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=university&portal=university&next=${encodeURIComponent("/campus")}`,
      },
    })
    if (oauthError) {
      localStorage.removeItem("pending_role")
      setError("Google signup failed. Please try again.")
      setGoogleLoading(false)
    }
  }

  if (verifyMode) {
    return (
      <div>
        <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">Check your inbox</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          After you confirm, sign in to open the career office for {university}.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/university/login" className="font-medium text-primary hover:underline">
            Go to career office sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
        Career office account
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">For university staff. Students use the main signup.</p>

      {error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>
            {error}
            {error.includes("already exists") ? (
              <Link href="/university/login" className="mt-1 block text-xs text-primary hover:underline">
                Go to sign in
              </Link>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="mt-8 h-12 w-full border border-[#14102e]/30 bg-white font-semibold hover:bg-secondary"
        onClick={() => void handleGoogleSignup()}
        disabled={googleLoading || loading}
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Google
      </Button>

      <div className="relative my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[12px] text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={(e) => void handleSignup(e)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="uni-name">Full name</Label>
          <Input
            id="uni-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            placeholder="Ayesha Khan"
            className="h-12 rounded-full bg-white px-5"
          />
          {fieldErrors.fullName ? <p className="text-xs text-destructive">{fieldErrors.fullName}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label>University</Label>
          <UniversityPicker value={university} onChange={setUniversity} />
          {fieldErrors.university ? <p className="text-xs text-destructive">{fieldErrors.university}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uni-role">Role at the office</Label>
          <select
            id="uni-role"
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as (typeof STAFF_ROLES)[number]["id"])}
            className="h-12 w-full rounded-full border border-input bg-white px-5 text-sm"
          >
            {STAFF_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="uni-email">Work email</Label>
          <Input
            id="uni-email"
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
          <Label htmlFor="uni-password">Password</Label>
          <div className="relative">
            <Input
              id="uni-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
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
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            "Create career office account"
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/university/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        Student or recruiter?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Use the main signup
        </Link>
      </p>
    </div>
  )
}
