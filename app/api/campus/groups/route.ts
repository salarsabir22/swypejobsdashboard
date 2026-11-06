import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import { writeCampusAudit } from "@/lib/campus/access"
import {
  directoryUniversity,
  parseCampusDirectoryFilters,
  resolveCampusDirectoryMemberIds,
  type CampusDirectoryFilters,
} from "@/lib/campus/directory"
import {
  parseCampusEmployerDirectoryFilters,
  resolveCampusEmployerMemberIds,
  type CampusEmployerDirectoryFilters,
} from "@/lib/campus/employer-directory"
import {
  createCampusDirectoryGroup,
  deleteCampusDirectoryGroup,
  listCampusDirectoryGroups,
  type CampusDirectoryGroupKind,
} from "@/lib/campus/groups"
import { sameCampus } from "@/lib/jobs/curation"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

function parseKind(value: string | undefined | null): CampusDirectoryGroupKind {
  if (value === "alumni" || value === "employers") return value
  return "students"
}

export async function GET(request: Request) {
  const staff = await requireCampusCapabilityApi("view_actions")
  if ("error" in staff) return staff.error

  const university = directoryUniversity(staff.university)
  if (!university && !staff.isAdmin) {
    return NextResponse.json({ error: "Campus not set." }, { status: 403 })
  }

  const url = new URL(request.url)
  const kindParam = url.searchParams.get("kind")
  const kind = kindParam ? parseKind(kindParam) : undefined

  try {
    const groups = await listCampusDirectoryGroups({
      university: university || url.searchParams.get("campus") || "",
      kind,
    })
    return NextResponse.json({ groups })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load groups." },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  const staff = await requireCampusCapabilityApi("mutate")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as {
    name?: string
    description?: string
    kind?: CampusDirectoryGroupKind
    mode?: "filter" | "selection"
    filters?: CampusDirectoryFilters | CampusEmployerDirectoryFilters | Record<string, string>
    studentIds?: string[]
    memberIds?: string[]
  } | null

  const name = body?.name?.trim()
  const kind = parseKind(body?.kind)
  const mode = body?.mode === "selection" ? "selection" : "filter"
  if (!name) return NextResponse.json({ error: "Group name is required." }, { status: 400 })

  const university = directoryUniversity(staff.university)
  if (!university && !staff.isAdmin) {
    return NextResponse.json({ error: "Campus not set." }, { status: 403 })
  }
  const campus = university || ""

  let sourceFilters: CampusDirectoryFilters | CampusEmployerDirectoryFilters = {}
  if (body?.filters && typeof body.filters === "object") {
    if (kind === "employers") {
      if ("inactiveDays" in body.filters || "employeeCount" in body.filters || "industry" in body.filters) {
        sourceFilters = body.filters as CampusEmployerDirectoryFilters
      } else {
        sourceFilters = parseCampusEmployerDirectoryFilters(body.filters as Record<string, string | undefined>)
      }
    } else if (
      "completionOp" in body.filters ||
      "inactiveDays" in body.filters ||
      "classYear" in body.filters ||
      "employed" in body.filters
    ) {
      sourceFilters = body.filters as CampusDirectoryFilters
    } else {
      sourceFilters = parseCampusDirectoryFilters(body.filters as Record<string, string | undefined>)
    }
  }

  let memberIds: string[] = []

  try {
    if (mode === "selection") {
      const requested = [
        ...new Set(
          [...(body?.memberIds || []), ...(body?.studentIds || [])]
            .map((id) => id.trim())
            .filter((id) => id && !id.startsWith("partner:"))
        ),
      ]
      if (!requested.length) {
        return NextResponse.json({ error: "Select at least one row with an account." }, { status: 400 })
      }

      const admin = createAdminClient()
      if (kind === "employers") {
        const verified: string[] = []
        for (let i = 0; i < requested.length; i += 200) {
          const chunk = requested.slice(i, i + 200)
          const { data: partners, error } = await admin
            .from("campus_employer_partners")
            .select("recruiter_id")
            .eq("university", campus)
            .in("recruiter_id", chunk)
          if (error) return NextResponse.json({ error: error.message }, { status: 400 })
          for (const row of partners || []) {
            if (row.recruiter_id) verified.push(row.recruiter_id)
          }
        }
        memberIds = [...new Set(verified)]
      } else {
        const verified: string[] = []
        for (let i = 0; i < requested.length; i += 200) {
          const chunk = requested.slice(i, i + 200)
          const { data, error } = await admin
            .from("student_profiles")
            .select("id, university, is_alumni")
            .in("id", chunk)
          if (error) return NextResponse.json({ error: error.message }, { status: 400 })
          for (const row of data || []) {
            if (campus && row.university && !sameCampus(row.university, campus)) continue
            const isAlumni = row.is_alumni === true
            if (kind === "alumni" ? isAlumni : !isAlumni) verified.push(row.id)
          }
        }
        memberIds = verified
      }

      if (!memberIds.length) {
        return NextResponse.json({ error: "None of the selected accounts belong to this campus directory." }, { status: 400 })
      }
    } else if (kind === "employers") {
      const resolved = await resolveCampusEmployerMemberIds({
        university: campus,
        filters: sourceFilters as CampusEmployerDirectoryFilters,
      })
      memberIds = resolved.ids.filter((id) => !id.startsWith("partner:"))
      sourceFilters = resolved.filters
      if (!memberIds.length) {
        return NextResponse.json({ error: "No employers match these filters." }, { status: 400 })
      }
    } else {
      const resolved = await resolveCampusDirectoryMemberIds({
        university: campus,
        kind,
        filters: sourceFilters as CampusDirectoryFilters,
      })
      memberIds = resolved.ids
      sourceFilters = resolved.filters
      if (!memberIds.length) {
        return NextResponse.json({ error: "No students match these filters." }, { status: 400 })
      }
    }

    const group = await createCampusDirectoryGroup({
      userId: staff.user.id,
      name,
      description: body?.description?.trim() || null,
      university: campus,
      kind,
      memberIds,
      sourceFilters,
      mode,
    })

    await writeCampusAudit(staff.user.id, "directory_group_create", "campus_group", group.id, {
      university: campus,
      kind,
      mode,
      memberCount: group.memberCount,
      name: group.name,
    })

    return NextResponse.json({ ok: true, group })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create group." },
      { status: 400 }
    )
  }
}

export async function DELETE(request: Request) {
  const staff = await requireCampusCapabilityApi("mutate")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as { id?: string } | null
  const id = body?.id?.trim()
  if (!id) return NextResponse.json({ error: "Group id is required." }, { status: 400 })

  const university = directoryUniversity(staff.university)
  if (!university && !staff.isAdmin) {
    return NextResponse.json({ error: "Campus not set." }, { status: 403 })
  }

  try {
    await deleteCampusDirectoryGroup({ id, university: university || "" })
    await writeCampusAudit(staff.user.id, "directory_group_delete", "campus_group", id, {
      university: university || "",
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete group." },
      { status: 400 }
    )
  }
}
