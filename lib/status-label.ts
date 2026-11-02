const LABELS: Record<string, string> = {
  chatting: "In conversation",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  archived: "Archived",
  pending: "Pending",
  active: "Active",
  declined: "Declined",
  approved: "Approved",
  rejected: "Held",
  requested: "Requested",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  no_show: "No-show",
  accepted: "Accepted",
  going: "Going",
  career_fair: "Career fair",
  info_session: "Info session",
  workshop: "Workshop",
  other: "Other",
  students: "Students",
  alumni: "Alumni",
  all: "Everyone",
  internship: "Internship",
  job: "Job",
  in_progress: "In progress",
  completed: "Completed",
  verified: "Verified",
}

export function humanLabel(value: string | null | undefined, fallback = "Unknown") {
  if (!value) return fallback
  const key = value.trim()
  if (LABELS[key]) return LABELS[key]
  const spaced = key.replaceAll("_", " ").trim()
  if (!spaced) return fallback
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function statusTone(value: string | null | undefined): "default" | "secondary" | "outline" | "success" | "destructive" {
  switch (value) {
    case "active":
    case "approved":
    case "accepted":
    case "going":
    case "hired":
    case "verified":
    case "completed":
    case "confirmed":
      return "success"
    case "declined":
    case "rejected":
    case "cancelled":
    case "no_show":
      return "destructive"
    case "pending":
    case "requested":
    case "shortlisted":
    case "interview":
    case "offer":
    case "in_progress":
      return "secondary"
    default:
      return "outline"
  }
}
