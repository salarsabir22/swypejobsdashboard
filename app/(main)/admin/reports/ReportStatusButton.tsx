"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function ReportStatusButton({
  id,
  nextStatus,
  label,
}: {
  id: string
  nextStatus: "reviewed" | "dismissed"
  label: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        const supabase = createClient()
        await supabase.from("reports").update({ status: nextStatus }).eq("id", id)
        router.refresh()
        setBusy(false)
      }}
    >
      {label}
    </Button>
  )
}
