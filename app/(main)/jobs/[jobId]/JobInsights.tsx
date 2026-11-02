import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { applicantMix, viewToApplyPct, type MixSlice } from "@/lib/jobs/insights"

function MixList({ title, slices }: { title: string; slices: MixSlice[] }) {
  if (!slices.length) return null
  return (
    <div>
      <p className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-[13px]">
            <span className="w-10 shrink-0 tabular-nums text-muted-foreground">{slice.pct}%</span>
            <span className="min-w-0 flex-1 truncate">{slice.label}</span>
            <span className="tabular-nums text-muted-foreground">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function JobInsights({ jobId, matches }: { jobId: string; matches: number }) {
  const supabase = await createClient()
  const [{ count: views }, { count: applications }, { count: saved }, { data: swipes }] = await Promise.all([
    supabase.from("job_views").select("id", { count: "exact", head: true }).eq("job_id", jobId),
    supabase.from("job_swipes").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("direction", "right"),
    supabase.from("job_swipes").select("id", { count: "exact", head: true }).eq("job_id", jobId).eq("direction", "saved"),
    supabase.from("job_swipes").select("student_id").eq("job_id", jobId).eq("direction", "right").limit(500),
  ])

  const ids = [...new Set((swipes || []).map((row) => row.student_id as string))].slice(0, 150)
  let students: {
    degree?: string | null
    graduation_year?: number | null
    is_alumni?: boolean | null
    still_enrolled?: boolean | null
    cgpa?: number | null
  }[] = []
  if (ids.length) {
    const full = await supabase
      .from("student_profiles")
      .select("degree, graduation_year, is_alumni, still_enrolled, cgpa")
      .in("id", ids)
    if (full.error) {
      const basic = await supabase.from("student_profiles").select("degree, graduation_year, still_enrolled").in("id", ids)
      students = basic.data || []
    } else {
      students = full.data || []
    }
  }

  const viewCount = views || 0
  const appCount = applications || 0
  const rate = viewToApplyPct(viewCount, appCount)
  const mix = applicantMix(students)
  const stats = [
    { label: "Views", value: viewCount },
    { label: "Applications", value: appCount },
    { label: "View to apply", value: rate === null ? "—" : `${rate}%` },
    { label: "Saved", value: saved || 0 },
    { label: "Matches", value: matches },
  ]

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="font-heading text-lg font-semibold">Posting insights</h2>
          <p className="text-[13px] text-muted-foreground">Views, applications, and who applied. Mix is based on profiles of people who applied.</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-muted/30 px-3 py-2">
              <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
              <dd className="font-heading text-lg font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
        {mix.total ? (
          <>
            <p className="text-[13px] text-muted-foreground">
              {mix.students} current students · {mix.alumni} alumni, of {mix.total} applicants with a profile.
            </p>
            <div className="grid gap-5 sm:grid-cols-3">
              <MixList title="Degree" slices={mix.degrees} />
              <MixList title="Graduation year" slices={mix.years} />
              <MixList title="CGPA" slices={mix.cgpa} />
            </div>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">Applicant mix appears once someone applies.</p>
        )}
      </CardContent>
    </Card>
  )
}
