"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function JobToggleButton({ jobId, isActive }: { jobId: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const toggle = async () => {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from("jobs").update({ is_active: !isActive }).eq("id", jobId)
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      toast({ title: isActive ? "Job paused" : "Job activated" })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button
      variant={isActive ? "outline" : "gradient"}
      className="h-12 w-full rounded-xl font-body font-medium"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : isActive ? "Pause listing" : "Activate listing"}
    </Button>
  )
}
