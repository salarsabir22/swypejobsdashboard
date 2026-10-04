"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn, getInitials } from "@/lib/utils"

function Face({
  src,
  name,
  contain,
}: {
  src?: string | null
  name: string
  contain?: boolean
}) {
  return (
    <div
      className={cn(
        "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary ring-2 ring-background sm:h-20 sm:w-20",
        contain && "bg-white"
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className={cn("h-full w-full", contain ? "object-contain p-2" : "object-cover object-top")}
        />
      ) : (
        <span>{getInitials(name || "?")}</span>
      )}
    </div>
  )
}

export function MatchModal({
  open,
  onOpenChange,
  name,
  chatHref,
  imageUrl,
  selfImageUrl,
  selfName = "You",
  audience = "student",
  selfContain,
  imageContain,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  chatHref: string | null
  imageUrl?: string | null
  selfImageUrl?: string | null
  selfName?: string
  audience?: "student" | "recruiter"
  selfContain?: boolean
  imageContain?: boolean
}) {
  const recruiter = audience === "recruiter"
  const title = "You’re connected"
  const description = recruiter
    ? `You can now message ${name} about this role.`
    : `${name} shortlisted you. You can now message them about this role.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md !overflow-visible px-5 py-6 text-center sm:text-center">
        <DialogHeader className="items-center space-y-3 text-center sm:text-center">
          <div className="flex items-center justify-center pt-1">
            <Face src={selfImageUrl} name={selfName} contain={selfContain} />
            <div className="relative z-10 -mx-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background">
              <Heart className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
            </div>
            <Face src={imageUrl} name={name} contain={imageContain} />
          </div>
          <DialogTitle className="font-heading text-2xl tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-center leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {chatHref ? (
            <Button asChild className="w-full rounded-full">
              <Link href={chatHref}>Open conversation</Link>
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => onOpenChange(false)}>
            {recruiter ? "Continue reviewing" : "Continue browsing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
