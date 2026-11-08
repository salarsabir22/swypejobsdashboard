"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"

export function PartnershipReviewButtons({ id }: { id: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const setStatus = async (status: "active" | "declined") => {
    const supabase = createClient()
    const { error } = await supabase
      .from("campus_employer_partners")
      .update({
        notes: status === "active" ? "Approved by CDC" : "Declined by CDC",
        tier: status === "active" ? "preferred" : "standard",
      })
      .eq("id", id)
    if (error) toast({ variant: "destructive", title: "Couldn’t update", description: error.message })
    else {
      toast({ title: status === "active" ? "Employer approved" : "Employer declined" })
      router.refresh()
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" className="rounded-full" onClick={() => void setStatus("active")}>
        Approve
      </Button>
      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => void setStatus("declined")}>
        Decline
      </Button>
    </div>
  )
}
