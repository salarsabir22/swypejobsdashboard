import type { CountRow } from "@/lib/campus/types"

export function degreeLevel(degree?: string | null) {
  const d = (degree || "").toLowerCase()
  if (/ph\.?d|doctoral|dphil/.test(d)) return "Doctoral"
  if (/m\.?\s*s|m\.?\s*sc|master|mba|mphil|ll\.?m/.test(d)) return "Master's"
  if (/b\.?\s*s|b\.?\s*sc|b\.?\s*e|bachelor|ll\.?b|associate/.test(d)) return "Bachelor's"
  return degree?.trim() ? "Other" : "Unknown"
}

export function employerType(opts: { employeeCount?: string | null; industry?: string | null }) {
  const industry = (opts.industry || "").toLowerCase()
  if (/government|public sector/.test(industry)) return "Government"
  if (/nonprofit|ngo|development/.test(industry)) return "Nonprofit"
  const n = opts.employeeCount || ""
  if (n === "1-10" || n === "11-50") return "Startup"
  if (n === "51-200" || n === "201-500") return "Mid-size"
  if (n === "501-1000" || n === "1000+") return "Enterprise"
  return "Unspecified"
}

export function workMode(job: { is_remote?: boolean | null; location?: string | null }) {
  if (job.is_remote) return "Remote"
  if ((job.location || "").toLowerCase().includes("hybrid")) return "Hybrid"
  return "On-site"
}

export function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

export function average(values: number[]) {
  if (!values.length) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

export function pct(part: number, whole: number) {
  if (!whole) return null
  return Math.round((part / whole) * 100)
}

export function countBy(labels: (string | null | undefined)[]): CountRow[] {
  const map = new Map<string, number>()
  for (const raw of labels) {
    const label = (raw || "").trim() || "Unknown"
    map.set(label, (map.get(label) || 0) + 1)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

export function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

export function hoursBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3600000))
}

export function inLastDays(iso: string | null | undefined, days: number) {
  if (!iso) return false
  return new Date(iso).getTime() >= Date.now() - days * 86400000
}

export function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}
