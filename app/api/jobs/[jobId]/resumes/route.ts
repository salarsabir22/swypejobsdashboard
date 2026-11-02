import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractStoragePath } from "@/lib/storage/signed-url"
import { zipStore } from "@/lib/zip/store"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_FILES = 40
const MAX_BYTES = 20 * 1024 * 1024

function safeName(name: string, path: string, used: Set<string>) {
  const ext = (path.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "pdf").toLowerCase()
  const base = (name || "candidate").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").slice(0, 40) || "candidate"
  let filename = `${base}.${ext}`
  let n = 2
  while (used.has(filename.toLowerCase())) {
    filename = `${base}_${n}.${ext}`
    n += 1
  }
  used.add(filename.toLowerCase())
  return filename
}

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: job } = await supabase.from("jobs").select("id, recruiter_id, title").eq("id", jobId).maybeSingle()
  if (!job || job.recruiter_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: applications } = await supabase
    .from("job_swipes")
    .select("student_id")
    .eq("job_id", jobId)
    .eq("direction", "right")
    .limit(MAX_FILES)
  const studentIds = [...new Set((applications || []).map((row) => row.student_id as string))]
  if (!studentIds.length) return NextResponse.json({ error: "No applications yet." }, { status: 404 })

  const [{ data: profiles }, { data: students }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", studentIds),
    supabase.from("student_profiles").select("id, resume_url").in("id", studentIds),
  ])
  const nameById = new Map((profiles || []).map((p) => [p.id as string, (p.full_name as string | null) || "candidate"]))

  const files: { name: string; data: Uint8Array }[] = []
  const used = new Set<string>()
  let bytes = 0
  let missing = 0
  for (const student of students || []) {
    const path = extractStoragePath("resumes", String(student.resume_url || ""))
    if (!path) {
      missing += 1
      continue
    }
    if (bytes >= MAX_BYTES || files.length >= MAX_FILES) break
    const { data, error } = await supabase.storage.from("resumes").download(path)
    if (error || !data) {
      missing += 1
      continue
    }
    const buf = new Uint8Array(await data.arrayBuffer())
    if (bytes + buf.length > MAX_BYTES) break
    bytes += buf.length
    files.push({ name: safeName(nameById.get(student.id as string) || "candidate", path, used), data: buf })
  }

  if (!files.length) {
    return NextResponse.json({ error: "None of these applicants have a downloadable resume." }, { status: 404 })
  }

  const slug = String(job.title || "job").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "job"
  const zip = zipStore(files)
  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-resumes.zip"`,
      "Cache-Control": "no-store",
      "X-Resume-Files": String(files.length),
      "X-Resume-Missing": String(missing),
    },
  })
}
