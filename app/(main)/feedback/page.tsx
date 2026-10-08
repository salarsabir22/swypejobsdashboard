"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function FeedbackPage() {
  const { toast } = useToast()
  const [liked, setLiked] = useState("")
  const [disliked, setDisliked] = useState("")
  const [improve, setImprove] = useState("")
  const [sending, setSending] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!liked.trim() && !disliked.trim() && !improve.trim()) {
      toast({ variant: "destructive", title: "Write something first", description: "Add at least one comment so we can act on it." })
      return
    }
    setSending(true)
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const user = data.user
    if (!user) {
      setSending(false)
      return
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    const { error } = await supabase.from("product_feedback").insert({
      user_id: user.id,
      role: profile?.role ?? null,
      liked: liked.trim() || null,
      disliked: disliked.trim() || null,
      improve: improve.trim() || null,
    })
    setSending(false)
    if (error) {
      toast({ variant: "destructive", title: "Could not send", description: error.message })
      return
    }
    setLiked("")
    setDisliked("")
    setImprove("")
    toast({ title: "Thanks", description: "We’ll read this and use it to improve the product." })
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl sm:text-[2.25rem] font-semibold">Feedback</h1>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          Tell us what works, what doesn’t, and what to build next.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">What do you think?</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void submit(e)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="liked">What you like</Label>
              <Textarea
                id="liked"
                className="min-h-[88px] rounded-xl"
                placeholder="Discover, chat, applications — whatever is working."
                value={liked}
                onChange={(e) => setLiked(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disliked">What isn’t working</Label>
              <Textarea
                id="disliked"
                className="min-h-[88px] rounded-xl"
                placeholder="Be specific. Bugs, confusing copy, missing context."
                value={disliked}
                onChange={(e) => setDisliked(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="improve">What we should add next</Label>
              <Textarea
                id="improve"
                className="min-h-[88px] rounded-xl"
                placeholder="Features, copy, or anything you expected and didn’t find."
                value={improve}
                onChange={(e) => setImprove(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 w-full rounded-full" disabled={sending}>
              {sending ? "Sending…" : "Send feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
