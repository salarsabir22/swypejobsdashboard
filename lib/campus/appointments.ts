const NOTE_SEP = " — "

export const APPOINTMENT_COLUMNS =
  "id, student_id, university, advisor_id, kind, starts_at, status, created_at"

export type AppointmentRecord = {
  id: string
  student_id: string | null
  university: string | null
  advisor_id: string | null
  kind: string | null
  starts_at: string | null
  status: string
  created_at?: string
}

export function appointmentTopic(kind: string | null | undefined) {
  const value = (kind || "Advising").trim()
  const at = value.indexOf(NOTE_SEP)
  return at === -1 ? value : value.slice(0, at).trim() || "Advising"
}

export function appointmentNote(kind: string | null | undefined) {
  const value = (kind || "").trim()
  const at = value.indexOf(NOTE_SEP)
  if (at === -1) return null
  return value.slice(at + NOTE_SEP.length).trim() || null
}

export function appointmentKind(topic: string, note?: string | null) {
  const subject = topic.trim() || "Advising"
  const extra = note?.trim()
  return extra ? `${subject}${NOTE_SEP}${extra}` : subject
}

/** Live check constraint is booked | completed | no_show | cancelled. */
export function appointmentUiStatus(status: string, advisorId?: string | null) {
  if (status === "booked") return advisorId ? "confirmed" : "requested"
  return status
}

export function toAppointmentView(row: AppointmentRecord) {
  return {
    id: row.id,
    student_id: row.student_id,
    university: row.university || "",
    topic: appointmentTopic(row.kind),
    note: appointmentNote(row.kind),
    starts_at: row.starts_at || "",
    status: appointmentUiStatus(row.status, row.advisor_id),
    created_at: row.created_at,
  }
}

export function appointmentWriteStatus(uiStatus: string) {
  if (uiStatus === "confirmed" || uiStatus === "requested") return "booked"
  return uiStatus
}
