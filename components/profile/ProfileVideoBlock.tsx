"use client"

import { useState } from "react"
import { ProfileVideoSection } from "./ProfileVideoSection"

interface ProfileVideoBlockProps {
  userId: string
  initialVideoUrl: string | null
}

export function ProfileVideoBlock({ userId, initialVideoUrl }: ProfileVideoBlockProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl)
  return (
    <ProfileVideoSection
      userId={userId}
      profileVideoUrl={videoUrl}
      onUpdate={setVideoUrl}
    />
  )
}
