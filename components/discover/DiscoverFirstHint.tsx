"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

const KEY = "jm-discover-hint-v1"

export function DiscoverFirstHint({ audience }: { audience: "student" | "recruiter" }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(KEY) !== "1")
    } catch {
      setOpen(true)
    }
  }, [])

  if (!open) return null

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <p className="font-body text-xs leading-relaxed text-muted-foreground">
        {audience === "student"
          ? "Apply sends your profile. Chat opens only after they shortlist you. Pass notifies nobody."
          : "Applicants for this role show first. Shortlist can open chat; pass hides them for this job."}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 rounded-full px-2.5 text-xs"
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, "1")
          } catch {
            /* ignore */
          }
          setOpen(false)
        }}
      >
        Got it
      </Button>
    </div>
  )
}
