import { redirect } from "next/navigation"

export default async function CampusSsoRedirect({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const { campus, range, from, to } = await searchParams
  const q = new URLSearchParams()
  if (campus) q.set("campus", campus)
  if (range) q.set("range", range)
  if (from) q.set("from", from)
  if (to) q.set("to", to)
  q.set("focus", "sso")
  redirect(`/campus/settings?${q.toString()}`)
}
