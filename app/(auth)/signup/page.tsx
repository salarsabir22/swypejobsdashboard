"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { googleStartUrl, usesLocalGoogle } from "@/lib/auth-sites"
import { cn } from "@/lib/utils"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string }

function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: "", color: "" }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map: Record<number, PasswordStrength> = {
    0: { score: 0, label: "", color: "" },
    1: { score: 1, label: "Weak", color: "bg-red-500" },
    2: { score: 2, label: "Fair", color: "bg-neutral-400" },
    3: { score: 3, label: "Good", color: "bg-blue-500" },
    4: { score: 4, label: "Strong", color: "bg-neutral-1000" },
  }
  return map[score as keyof typeof map]
}

type SignupRole = "student" | "recruiter"

const ROLE_INFO: Record<SignupRole, { label: string; description: string }> = {
  student: {
    label: "Student",
    description: "Browse roles, get matched, message when it’s mutual.",
  },
  recruiter: {
    label: "Recruiter",
    description: "Post jobs and shortlist candidates. Account review may apply.",
  },
}

export default function SignupPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<SignupRole>("student")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [verifyMode, setVerifyMode] = useState(false)

  const strength = getPasswordStrength(password)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!fullName.trim()) errs.fullName = "Full name is required"
    else if (fullName.trim().length < 2) errs.fullName = "Name must be at least 2 characters"
    if (!email) errs.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address"
    if (!password) errs.password = "Password is required"
    else if (password.length < 6) errs.password = "Password must be at least 6 characters"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const clearFieldError = (field: string) => {
    setFieldErrors(p => { const n = { ...p }; delete n[field]; return n })
    setError(null)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim(), role } },
    })
    if (error) {
      setLoading(false)
      if (error.message.includes("already registered") || error.message.includes("already exists")) {
        setError("An account with this email already exists. Try signing in instead.")
      } else {
        setError(error.message)
      }
      return
    }
    if (data.session) {
      const supabase2 = createClient()
      await supabase2.from("profiles").update({ role }).eq("id", data.user!.id)
      window.location.href = "/onboarding"
    } else if (data.user) {
      setVerifyMode(true)
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setGoogleLoading(true)
    localStorage.setItem("pending_role", role)
    if (!usesLocalGoogle(window.location.origin)) {
      window.location.href = googleStartUrl(window.location.origin, { role })
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?role=${role}` },
    })
    if (error) {
      localStorage.removeItem("pending_role")
      setError("Google signup failed. Please try again.")
      setGoogleLoading(false)
    }
  }

  if (verifyMode) {
    return (
      <Card>
        <CardHeader className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Verify email</p>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-5 rounded-xl border border-border bg-muted/50 p-3.5 text-left">
            <p className="mb-2 font-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Next steps</p>
            <ol className="list-inside list-decimal space-y-1">
              <li className="font-body text-xs text-muted-foreground">Open the email from swypejobs</li>
              <li className="font-body text-xs text-muted-foreground">Click &quot;Confirm your email&quot;</li>
              <li className="font-body text-xs text-muted-foreground">Complete your profile</li>
            </ol>
          </div>
          <p className="text-center font-body text-xs text-muted-foreground">
            Didn&apos;t receive it? Check spam or{" "}
            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setVerifyMode(false)}>
              try again
            </Button>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <p className="mb-2 font-data text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Welcome</p>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Free - under a minute</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5">
          <p className="mb-2 font-data text-[11px] uppercase tracking-[0.2em] text-muted-foreground">I am joining as…</p>
          <div className="grid grid-cols-2 gap-3">
            {(["student", "recruiter"] as SignupRole[]).map((r) => {
              const { label, description } = ROLE_INFO[r]
              const active = role === r
              return (
                <Button
                  key={r}
                  type="button"
                  variant={active ? "secondary" : "outline"}
                  onClick={() => setRole(r)}
                  className={cn(
                    "h-auto whitespace-normal rounded-2xl px-3.5 py-3 text-left",
                    active ? "border-primary bg-primary/10" : ""
                  )}
                >
                  <span className="flex flex-col items-start gap-1.5">
                    <span className={cn("text-[13px] font-semibold tracking-[-0.02em]", active ? "text-primary" : "text-foreground")}>
                      {label}
                    </span>
                    <span className="text-[11px] font-normal leading-snug text-muted-foreground">{description}</span>
                  </span>
                </Button>
              )
            })}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>
              {error}
              {error.includes("already exists") && (
                <Link href="/login" className="mt-1 inline-block font-body text-xs text-primary hover:underline">
                  Go to sign in →
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          variant="outline"
          className="mb-4 w-full"
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
        >
          {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
          Google - {role === "student" ? "Student" : "Recruiter"}
        </Button>

        <div className="relative mb-4 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="font-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">or email</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSignup} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="signup-name">Full name</Label>
            <Input
              id="signup-name"
              placeholder="Jane Smith"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); clearFieldError("fullName") }}
              autoComplete="name"
              className={fieldErrors.fullName ? "border-destructive" : ""}
            />
            {fieldErrors.fullName && (
              <p className="pl-0.5 font-body text-xs text-destructive">{fieldErrors.fullName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Email address</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError("email") }}
              autoComplete="email"
              className={fieldErrors.email ? "border-destructive" : ""}
            />
            {fieldErrors.email && (
              <p className="pl-0.5 font-body text-xs text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearFieldError("password") }}
                autoComplete="new-password"
                className={`pr-11 ${fieldErrors.password ? "border-destructive" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-300", i <= strength.score ? strength.color : "bg-muted")} />
                  ))}
                </div>
                <p className="font-data text-[10px] text-muted-foreground">
                  {strength.score < 3 && "Use uppercase, numbers & symbols"}
                  {strength.score >= 3 && (
                    <span className="text-foreground/80">{strength.label} password</span>
                  )}
                </p>
              </div>
            )}
            {fieldErrors.password && (
              <p className="pl-0.5 font-body text-xs text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          {role === "recruiter" && (
            <Alert>
              <AlertDescription>
                Recruiter accounts are reviewed before you can post jobs.
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-center font-body text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary transition-colors hover:opacity-80">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center font-body text-[10px] text-muted-foreground">
          By signing up you agree to our{" "}
          <a href="#" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Privacy
          </a>
        </p>
      </CardContent>
    </Card>
  )
}
