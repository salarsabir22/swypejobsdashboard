"use client"

import { useState } from "react"
import { useToast } from "@/lib/hooks/use-toast"
import { ConfirmAction } from "@/components/admin/ConfirmAction"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Hash, Plus, Trash2, Users, UserMinus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type ChannelRow = {
  id: string
  name: string
  description?: string | null
  category?: string | null
  memberCount?: number
  channel_members?: { user_id: string }[]
}

export function ChannelsManager({
  initialChannels,
  loadError,
}: {
  initialChannels: ChannelRow[]
  loadError?: string | null
}) {
  const { toast } = useToast()
  const [channels, setChannels] = useState(initialChannels)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")

  const toggleMembers = async (channelId: string) => {
    if (expanded === channelId) {
      setExpanded(null)
      return
    }
    setExpanded(channelId)
    const current = channels.find((c) => c.id === channelId)
    if (current?.channel_members && current.channel_members.length > 0) return
    setLoadingMembers(channelId)
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_members", channelId }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        members?: { user_id: string }[]
      }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not load members" })
        return
      }
      setChannels((prev) =>
        prev.map((ch) =>
          ch.id === channelId
            ? {
                ...ch,
                channel_members: data.members || [],
                memberCount: (data.members || []).length,
              }
            : ch,
        ),
      )
    } finally {
      setLoadingMembers(null)
    }
  }

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_channel", name, description, category }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        channel?: ChannelRow
      }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not create channel" })
        return
      }
      toast({ title: "Channel created" })
      if (data.channel) {
        setChannels((prev) => [{ ...data.channel!, channel_members: [] }, ...prev])
      }
      setName("")
      setDescription("")
      setCategory("general")
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const deleteChannel = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_channel", channelId: id }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not delete channel" })
        return
      }
      toast({ title: "Channel deleted" })
      setChannels((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const removeMember = async (channelId: string, userId: string) => {
    const key = `${channelId}:${userId}`
    setRemoving(key)
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_member", channelId, userId }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not remove member" })
        return
      }
      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.id !== channelId) return ch
          const nextMembers = (ch.channel_members || []).filter((m) => m.user_id !== userId)
          return {
            ...ch,
            channel_members: nextMembers,
            memberCount: Math.max(0, (ch.memberCount ?? nextMembers.length + 1) - 1),
          }
        }),
      )
      toast({ title: "Member removed" })
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{channels.length} channels</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="h-3.5 w-3.5" />
              New channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create channel</DialogTitle>
              <DialogDescription>Spaces in the name become hyphens.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createChannel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel-name">Name</Label>
                <Input id="channel-name" placeholder="e.g. data-science" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-desc">Description</Label>
                <Textarea id="channel-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-cat">Category</Label>
                <Input id="channel-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <Button type="submit" className="w-full rounded-full" loading={creating} loadingText="Creating…">
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loadError ? (
        <p className="text-[14px] text-destructive">Could not load channels: {loadError}</p>
      ) : null}

      <DashboardPanel title="Channels" badge={`${channels.length}`}>
        {!channels.length ? (
          <p className="text-[14px] text-muted-foreground">No channels yet. Create the first community space.</p>
        ) : (
          <ul className="space-y-2">
            {channels.map((ch) => (
              <li key={ch.id} className="space-y-2 rounded-2xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Hash className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">#{ch.name}</p>
                      {ch.category ? <Badge variant="outline">{ch.category}</Badge> : null}
                    </div>
                    {ch.description ? <p className="truncate text-[13px] text-muted-foreground">{ch.description}</p> : null}
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {ch.memberCount ?? ch.channel_members?.length ?? 0} members
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    loading={loadingMembers === ch.id}
                    loadingText="…"
                    onClick={() => void toggleMembers(ch.id)}
                  >
                    Members
                  </Button>
                  <ConfirmAction
                    variant="outline"
                    size="icon"
                    loading={deletingId === ch.id}
                    title={`Delete #${ch.name}?`}
                    description="Memberships for this channel are removed."
                    confirmLabel="Delete"
                    onConfirm={() => deleteChannel(ch.id)}
                    aria-label={`Delete ${ch.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </ConfirmAction>
                </div>
                {expanded === ch.id ? (
                  <ul className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-[13px]">
                    {loadingMembers === ch.id ? (
                      <li className="text-muted-foreground">Loading members…</li>
                    ) : (ch.channel_members || []).length ? (
                      (ch.channel_members || []).map((m) => (
                        <li key={m.user_id} className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-[12px]">{m.user_id}</span>
                          <ConfirmAction
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            loading={removing === `${ch.id}:${m.user_id}`}
                            loadingText="…"
                            title="Remove member?"
                            description="They must rejoin to post again."
                            confirmLabel="Remove"
                            onConfirm={() => removeMember(ch.id, m.user_id)}
                          >
                            <UserMinus className="mr-1 h-3.5 w-3.5" />
                            Remove
                          </ConfirmAction>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground">No members yet.</li>
                    )}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </div>
  )
}
