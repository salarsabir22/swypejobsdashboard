export function profileSharePath(role: string | null | undefined, userId: string) {
  if (role === "recruiter") return `/company/${userId}`
  return `/candidates/${userId}`
}
