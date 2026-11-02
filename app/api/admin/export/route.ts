import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"
import { canAccessModule } from "@/lib/admin/modules"
import { buildExport, EXPORT_MODULE, isExportDataset, parseDateParam, toCsv, type ExportFormat } from "@/lib/admin/export"
import { toExcel, toPdf } from "@/lib/export/formats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/admin/export?dataset=employers|jobs|students|applications|placements&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Streams a UTF-8 CSV of the full dataset (capped at EXPORT_ROW_CAP rows). Read-only staff may export.
 */
export async function GET(request: Request) {
  // No module passed here on purpose: requireAdminApi treats a module as a mutation gate and blocks read-only staff.
  const auth = await requireAdminApi()
  if ("error" in auth) return auth.error

  const url = new URL(request.url)
  const dataset = url.searchParams.get("dataset")
  if (!isExportDataset(dataset)) {
    return NextResponse.json({ error: "Unknown dataset." }, { status: 400 })
  }
  if (!canAccessModule(auth.modules, EXPORT_MODULE[dataset])) {
    return NextResponse.json({ error: "Module access denied." }, { status: 403 })
  }

  const formatParam = url.searchParams.get("format") || "csv"
  const format: ExportFormat = formatParam === "xls" || formatParam === "pdf" ? formatParam : "csv"

  const from = parseDateParam(url.searchParams.get("from"))
  const to = parseDateParam(url.searchParams.get("to"))
  if (from && to && from > to) {
    return NextResponse.json({ error: "`from` must be on or before `to`." }, { status: 400 })
  }

  try {
    const result = await buildExport(auth.admin, dataset, { from, to })
    void writeAudit(auth.admin, auth.user.id, "export", dataset, dataset, {
      from,
      to,
      format,
      rows: result.rows.length,
      truncated: result.truncated,
    }).catch(() => undefined)

    const sheet = [{ name: dataset, columns: result.columns, rows: result.rows }]
    const base = result.filename.replace(/\.csv$/, "")
    if (format === "xls") {
      return new NextResponse(toExcel(sheet), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.xls"`,
          "Cache-Control": "no-store",
          "X-Export-Rows": String(result.rows.length),
        },
      })
    }
    if (format === "pdf") {
      const pdf = await toPdf({ title: result.filename.replace(/\.csv$/, "").replace(/_/g, " "), subtitle: "Admin export", sheets: sheet })
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${base}.pdf"`,
          "Cache-Control": "no-store",
          "X-Export-Rows": String(result.rows.length),
        },
      })
    }

    return new NextResponse(toCsv(result.columns, result.rows), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
        "X-Export-Rows": String(result.rows.length),
        "X-Export-Truncated": result.truncated ? "1" : "0",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
