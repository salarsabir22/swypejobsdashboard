"use client"

import { useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Video, Upload, Mic, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const BUCKET = "profile-videos"
const MAX_FILE_MB = 50
const MAX_DURATION_MS = 120_000 // 2 min

interface ProfileVideoSectionProps {
  userId: string
  profileVideoUrl: string | null
  onUpdate: (url: string | null) => void
}

export function ProfileVideoSection({ userId, profileVideoUrl, onUpdate }: ProfileVideoSectionProps) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const supabase = createClient()

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max ${MAX_FILE_MB}MB`, variant: "destructive" })
      return
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4"
    const path = `${userId}/video.${ext}`
    setUploading(true)
    try {
      await supabase.storage.from(BUCKET).remove([`${userId}/video.mp4`, `${userId}/video.webm`, `${userId}/video.mov`])
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase.from("profiles").update({ profile_video_url: url }).eq("id", userId)
      if (updateError) throw updateError
      onUpdate(url)
      toast({ title: "Video updated", description: "Saved to your profile." })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Try again"
      toast({ title: "Upload failed", description: msg, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }, [userId, supabase, onUpdate, toast])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setPreviewUrl(null)
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream
        videoPreviewRef.current.muted = true
        await videoPreviewRef.current.play().catch(() => {})
      }
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null
        }
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const url = URL.createObjectURL(blob)
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        const file = new File([blob], "recording.webm", { type: "video/webm" })
        await uploadFile(file)
      }
      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setRecording(true)
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop()
          setRecording(false)
          setShowRecordModal(false)
        }
      }, MAX_DURATION_MS)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Allow access to record"
      toast({ title: "Camera/mic required", description: msg, variant: "destructive" })
    }
  }, [uploadFile, toast])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
      setRecording(false)
      setShowRecordModal(false)
    }
  }, [])

  const removeVideo = useCallback(async () => {
    setUploading(true)
    try {
      await supabase.storage.from(BUCKET).remove([`${userId}/video.mp4`, `${userId}/video.webm`, `${userId}/video.mov`])
      await supabase.from("profiles").update({ profile_video_url: null }).eq("id", userId)
      onUpdate(null)
      toast({ title: "Video removed" })
    } catch {
      toast({ title: "Could not remove video", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }, [userId, supabase, onUpdate, toast])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ""
  }

  const closeRecordModal = (open: boolean) => {
    if (!open) {
      stopRecording()
      setShowRecordModal(false)
    } else {
      setShowRecordModal(true)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0 border-b border-border p-4">
          <Video className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Profile video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {profileVideoUrl ? (
            <div className="relative aspect-video max-h-[280px] overflow-hidden rounded-xl bg-muted/30">
              <video
                src={profileVideoUrl}
                controls
                className="h-full w-full object-contain"
                playsInline
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Replace
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={removeVideo}
                  disabled={uploading}
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex aspect-video max-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-center font-body text-sm text-muted-foreground">
                Optional short intro (≤2 min · {MAX_FILE_MB}MB max)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" />
                  Upload video
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRecordModal(true)}
                  disabled={uploading}
                >
                  <Mic className="h-4 w-4" /> Record video
                </Button>
              </div>
            </div>
          )}

          {!profileVideoUrl && (
            <p className="font-data text-[10px] text-muted-foreground">MP4, WebM, or MOV</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showRecordModal} onOpenChange={closeRecordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record your video</DialogTitle>
            <DialogDescription>
              {recording
                ? "Recording… (max 2 min). Click Stop when done."
                : "Allow camera and microphone, then click Start to record."}
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video overflow-hidden rounded-xl border border-border bg-muted">
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <DialogFooter className="gap-2 sm:justify-stretch">
            {!recording ? (
              <Button type="button" className="flex-1" onClick={startRecording}>
                Start recording
              </Button>
            ) : (
              <Button type="button" variant="destructive" className="flex-1" onClick={stopRecording}>
                Stop & save
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => closeRecordModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
