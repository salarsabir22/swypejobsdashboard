import { redirect } from "next/navigation"

export default async function UniversityLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const next = new URLSearchParams()
  if (params.error) next.set("error", params.error)
  if (params.next) next.set("next", params.next)
  const query = next.toString()
  redirect(query ? `/login?${query}` : "/login")
}
