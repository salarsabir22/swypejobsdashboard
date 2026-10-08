"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Hash, Plus, Trash2, Users, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { CommunityListSkeleton } from "@/components/skeletons"

type ChannelRow = {
  id: string
  name: string
  description?: string | null
  category?: string | null
  channel_members?: { user_id: string }[]
}

export default function AdminChannelsPage() {
  const { toast } = useToast()
  const [channels, setChannels] = useState<ChannelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")

  async function loadChannels() {
    const supabase = createClient()
    const { data } = await supabase.from("community_channels").select("*, channel_members(user_id)").order("name")
    setChannels((data as ChannelRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadChannels()
    })
  }, [])

  const createChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("community_channels").insert({
      name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      description: description.trim() || null,
      category: category || null,
      created_by: user!.id,
    })
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message })
    } else {
      toast({ title: "Channel created!" })
      setName("")
      setDescription("")
      setCategory("general")
      setOpen(false)
      void loadChannels()
    }
    setCreating(false)
  }

  const deleteChannel = async (id: string) => {
    if (!confirm("Delete this channel? All messages will be lost.")) return
    const supabase = createClient()
    const { error } = await supabase.from("community_channels").delete().eq("id", id)
    if (error) toast({ variant: "destructive", title: "Error", description: error.message })
    else {
      toast({ title: "Channel deleted" })
      setChannels((prev) => prev.filter((c) => c.id !== id))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold sm:text-[2.25rem]">Community Channels</h1>
          <p className="font-body text-sm text-muted-foreground">{channels.length} channels</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-3.5 w-3.5" />
              New Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Channel</DialogTitle>
              <DialogDescription>Spaces in the name are replaced with hyphens.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createChannel} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel-name">Channel Name</Label>
                <Input id="channel-name" placeholder="e.g. data-science" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-desc">Description</Label>
                <Textarea id="channel-desc" placeholder="What is this channel about?" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel-cat">Category</Label>
                <Input id="channel-cat" placeholder="e.g. tech, career, networking" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Channel"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <CommunityListSkeleton showHeader={false} />
      ) : channels.length === 0 ? (
        <Alert>
          <Hash className="h-4 w-4" />
          <AlertTitle>No channels yet</AlertTitle>
          <AlertDescription>Create the first community space for students and recruiters.</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => (
            <Card key={ch.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">#{ch.name}</CardTitle>
                    {ch.category ? <Badge variant="outline">{ch.category}</Badge> : null}
                  </div>
                  {ch.description ? <CardDescription className="truncate">{ch.description}</CardDescription> : null}
                  <p className="mt-0.5 flex items-center gap-1 font-data text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {ch.channel_members?.length || 0} members
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void deleteChannel(ch.id)}
                  aria-label={`Delete ${ch.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
