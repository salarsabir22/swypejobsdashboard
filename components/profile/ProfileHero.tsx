"use client"

import { useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const MAX_MB = 8

function cacheBust(url: string) {
  const join = url.includes("?") ? "&" : "?"
  return `${url}${join}t=${Date.now()}`
}

export function ProfileHero({
  userId,
  name,
  headline,
  subline,
  avatarUrl,
  coverUrl,
  editable = false,
  photoKind = "avatar",
  actions,
}: {
  userId: string
  name: string
  headline?: string | null
  subline?: ReactNode
  avatarUrl?: string | null
  coverUrl?: string | null
  editable?: boolean
  photoKind?: "avatar" | "logo"
  actions?: ReactNode
}) {
  const router = useRouter()
  const { toast } = useToast()
  const coverInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [cover, setCover] = useState(coverUrl || "")
  const [photo, setPhoto] = useState(avatarUrl || "")
  const [busy, setBusy] = useState<"cover" | "photo" | null>(null)

  const upload = async (kind: "cover" | "photo", file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Use an image file" })
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({ variant: "destructive", title: `Keep it under ${MAX_MB}MB` })
      return
    }

    setBusy(kind)
    const supabase = createClient()
    const bucket = kind === "photo" && photoKind === "logo" ? "logos" : "avatars"
    const path = kind === "cover" ? `${userId}/cover` : photoKind === "logo" ? `${userId}/logo` : `${userId}/avatar`

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    })
    if (uploadError) {
      toast({ variant: "destructive", title: "Could not upload", description: uploadError.message })
      setBusy(null)
      return
    }

    const publicUrl = cacheBust(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl)

    if (kind === "cover") {
      const { error } = await supabase.from("profiles").update({ cover_url: publicUrl }).eq("id", userId)
      if (error) {
        toast({ variant: "destructive", title: "Could not save cover", description: error.message })
        setBusy(null)
        return
      }
      setCover(publicUrl)
      toast({ title: "Cover photo updated" })
    } else if (photoKind === "logo") {
      const [{ error: logoError }, { error: avatarError }] = await Promise.all([
        supabase.from("recruiter_profiles").update({ logo_url: publicUrl }).eq("id", userId),
        supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId),
      ])
      if (logoError || avatarError) {
        toast({
          variant: "destructive",
          title: "Could not save photo",
          description: logoError?.message || avatarError?.message,
        })
        setBusy(null)
        return
      }
      setPhoto(publicUrl)
      toast({ title: "Profile photo updated" })
    } else {
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId)
      if (error) {
        toast({ variant: "destructive", title: "Could not save photo", description: error.message })
        setBusy(null)
        return
      }
      setPhoto(publicUrl)
      toast({ title: "Profile photo updated" })
    }

    setBusy(null)
    router.refresh()
  }

  const onFile = (kind: "cover" | "photo") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) void upload(kind, file)
  }

  const rounded = photoKind === "logo"

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="apple-vibrancy-header relative h-32 sm:h-40">
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-black/15" />
        {editable ? (
          <>
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onFile("cover")}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute bottom-3 right-3 h-8 rounded-full bg-white/95 text-foreground shadow-sm hover:bg-white"
              disabled={busy !== null}
              onClick={() => coverInput.current?.click()}
            >
              {busy === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {cover ? "Change cover" : "Add cover"}
            </Button>
          </>
        ) : null}
      </div>

      <div className="px-5 pb-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="relative -mt-12 shrink-0 sm:-mt-14">
              {rounded ? (
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-card ring-4 ring-card sm:h-[6.5rem] sm:w-[6.5rem]">
                  {photo ? (
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-heading text-xl font-semibold text-muted-foreground">{getInitials(name)}</span>
                  )}
                </div>
              ) : (
                <Avatar className="h-24 w-24 ring-4 ring-card sm:h-[6.5rem] sm:w-[6.5rem]">
                  <AvatarImage src={photo || undefined} />
                  <AvatarFallback className="text-xl font-semibold">{getInitials(name)}</AvatarFallback>
                </Avatar>
              )}
              {editable ? (
                <>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={onFile("photo")}
                  />
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-card disabled:opacity-60"
                    disabled={busy !== null}
                    aria-label={photo ? "Change profile photo" : "Add profile photo"}
                    onClick={() => photoInput.current?.click()}
                  >
                    {busy === "photo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                  </button>
                </>
              ) : null}
            </div>
            <div className="min-w-0 pt-3 sm:pt-4">
              <h1 className="truncate font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                {name}
              </h1>
              {headline ? <p className="mt-1 truncate font-body text-sm text-muted-foreground">{headline}</p> : null}
              {subline ? <div className="mt-1">{subline}</div> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2 sm:pt-4">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}
