import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { toExcel, toPdf } from "@/lib/export/formats"
import { buildAccreditation, type AccreditationTemplate } from "@/lib/reports/accreditation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/reports/accreditation?template=hec|nbeac&format=pdf|xls&year=2026
 * Admin sees every campus. University staff and campus staff are limited to their university.
 */

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const role = profile?.role
  let university: string | null = null
  if (role === "university") {
    const { data: staff } = await supabase.from("campus_staff").select("university").eq("user_id", user.id).maybeSingle()
    university = staff?.university || null
    if (!university) return NextResponse.json({ error: "No campus is assigned to this account." }, { status: 403 })
  } else if (role !== "admin") {
    const { data: staff } = await supabase.from("campus_staff").select("university").eq("user_id", user.id).maybeSingle()
    if (!staff?.university) return NextResponse.json({ error: "Campus or admin access required." }, { status: 403 })
    university = staff.university
  }

  const url = new URL(request.url)
  const template = url.searchParams.get("template")
  if (template !== "hec" && template !== "nbeac") {
    return NextResponse.json({ error: "template must be hec or nbeac." }, { status: 400 })
  }
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xls"
  const yearParam = Number(url.searchParams.get("year") || new Date().getFullYear())
  const year = Number.isInteger(yearParam) && yearParam >= 2000 && yearParam <= 2100 ? yearParam : new Date().getFullYear()

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Admin client unavailable." }, { status: 500 })
  }

  try {
    const report = await buildAccreditation(admin, { template: template as AccreditationTemplate, year, university })
    const filename = `${template}-placement-${year}`
    if (format === "pdf") {
      const pdf = await toPdf({ title: report.title, subtitle: report.subtitle, sheets: report.sheets.slice(0, 4), rowCap: 40 })
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
          "Cache-Control": "no-store",
        },
      })
    }
    return new NextResponse(toExcel(report.sheets), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.xls"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Report failed." }, { status: 500 })
  }
}
