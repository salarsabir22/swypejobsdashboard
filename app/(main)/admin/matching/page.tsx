import { requireAdminModule } from "@/lib/admin/access"
import { loadAdminSnapshot } from "@/lib/admin/metrics"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { RankingForm } from "@/components/admin/AdminActions"
import { FeatureFlagToggles } from "@/components/admin/FeatureFlagToggles"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtPct } from "@/lib/campus/format"
import { GitCompare, Sparkles, Users, Zap } from "lucide-react"

export default async function AdminMatchingPage() {
  const admin = await requireAdminModule("matching")
  const snap = await loadAdminSnapshot(admin.staffRole)
  const supabase = await createClient()
  const { data: weights } = await supabase.from("ranking_weights").select("*").eq("id", 1).maybeSingle()
  const { data: flags } = await supabase.from("feature_flags").select("*")

  return (
    <AdminFrame
      title="Matching and swipe controls"
      description="Volume, conversion, and live Discover ranking weights. Bias monitoring uses consented campus demographics only — never inferred."
      staffRole={admin.staffRole}
      missingTables={snap.missingTables}
      mode="settings"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Zap} label="Swipes" value={snap.matching.swipes} />
        <DashboardKpiCard icon={GitCompare} label="Right-swipe ratio" value={fmtPct(snap.matching.rightRatio)} />
        <DashboardKpiCard icon={Sparkles} label="Match → interview" value={fmtPct(snap.matching.interviewRate)} tone="teal" />
        <DashboardKpiCard icon={Users} label="Cold-start users" value={snap.matching.coldStartUsers} tone="amber" />
      </div>
      <DashboardPanel title="Live ranking weights">
        <p className="mb-3 text-[13px] text-muted-foreground">
          Saved weights re-rank the student Discover deck (skills, location, recency, employer tier). Changes apply on
          the next deck load.
        </p>
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
          Toggle flags and rollout percent here. A/B assignment tables still need to ship before UI variants flip. Boost
          / suppress can sit on job_moderation.status = featured.
        </p>
        <FeatureFlagToggles
          flags={(flags || []).map((f) => ({
            key: f.key,
            enabled: Boolean(f.enabled),
            rollout: f.rollout,
          }))}
        />
      </DashboardPanel>
    </AdminFrame>
  )
}
