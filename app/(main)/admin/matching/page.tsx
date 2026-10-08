import { requireAdmin } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { RankingForm } from "@/components/admin/AdminActions"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtPct } from "@/lib/campus/format"
import { GitCompare, Sparkles, Users, Zap } from "lucide-react"

export default async function AdminMatchingPage() {
  const admin = await requireAdmin()
  const snap = await loadAdminSnapshot(admin.staffRole)
  const supabase = await createClient()
  const { data: weights } = await supabase.from("ranking_weights").select("*").eq("id", 1).maybeSingle()
  const { data: flags } = await supabase.from("feature_flags").select("*")

  return (
    <AdminFrame
      title="Matching and swipe controls"
      description="Volume, conversion, ranking weights, and flags. Bias monitoring uses consented campus demographics only — never inferred."
      staffRole={admin.staffRole}
      missingTables={snap.missingTables}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Zap} label="Swipes" value={snap.matching.swipes} />
        <DashboardKpiCard icon={GitCompare} label="Right-swipe ratio" value={fmtPct(snap.matching.rightRatio)} />
        <DashboardKpiCard icon={Sparkles} label="Match → interview" value={fmtPct(snap.matching.interviewRate)} tone="teal" />
        <DashboardKpiCard icon={Users} label="Cold-start users" value={snap.matching.coldStartUsers} tone="amber" />
      </div>
      <DashboardPanel title="Tunable ranking weights">
        <RankingForm
          initial={{
            skills: Number(weights?.skills ?? 0.4),
            location: Number(weights?.location ?? 0.2),
            recency: Number(weights?.recency ?? 0.25),
            employer_tier: Number(weights?.employer_tier ?? 0.15),
          }}
        />
      </DashboardPanel>
      <DashboardPanel title="Feature flags, A/B, boost/suppress">
        <p className="text-[14px] text-muted-foreground">
          Flags in feature_flags. A/B experiments need an assignment table before UI variants ship. Boost/suppress
          rules can sit on job_moderation.status = featured. Staged rollout percent is stored on each flag.
        </p>
        {(flags || []).length ? (
          <ul className="mt-3 space-y-1 text-[14px]">
            {flags!.map((f) => (
              <li key={f.key}>
                {f.key}: {f.enabled ? "on" : "off"} · {f.rollout}%
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted-foreground">No flags inserted yet.</p>
        )}
      </DashboardPanel>
    </AdminFrame>
  )
}
