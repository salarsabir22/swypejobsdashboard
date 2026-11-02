"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"

export function AcceptEmployerInvite({ token }: { token: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const accept = async () => {
    setBusy(true)
    const res = await fetch(`/api/invite/employer/${token}/accept`, { method: "POST" })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res.ok) {
      toast({ variant: "destructive", title: "Couldn’t accept", description: json.error })
      return
    }
    toast({ title: "Partnership active" })
    router.push("/partnerships")
  }

  return (
    <Button type="button" className="rounded-full" loading={busy} onClick={() => void accept()}>
      Accept invitation
    </Button>
  )
}
