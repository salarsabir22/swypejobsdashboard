import { requireAdminModule } from "@/lib/admin/access"
import { createAdminClient } from "@/lib/supabase/admin"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { ChannelsManager } from "@/components/admin/ChannelsManager"

export default async function AdminChannelsPage() {
  const admin = await requireAdminModule("channels")
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("community_channels")
    .select("id, name, description, category, channel_members(count)")
    .order("name")
    .limit(100)

  const channels = (data || []).map((ch) => {
    const countRow = Array.isArray(ch.channel_members) ? ch.channel_members[0] : ch.channel_members
    const count = typeof countRow === "object" && countRow && "count" in countRow ? Number(countRow.count) || 0 : 0
    return {
      id: ch.id as string,
      name: ch.name as string,
      description: (ch.description as string | null) ?? null,
      category: (ch.category as string | null) ?? null,
      memberCount: count,
      channel_members: [] as { user_id: string }[],
    }
  })

  return (
    <AdminFrame
      title="Community channels"
      description="Create spaces, remove members, and delete channels. Mutations go through the admin API."
      staffRole={admin.staffRole}
    >
      <ChannelsManager initialChannels={channels} loadError={error?.message} />
    </AdminFrame>
  )
}
