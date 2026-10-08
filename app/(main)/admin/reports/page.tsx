import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Flag } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ReportStatusButton } from "./ReportStatusButton"

type ReportRow = {
  id: string
  reason: string
  details: string | null
  status: string
  created_at: string
  reporter_id: string
  reported_id: string
}

type ProfileLite = { id: string; full_name: string | null; role: string | null }

export default async function AdminReportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (currentProfile?.role !== "admin") redirect("/discover")

  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, details, status, created_at, reporter_id, reported_id")
    .order("created_at", { ascending: false })
    .limit(100)

  const rows = (reports || []) as ReportRow[]
  const ids = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]))]
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", ids)
    : { data: [] as ProfileLite[] }
  const byId = new Map(((profiles || []) as ProfileLite[]).map((p) => [p.id, p]))

  const profileHref = (id: string, role: string | null) =>
    role === "recruiter" ? `/company/${id}` : `/candidates/${id}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-[2.25rem]">Reports</h1>
        <p className="mt-0.5 font-body text-sm text-muted-foreground">User-submitted safety reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Flag className="h-4 w-4" />
            Inbox
          </CardTitle>
          <CardDescription>{rows.length} most recent</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const reported = byId.get(row.reported_id)
                  const reporter = byId.get(row.reporter_id)
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href={profileHref(row.reported_id, reported?.role ?? null)}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {reported?.full_name || "User"}
                        </Link>
                        {row.details ? (
                          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{row.details}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{reporter?.full_name || "User"}</TableCell>
                      <TableCell className="capitalize">{row.reason.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "open" ? "destructive" : "secondary"}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(row.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {row.status === "open" ? (
                          <div className="flex justify-end gap-2">
                            <ReportStatusButton id={row.id} nextStatus="reviewed" label="Mark reviewed" />
                            <ReportStatusButton id={row.id} nextStatus="dismissed" label="Dismiss" />
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
