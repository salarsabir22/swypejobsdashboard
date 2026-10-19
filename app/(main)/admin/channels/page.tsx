import { requireAdminModule } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { ChannelsManager } from "@/components/admin/ChannelsManager"

export default async function AdminChannelsPage() {
  const admin = await requireAdminModule("channels")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("community_channels")
    .select("*, channel_members(user_id)")
    .order("name")

  return (
    <AdminFrame
      title="Community channels"
      description="Create spaces, remove members, and delete channels. Mutations go through the admin API."
      staffRole={admin.staffRole}
    >
      <ChannelsManager initialChannels={data || []} loadError={error?.message} />
    </AdminFrame>
  )
}
