"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export function ApproveButton({ recruiterId, isApproved }: { recruiterId: string; isApproved: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const toggle = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("recruiter_profiles").update({ is_approved: !isApproved }).eq("id", recruiterId)
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      toast({ title: isApproved ? "Revoked" : "Approved!" })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button variant={isApproved ? "outline" : "gradient"} size="sm" className="w-full" onClick={toggle} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isApproved ? (
        <><XCircle className="h-4 w-4" />Revoke</>
      ) : (
        <><CheckCircle className="h-4 w-4" />Approve</>
      )}
    </Button>
  )
}
