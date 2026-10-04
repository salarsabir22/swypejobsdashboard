"use client"

import { useState } from "react"
import EmojiPicker, { Theme } from "emoji-picker-react"
import { Smile } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatEmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-10 rounded-xl text-muted-foreground"
        aria-label="Add emoji"
        aria-expanded={open}
      >
        <Smile className="h-[22px] w-[22px]" strokeWidth={1.75} />
      </Button>
      {open ? (
        <>
          <Button
            type="button"
            variant="ghost"
            className="fixed inset-0 z-40 h-auto w-auto rounded-none bg-transparent p-0 hover:bg-transparent"
            aria-label="Close emoji picker"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-11 right-0 z-50 overflow-hidden rounded-[20px] border border-border bg-popover shadow-xl">
            <EmojiPicker
              onEmojiClick={(emoji) => {
                onPick(emoji.emoji)
                setOpen(false)
              }}
              width={320}
              height={360}
              theme={Theme.DARK}
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
