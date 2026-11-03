import type { SupabaseClient } from "@supabase/supabase-js"

export const CAREER_SURVEY_BUCKET = "career-surveys"

export type CareerSurveyRow = {
  student_id: string
  survey_year: number
  employment_status: string
  employer: string | null
  designation: string | null
  industry: string | null
  salary_pkr: number | null
  related_to_degree: string | null
  satisfaction: number | null
  further_study: string | null
  comments: string | null
  submitted_at: string
}

const SELECT =
  "student_id, survey_year, employment_status, employer, designation, industry, salary_pkr, related_to_degree, satisfaction, further_study, comments, submitted_at"

function missingTable(message: string) {
  return /career_surveys/i.test(message) && /schema cache|does not exist|relation/i.test(message)
}

function fileName(studentId: string, year: number) {
  return `${studentId}__${year}.json`
}

function parseFileName(name: string) {
  const match = name.match(/^([0-9a-f-]{36})__(\d{4})\.json$/i)
  if (!match) return null
  return { studentId: match[1], year: Number(match[2]) }
}

export async function ensureCareerSurveyBucket(admin: SupabaseClient) {
  const { data: buckets } = await admin.storage.listBuckets()
  if ((buckets || []).some((bucket) => bucket.name === CAREER_SURVEY_BUCKET)) return
  const { error } = await admin.storage.createBucket(CAREER_SURVEY_BUCKET, {
    public: false,
    fileSizeLimit: 50_000,
  })
  if (error && !/already exists|duplicate/i.test(error.message)) throw error
}

async function readStorageFile(admin: SupabaseClient, path: string): Promise<CareerSurveyRow | null> {
  const { data, error } = await admin.storage.from(CAREER_SURVEY_BUCKET).download(path)
  if (error || !data) return null
  try {
    const row = JSON.parse(await data.text()) as CareerSurveyRow
    if (!row?.student_id || !row.survey_year) return null
    return row
  } catch {
    return null
  }
}

async function listStorageSurveys(admin: SupabaseClient): Promise<CareerSurveyRow[]> {
  await ensureCareerSurveyBucket(admin)
  const { data: files, error } = await admin.storage.from(CAREER_SURVEY_BUCKET).list("", { limit: 1000 })
  if (error || !files?.length) return []
  const rows: CareerSurveyRow[] = []
  for (const file of files) {
    if (!parseFileName(file.name)) continue
    const row = await readStorageFile(admin, file.name)
    if (row) rows.push(row)
  }
  return rows
}

export async function listCareerSurveysForStudent(admin: SupabaseClient, studentId: string): Promise<CareerSurveyRow[]> {
  const table = await admin.from("career_surveys").select(SELECT).eq("student_id", studentId)
  if (!table.error) return (table.data || []) as CareerSurveyRow[]
  if (!missingTable(table.error.message)) throw new Error(table.error.message)
  const all = await listStorageSurveys(admin)
  return all.filter((row) => row.student_id === studentId)
}

export async function listCareerSurveysByYear(
  admin: SupabaseClient,
  opts: { year: number; studentIds: string[] }
): Promise<CareerSurveyRow[]> {
  const { year, studentIds } = opts
  if (!studentIds.length) return []
  const table = await admin.from("career_surveys").select(SELECT).eq("survey_year", year).in("student_id", studentIds)
  if (!table.error) return (table.data || []) as CareerSurveyRow[]
  if (!missingTable(table.error.message)) throw new Error(table.error.message)
  const all = await listStorageSurveys(admin)
  const wanted = new Set(studentIds)
  return all.filter((row) => row.survey_year === year && wanted.has(row.student_id))
}

export async function upsertCareerSurvey(admin: SupabaseClient, payload: CareerSurveyRow): Promise<void> {
  const table = await admin.from("career_surveys").upsert(payload, { onConflict: "student_id,survey_year" })
  if (!table.error) return
  if (!missingTable(table.error.message)) throw new Error(table.error.message)
  await ensureCareerSurveyBucket(admin)
  const body = JSON.stringify(payload)
  const path = fileName(payload.student_id, payload.survey_year)
  const { error } = await admin.storage.from(CAREER_SURVEY_BUCKET).upload(path, body, {
    upsert: true,
    contentType: "application/json",
  })
  if (error) throw new Error(error.message)
}
