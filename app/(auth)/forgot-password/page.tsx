"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Loader2, CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const validate = () => {
    if (!email.trim()) {
      setError("Please enter your email address")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address")
      return false
    }
    return true
  }

  const sendReset = async (isResend = false) => {
    setError(null)
    if (!validate()) return
    if (isResend) setResending(true)
    else setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      setResending(false)
      return
    }

    if (isResend) {
      setResending(false)
      setResent(true)
      setTimeout(() => setResent(false), 4000)
    } else {
      setLoading(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">Check your inbox</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            We sent a reset link to <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <div>
          <div className="mb-5 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            {[
              { n: "1", text: "Open the email from swypejobs" },
              { n: "2", text: "Click “Reset your password”" },
              { n: "3", text: "Choose a new password" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                  <span className="text-[10px] font-bold text-foreground">{n}</span>
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <Alert className="mb-5">
            <AlertDescription>
              Link expires in <span className="font-medium text-foreground">1 hour</span>. Check spam if needed.
            </AlertDescription>
          </Alert>

          <Button
            type="button"
            variant="outline"
            className="mb-4 h-12 w-full border border-[#14102e]/30 bg-white font-semibold hover:bg-secondary"
            onClick={() => sendReset(true)}
            disabled={resending || resent}
          >
            {resending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : resent ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">Sent again</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" /> Resend email
              </>
            )}
          </Button>

          <div className="text-center">
            <Button variant="ghost" asChild>
              <Link href="/login">
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                Back to sign in
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">Reset password</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">We&apos;ll email you a secure link</p>
      </div>
      <div>
        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void sendReset()
          }}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">Email address</Label>
            <Input
              id="forgot-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              autoComplete="email"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">Only sent if an account exists</p>
          </div>

          <Button type="submit" className="h-12 w-full text-[15px] font-semibold" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button variant="ghost" asChild>
            <Link href="/login">
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Back to sign in
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
