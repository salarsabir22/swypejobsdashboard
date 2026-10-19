"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { CheckCircle, XCircle } from "lucide-react"

export function ApproveButton({ recruiterId, isApproved }: { recruiterId: string; isApproved: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const toggle = async () => {
    setLoading(true)
    try {
      const action = isApproved ? "suspend" : "approve"
      const res = await fetch("/api/admin/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterId,
          action,
          reason: isApproved ? "suspended" : "verified",
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: data.error || "Could not update" })
        return
      }
      toast({ title: isApproved ? "Revoked" : "Approved!" })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Could not update",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={isApproved ? "outline" : "gradient"}
      size="sm"
      className="w-full"
      onClick={toggle}
      loading={loading}
      loadingText={isApproved ? "Revoking…" : "Approving…"}
    >
      {isApproved ? (
        <>
          <XCircle className="h-4 w-4" />
          Revoke
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4" />
          Approve
        </>
      )}
    </Button>
  )
}
