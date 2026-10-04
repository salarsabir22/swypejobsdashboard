"use client"

import { useEffect, useState } from "react"
import { Share2, Check, Copy, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/lib/hooks/use-toast"
import { canNativeShare, copyShareLink, shareOrCopyLink } from "@/lib/share/share-link"
import { cn } from "@/lib/utils"

type ShareButtonProps = {
  path: string
  title: string
  label?: string
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "icon"
}

function notifyShareResult(
  toast: ReturnType<typeof useToast>["toast"],
  result: "shared" | "copied" | "aborted" | "failed"
) {
  if (result === "copied") {
    toast({ title: "Link copied", description: "Anyone with the link can open this profile." })
  } else if (result === "failed") {
    toast({ variant: "destructive", title: "Could not copy link" })
  }
}

export function ShareButton({
  path,
  title,
  label = "Share",
  className,
  variant = "outline",
  size = "sm",
}: ShareButtonProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [native, setNative] = useState(false)

  useEffect(() => {
    setNative(canNativeShare())
  }, [])

  const markCopied = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copy = async () => {
    const result = await copyShareLink(path)
    notifyShareResult(toast, result)
    if (result === "copied") markCopied()
  }

  const shareNative = async () => {
    const result = await shareOrCopyLink({ path, title })
    notifyShareResult(toast, result)
    if (result === "copied") markCopied()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("rounded-full gap-1.5", className)}
          aria-label={label}
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {size !== "icon" ? (copied ? "Copied" : label) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => void copy()}>
          <Copy />
          Copy link
        </DropdownMenuItem>
        {native ? (
          <DropdownMenuItem onSelect={() => void shareNative()}>
            <Send />
            Share via…
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ShareProfileMenuItem({
  path,
  title,
}: {
  path: string
  title: string
}) {
  const { toast } = useToast()

  return (
    <DropdownMenuItem
      onSelect={() => {
        void shareOrCopyLink({ path, title }).then((result) => {
          notifyShareResult(toast, result)
        })
      }}
    >
      <Share2 />
      Share profile
    </DropdownMenuItem>
  )
}
