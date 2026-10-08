import type { SupabaseClient } from "@supabase/supabase-js"
import type { CoverLetter, ResumeRecord } from "@/lib/resume/schema"
import { serializeResumeLibrary } from "@/lib/resume/schema"

export async function saveResumeDocuments(
  supabase: SupabaseClient,
  userId: string,
  documents: ResumeRecord[],
  letters: CoverLetter[],
  resumePath?: string | null
) {
  const payload: Record<string, unknown> = {
    resume_document: serializeResumeLibrary(documents),
    cover_letters: letters,
  }
  if (resumePath !== undefined) payload.resume_url = resumePath

  const { error } = await supabase.from("student_profiles").update(payload).eq("id", userId)
  if (!error) return { ok: true as const, persistedJson: true }

  delete payload.resume_document
  delete payload.cover_letters
  if (resumePath === undefined) return { ok: false as const, persistedJson: false, message: error.message }

  const retry = await supabase.from("student_profiles").update({ resume_url: resumePath }).eq("id", userId)
  if (retry.error) return { ok: false as const, persistedJson: false, message: retry.error.message }
  return { ok: true as const, persistedJson: false }
}

export async function uploadResumePdf(supabase: SupabaseClient, userId: string, bytes: Uint8Array) {
  const path = `${userId}/resume-${Date.now()}.pdf`
  const { error } = await supabase.storage.from("resumes").upload(path, new Blob([bytes as BlobPart], { type: "application/pdf" }), {
    contentType: "application/pdf",
    upsert: true,
  })
  if (error) throw error
  return path
}
