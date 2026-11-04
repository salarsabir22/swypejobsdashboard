import Link from "next/link"
import { Users } from "lucide-react"
import { campusPageData } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { studentIsAlumni } from "@/lib/jobs/targeting"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; kind?: string }>
}) {
  const { campus, kind } = await searchParams
  const snapshot = await campusPageData(campus, "view_actions")
  const university = snapshot.access.university
  const supabase = await createClient()
  const view = kind === "alumni" ? "alumni" : "students"

  const loadPeople = (columns: string) => {
    const query = supabase.from("student_profiles").select(columns)
    return (university ? query.eq("university", university) : query).limit(120)
  }
  const primary = await loadPeople(
    "id, degree, graduation_year, skills, resume_url, still_enrolled, is_alumni, linkedin_url, profiles(full_name)"
  )
  const peopleRes = primary.error
    ? await loadPeople(
        "id, degree, graduation_year, skills, resume_url, still_enrolled, linkedin_url, profiles(full_name)"
      )
    : primary

  type PeopleRow = {
    id: string
    degree: string | null
    graduation_year: number | null
    skills: string[] | null
    resume_url: string | null
    still_enrolled: boolean | null
    is_alumni?: boolean | null
    linkedin_url: string | null
    profiles: { full_name: string | null } | { full_name: string | null }[] | null
  }

  const rows = ((peopleRes.data || []) as PeopleRow[])
    .filter((row) => (view === "alumni" ? studentIsAlumni(row) : !studentIsAlumni(row)))
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const skills = Array.isArray(row.skills) ? row.skills : []
      return {
        id: row.id,
        name: profile?.full_name || "Student",
        degree: row.degree || "—",
        year: row.graduation_year || "—",
        skills: skills.slice(0, 3).join(", ") || "—",
        resume: Boolean(row.resume_url),
        linkedin: Boolean(row.linkedin_url),
      }
    })

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Partners & stakeholders"
      description="Students, alumni, and employers in this campus workspace. Open Employers for verification and partnership tiers."
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant={view === "students" ? "default" : "outline"} className="rounded-full">
          <Link href="/campus/people?kind=students">Students</Link>
        </Button>
        <Button asChild size="sm" variant={view === "alumni" ? "default" : "outline"} className="rounded-full">
          <Link href="/campus/people?kind=alumni">Alumni</Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href="/campus/employers">Employers</Link>
        </Button>
      </div>
      <DashboardPanel title={view === "alumni" ? "Alumni directory" : "Student directory"} badge={`${rows.length}`}>
        {!rows.length ? (
          <DashboardEmptyState
            icon={Users}
            title={view === "alumni" ? "No alumni on file" : "No students on file"}
            description="SSO and campus profiles show here once students are attached to this university."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.degree}</TableCell>
                  <TableCell>{row.year}</TableCell>
                  <TableCell>{row.skills}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[row.resume ? "Resume" : null, row.linkedin ? "LinkedIn" : null].filter(Boolean).join(" · ") || "Incomplete"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
