"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export const MAX_VOICE_SECONDS = 60

export function pickAudioMime(): { mime: string; ext: string } {
  if (typeof MediaRecorder === "undefined") return { mime: "", ext: "webm" }
  const options = [
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
  ]
  const match = options.find((o) => MediaRecorder.isTypeSupported(o.mime))
  return match ?? { mime: "", ext: "webm" }
}

export function formatVoiceClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, "0")}`
}

export function useVoiceRecorder(onAutoStop?: (value: { blob: Blob; duration: number }) => void) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const startedAt = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolveStop = useRef<((value: { blob: Blob; duration: number } | null) => void) | null>(null)
  const autoStopRef = useRef(onAutoStop)
  autoStopRef.current = onAutoStop

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    if (stopTimer.current) clearTimeout(stopTimer.current)
    stopTimer.current = null
  }

  const cancel = useCallback(() => {
    resolveStop.current?.(null)
    resolveStop.current = null
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    recorderRef.current = null
    chunksRef.current = []
    cleanupStream()
    setRecording(false)
    setElapsed(0)
  }, [])

  const start = useCallback(async () => {
    const { mime } = pickAudioMime()
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    chunksRef.current = []
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })
      cleanupStream()
      setRecording(false)
      const done = resolveStop.current
      resolveStop.current = null
      recorderRef.current = null
      if (!blob.size) {
        done?.(null)
        return
      }
      const payload = { blob, duration: Math.min(duration, MAX_VOICE_SECONDS) }
      if (done) done(payload)
      else autoStopRef.current?.(payload)
    }
    recorderRef.current = recorder
    startedAt.current = Date.now()
    setElapsed(0)
    setRecording(true)
    recorder.start(200)
    tickRef.current = setInterval(() => {
      setElapsed(Math.min(MAX_VOICE_SECONDS, Math.floor((Date.now() - startedAt.current) / 1000)))
    }, 200)
    stopTimer.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop()
    }, MAX_VOICE_SECONDS * 1000)
  }, [])

  const stop = useCallback(() => {
    return new Promise<{ blob: Blob; duration: number } | null>((resolve) => {
      if (!recorderRef.current || recorderRef.current.state === "inactive") {
        resolve(null)
        return
      }
      resolveStop.current = resolve
      recorderRef.current.stop()
    })
  }, [])

  useEffect(() => () => cancel(), [cancel])

  return { recording, elapsed, start, stop, cancel }
}
