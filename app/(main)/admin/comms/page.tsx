import { requireAdminModule } from "@/lib/admin/access"
import { createAdminClient } from "@/lib/supabase/admin"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BroadcastForm } from "@/components/admin/BroadcastForm"
import { BannerManager, TicketDecision } from "@/components/admin/CommsControls"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminCommsPage() {
  const admin = await requireAdminModule("comms")
  const supabase = createAdminClient()
  const [{ data: broadcasts }, { data: tickets }, { data: banners }] = await Promise.all([
    supabase
      .from("platform_broadcasts")
      .select("id, title, channel, segment, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("support_tickets")
      .select("id, subject, status, priority, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("platform_banners").select("id, message").eq("is_active", true).limit(20),
  ])

  return (
    <AdminFrame
      title="Content and communication"
      description="Broadcasts, banners, and support tickets. Email/push templates and delivery stats need the ESP webhook."
      staffRole={admin.staffRole}
    >
      <DashboardPanel title="Active banners">
        <BannerManager banners={banners || []} />
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Broadcast by segment">
          <BroadcastForm />
        </DashboardPanel>
        <DashboardPanel title="Support inbox">
          {(tickets || []).length ? (
            <ul className="space-y-2">
              {tickets!.map((t) => (
                <TicketDecision
                  key={t.id}
                  ticketId={t.id}
                  initialStatus={t.status || "open"}
                  subject={t.subject || "Untitled"}
                  priority={t.priority}
                />
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-muted-foreground">
              No tickets. Insert into support_tickets or forward email to this queue.
            </p>
          )}
        </DashboardPanel>
      </div>
      <DashboardPanel title="Recent broadcasts">
        {(broadcasts || []).length ? (
          <ul className="space-y-2 text-[14px]">
            {broadcasts!.map((b) => (
              <li key={b.id}>
                {b.title} · {b.channel} · {b.segment}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">None yet.</p>
        )}
      </DashboardPanel>
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/admin/channels">Community channels</Link>
      </Button>
    </AdminFrame>
  )
}
