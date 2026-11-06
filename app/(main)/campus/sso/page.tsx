import { redirect } from "next/navigation"

export default async function CampusSsoRedirect({ searchParams }: { searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }> }) {
  const { campus } = await searchParams
  const q = campus ? `?campus=${encodeURIComponent(campus)}` : ""
  redirect(`/campus/settings${q}`)
}
