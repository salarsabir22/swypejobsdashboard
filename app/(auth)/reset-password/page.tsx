"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
    3: { score: 3, label: "Good", color: "bg-primary" },
    4: { score: 4, label: "Strong", color: "bg-neutral-800" },
  }
  return map[score as keyof typeof map]
}

const REQUIREMENTS = [
  { label: "At least 8 characters", check: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", check: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", check: (p: string) => /[0-9]/.test(p) },
]

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)

  const strength = getPasswordStrength(password)

  useEffect(() => {
    const supabase = createClient()
    const check = async () => {
      await new Promise(r => setTimeout(r, 600))
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) { setSessionError(true); return }
      setSessionReady(true)
    }
    check()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    if (password !== confirm) { setError("Passwords don't match - please try again"); return }
    if (strength.score < 2) { setError("Choose a stronger password"); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setLoading(false)
      if (error.message.includes("same password")) {
        setError("Your new password must be different from your current password")
      } else {
        setError(error.message)
      }
      return
    }

    setDone(true)
    setTimeout(() => { window.location.href = "/login" }, 3000)
  }

  if (!sessionReady && !sessionError) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-8" role="status" aria-label="Verifying your reset link">
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto h-7 w-48" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (sessionError) {
    return (
      <Card>
        <CardHeader className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Reset link</p>
          <CardTitle>Link expired or invalid</CardTitle>
          <CardDescription>
            Reset links last <span className="font-medium text-foreground">1 hour</span> and work once.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 font-body text-xs text-muted-foreground">Request a fresh link below.</p>
          <Button asChild className="mb-3 w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/login">← Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card>
        <CardHeader className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Complete</p>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>You&apos;re all set. Redirecting to sign in…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-body text-sm">Loading login</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Security</p>
        <CardTitle>New password</CardTitle>
        <CardDescription>Choose something strong you haven&apos;t used before</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleReset} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">New password</Label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                autoComplete="new-password"
                autoFocus
                className="pr-11"
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
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        i <= strength.score ? strength.color : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                {strength.label && (
                  <p className="font-data text-[10px] text-muted-foreground">
                    Strength: <span className="text-foreground">{strength.label}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1 pt-1">
              {REQUIREMENTS.map(({ label, check }) => {
                const ok = check(password)
                return (
                  <div key={label} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full transition-colors",
                        ok ? "bg-emerald-500" : "bg-border"
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "font-body text-[11px] transition-colors",
                        ok ? "text-muted-foreground" : "text-muted-foreground/50"
                      )}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reset-confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="reset-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value)
                  setError(null)
                }}
                autoComplete="new-password"
                className={cn(
                  "pr-11",
                  confirm.length > 0 && confirm !== password ? "border-destructive" : ""
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirm.length > 0 && (
              <p
                className={cn(
                  "font-body text-[11px]",
                  confirm === password ? "text-emerald-700" : "text-destructive"
                )}
              >
                {confirm === password ? "Passwords match" : "Doesn't match yet"}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || password !== confirm || password.length < 8}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Updating…
              </>
            ) : (
              "Set password"
            )}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <Button variant="ghost" asChild>
            <Link href="/login">← Back to sign in</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
