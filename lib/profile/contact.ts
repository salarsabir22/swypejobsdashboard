/**
 * Student contact details (phone + personal email) captured during onboarding.
 * Always mirrored to auth metadata so the values survive workspaces whose
 * `student_profiles` table has not picked up the columns yet.
 */

export type StudentContact = { phone: string; personalEmail: string }

type ContactRow = { phone?: unknown; personal_email?: unknown }

export function contactFromMetadata(metadata: Record<string, unknown> | null | undefined): StudentContact {
  return {
    phone: typeof metadata?.phone === "string" ? metadata.phone : "",
    personalEmail: typeof metadata?.personal_email === "string" ? metadata.personal_email : "",
  }
}

/** Prefer the profile row, fall back to auth metadata for older workspaces. */
export function mergeContact(
  row: ContactRow | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): StudentContact {
  const meta = contactFromMetadata(metadata)
  const phone = row?.phone === null || row?.phone === undefined ? "" : String(row.phone)
  const personalEmail =
    row?.personal_email === null || row?.personal_email === undefined ? "" : String(row.personal_email)
  return { phone: phone || meta.phone, personalEmail: personalEmail || meta.personalEmail }
}

export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15
}

export function isValidPersonalEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/** First blocking problem, or null when the contact details are usable. */
export function contactIssues(contact: StudentContact): string | null {
  if (!contact.phone.trim()) return "Add your phone number so employers can reach you."
  if (!isValidPhone(contact.phone)) return "Enter a valid phone number, e.g. +92 300 1234567."
  if (!contact.personalEmail.trim()) return "Add a personal email address (not your university inbox)."
  if (!isValidPersonalEmail(contact.personalEmail)) return "Enter a valid personal email address."
  return null
}

/** Writes the profile row and mirrors the values to auth metadata. */
export async function saveStudentContact(
  supabase: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (table: string) => any
    auth: {
      updateUser: (attributes: { data: Record<string, unknown> }) => Promise<{ error: { message?: string } | null }>
    }
  },
  userId: string,
  contact: StudentContact
): Promise<string | null> {
  const phone = contact.phone.trim() || null
  const personalEmail = contact.personalEmail.trim() || null

  const mirrored = await supabase.auth.updateUser({ data: { phone, personal_email: personalEmail } })
  const { error } = await supabase.from("student_profiles").update({ phone, personal_email: personalEmail }).eq("id", userId)
  // A missing column is fine: the metadata copy above already stored the values.
  if (error && !/phone|personal_email|column|schema cache/i.test(error.message)) return error.message
  if (mirrored.error) return mirrored.error.message || "Couldn’t save your contact details."
  return null
}
