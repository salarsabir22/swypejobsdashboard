export const IOBM_UNIVERSITY_NAME = "Institute of Business Management (IoBM), Karachi"
export const IOBM_SHORT_NAME = "IoBM"
export const IOBM_HOSTED_DOMAIN = "iobm.edu.pk"

export const IOBM_EMAIL_DOMAINS = ["iobm.edu.pk"] as const

export type IobmPortal = "student" | "alumni" | "faculty" | "employer"

export const IOBM_PORTALS: readonly IobmPortal[] = ["student", "alumni", "faculty", "employer"]

export function isIobmPortal(value: string | null | undefined): value is IobmPortal {
  return value === "student" || value === "alumni" || value === "faculty" || value === "employer"
}

export function isIobmCampusEmail(email: string | null | undefined) {
  const domain = email?.split("@")[1]?.trim().toLowerCase()
  if (!domain) return false
  return domain === IOBM_HOSTED_DOMAIN || domain.endsWith(`.${IOBM_HOSTED_DOMAIN}`)
}

export const IOBM_STAFF_ROLES = [
  {
    id: "director",
    label: "CDC Super Admin",
    description: "Tenant settings, staff roles, exports, integrations, and every approval.",
  },
  {
    id: "advisor",
    label: "CDC Staff / Career Advisor",
    description: "Student and employer lookup, appointments, messages, and job approvals when granted.",
  },
  {
    id: "coordinator",
    label: "Department Coordinator",
    description: "Department placements, programme mapping, referrals, and departmental events.",
  },
  {
    id: "dean",
    label: "Dean",
    description: "College-level outcomes, reports, and career-office oversight.",
  },
  {
    id: "faculty",
    label: "Faculty / Mentor",
    description: "Restricted referrals, mentorship, and approved career content — no bulk student files.",
  },
  {
    id: "auditor",
    label: "Auditor / Report Viewer",
    description: "Read-only reports and export history. No editing or unrestricted profile browsing.",
  },
] as const

export type IobmStaffRoleId = (typeof IOBM_STAFF_ROLES)[number]["id"]

const STAFF_ROLE_IDS = new Set<string>(IOBM_STAFF_ROLES.map((role) => role.id))

export function isIobmStaffRole(value: string | null | undefined): value is IobmStaffRoleId {
  return Boolean(value && STAFF_ROLE_IDS.has(value))
}

export function staffRoleOf(value: string | null | undefined): IobmStaffRoleId {
  return isIobmStaffRole(value) ? value : "advisor"
}

export function formatIobmStaffRole(id: string | null | undefined) {
  return IOBM_STAFF_ROLES.find((role) => role.id === id)?.label || id || "Career office"
}

export const IOBM_PORTAL_COPY: Record<
  IobmPortal,
  { title: string; kicker: string; body: string; ssoLabel: string }
> = {
  student: {
    title: "Student Login",
    kicker: "Current IoBM students",
    body: "Find jobs and internships, apply, book advising, and RSVP to campus events with your IoBM account.",
    ssoLabel: "Continue with IoBM SSO",
  },
  alumni: {
    title: "Alumni Login",
    kicker: "IoBM graduates",
    body: "Keep your student history, update employment outcomes, browse alumni roles, and opt in to mentorship.",
    ssoLabel: "Continue with IoBM SSO",
  },
  faculty: {
    title: "Faculty/Staff Login",
    kicker: "CDC, advisors, faculty, coordinators",
    body: "Enter through campus SSO. Your IoBM role maps to CDC Super Admin, advisor, coordinator, faculty, dean, or auditor access.",
    ssoLabel: "Continue with IoBM SSO",
  },
  employer: {
    title: "Employer Login",
    kicker: "Hiring partners",
    body: "Employers do not use campus SSO. Sign in with a work email, then request or accept an IoBM CDC partnership to post roles.",
    ssoLabel: "Employer sign in",
  },
}

export function iobmAppRole(portal: IobmPortal): "student" | "university" | "recruiter" {
  if (portal === "faculty") return "university"
  if (portal === "employer") return "recruiter"
  return "student"
}

export function campusSsoRequiresIobmEmail(portal: IobmPortal, identityClaim = false) {
  if (portal === "employer") return false
  if (portal === "alumni" && identityClaim) return false
  return process.env.NEXT_PUBLIC_IOBM_REQUIRE_CAMPUS_EMAIL === "true"
}

export function iobmGoogleHostedDomain() {
  if (process.env.NEXT_PUBLIC_IOBM_GOOGLE_HD === "true") return IOBM_HOSTED_DOMAIN
  return null
}
