import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { readCampusAccess, writeCampusAudit } from "@/lib/campus/access"
import { canCampus, scopedCampus } from "@/lib/campus/rbac"
import { buildCampusExport, isCampusExportDataset } from "@/lib/campus/export"
import { loadCampusSnapshot } from "@/lib/campus/metrics"
import { toCsvSheets, toExcel, toPdf } from "@/lib/export/formats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/campus/export?dataset=overview|jobs|applications|engagement|departments|outcomes&format=csv|xls|pdf
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  const access = await readCampusAccess()
  if (!access) return NextResponse.json({ error: "Campus or admin access required." }, { status: 403 })
  if (!canCampus(access, "export")) {
    return NextResponse.json({ error: "You don’t have access to campus exports." }, { status: 403 })
  }

  const url = new URL(request.url)
  const dataset = url.searchParams.get("dataset")
  if (!isCampusExportDataset(dataset)) {
    return NextResponse.json({ error: "Unknown dataset." }, { status: 400 })
  }
  const formatParam = url.searchParams.get("format") || "csv"
  const format = formatParam === "xls" || formatParam === "pdf" ? formatParam : "csv"
  const campus = scopedCampus(access, url.searchParams.get("campus"))

  try {
    const snapshot = await loadCampusSnapshot(access, campus)
    const result = buildCampusExport(snapshot, dataset)
    void writeCampusAudit(access.userId, "export", dataset, dataset, { format, sheets: result.sheets.length }).catch(() => undefined)

    if (format === "xls") {
      return new NextResponse(toExcel(result.sheets), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.filename}.xls"`,
          "Cache-Control": "no-store",
        },
      })
    }
    if (format === "pdf") {
      const pdf = await toPdf({
        title: result.title,
        subtitle: result.subtitle,
        org: result.org,
        hero: result.hero,
        notes: result.notes,
        sheets: result.sheets,
        layout: "portrait",
      })
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${result.filename}.pdf"`,
          "Cache-Control": "no-store",
        },
      })
    }

    return new NextResponse(toCsvSheets(result.sheets), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export failed." }, { status: 500 })
  }
}
