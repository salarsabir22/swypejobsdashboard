"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, BellOff, Calendar, ChevronLeft, Share2 } from "lucide-react"
import { ChatUserAvatar } from "@/components/chat/ChatUserAvatar"
import { ReportBlockMenu } from "@/components/moderation/ReportBlockMenu"
import { InterviewProposeButton } from "@/components/chat/InterviewProposeButton"
import { shareOrCopyLink } from "@/lib/share/share-link"
import { useToast } from "@/lib/hooks/use-toast"
import type { ChatPeer } from "@/lib/chat/inbox"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

type ChatChannelHeaderProps = {
  peer: ChatPeer
  jobTitle?: string | null
  typing?: boolean
  backHref?: string
  onBack?: () => void
  currentUserId?: string
  onBlocked?: () => void
  muted?: boolean
  onToggleMute?: () => void
  matchId?: string | null
  conversationId?: string
}

export function ChatChannelHeader({
  peer,
  jobTitle,
  typing,
  backHref,
  onBack,
  currentUserId,
  onBlocked,
  muted,
  onToggleMute,
  matchId,
  conversationId,
}: ChatChannelHeaderProps) {
  const { toast } = useToast()
  const [interviewOpen, setInterviewOpen] = useState(false)
  const name = peer.full_name || "Match"
  const profileHref = peer.profilePath
  const title = (
    <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">{name}</p>
  )
  const canInterview = Boolean(currentUserId && matchId && conversationId)

  return (
    <header className="relative flex shrink-0 items-center gap-2 border-b border-border bg-card/70 px-2 py-2.5 backdrop-blur-xl sm:gap-3 sm:px-3 sm:py-3">
      {backHref ? (
        <Button asChild variant="ghost" size="icon" aria-label="Back to messages">
          <Link href={backHref}>
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </Link>
        </Button>
      ) : onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="lg:hidden"
          aria-label="Back to inbox"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2} />
        </Button>
      ) : (
        <span className="hidden w-9 lg:block" />
      )}

      {profileHref ? (
        <Link href={profileHref} className="shrink-0" aria-label={`View ${name}'s profile`}>
          <ChatUserAvatar name={name} image={peer.avatar_url} size="md" />
        </Link>
      ) : (
        <ChatUserAvatar name={name} image={peer.avatar_url} size="md" />
      )}
      <div className="min-w-0 flex-1">
        {profileHref ? (
          <Link href={profileHref} className="block hover:underline">
            {title}
          </Link>
        ) : (
          title
        )}
        {typing ? (
          <p className="text-xs text-primary" aria-live="polite">
            typing
          </p>
        ) : jobTitle ? (
          <p className="truncate text-xs text-muted-foreground">{jobTitle}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Direct message</p>
        )}
      </div>

      {currentUserId && peer.id !== currentUserId ? (
        <ReportBlockMenu
          currentUserId={currentUserId}
          peerId={peer.id}
          peerName={name}
          onBlocked={onBlocked}
          extraItems={
            <>
              {canInterview ? (
                <DropdownMenuItem onSelect={() => setInterviewOpen(true)}>
                  <Calendar />
                  Propose interview
                </DropdownMenuItem>
              ) : null}
              {profileHref ? (
                <DropdownMenuItem
                  onSelect={() => {
                    void shareOrCopyLink({ path: profileHref, title: name }).then((result) => {
                      if (result === "copied") toast({ title: "Link copied", description: "Anyone with the link can open this profile." })
                      if (result === "failed") toast({ variant: "destructive", title: "Could not copy link" })
                    })
                  }}
                >
                  <Share2 />
                  Share profile
                </DropdownMenuItem>
              ) : null}
              {onToggleMute ? (
                <DropdownMenuItem onSelect={() => onToggleMute()}>
                  {muted ? <BellOff /> : <Bell />}
                  {muted ? "Unmute" : "Mute"}
                </DropdownMenuItem>
              ) : null}
            </>
          }
        />
      ) : null}

      {canInterview && currentUserId && matchId && conversationId ? (
        <InterviewProposeButton
          matchId={matchId}
          conversationId={conversationId}
          currentUserId={currentUserId}
          peerId={peer.id}
          trigger="none"
          open={interviewOpen}
          onOpenChange={setInterviewOpen}
        />
      ) : null}
    </header>
  )
}
