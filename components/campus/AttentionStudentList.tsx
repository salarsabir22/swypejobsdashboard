import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { AttentionStudent } from "@/lib/campus/types"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function AttentionStudentList({
  students,
  empty = "No students in this list right now.",
}: {
  students: AttentionStudent[]
  empty?: string
}) {
  if (!students.length) {
    return <p className="text-[14px] text-muted-foreground">{empty}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Programme</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Profile</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <Link href={`/candidates/${row.id}`} className="text-primary hover:underline">
                {row.name}
              </Link>
            </TableCell>
            <TableCell>{row.major || "—"}</TableCell>
            <TableCell className="tabular-nums">{row.year || "—"}</TableCell>
            <TableCell className="text-muted-foreground">{row.reason}</TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-3">
                <Link href={`/candidates/${row.id}`}>
                  Open
                  <ExternalLink className="size-3.5" strokeWidth={1.75} />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
