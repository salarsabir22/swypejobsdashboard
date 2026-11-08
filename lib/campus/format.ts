import type { DataSource, SourcedNumber } from "@/lib/campus/types"

export function sourceLabel(source: DataSource) {
  if (source === "platform") return "Verified from swipes & hiring"
  if (source === "survey") return "Survey-based"
  if (source === "verified") return "Verified"
  return "Self-reported"
}

export function fmtPct(value: number | null | undefined) {
  if (value == null) return "—"
  return `${value}%`
}

export function fmtNum(value: number | null | undefined) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en").format(value)
}

export function fmtSourced(row: SourcedNumber, kind: "pct" | "num" = "num") {
  if (row.value == null) return "—"
  return kind === "pct" ? fmtPct(row.value) : fmtNum(row.value)
}

/** Compare the latest window slice to the prior equal slice (prefer ~7 days). */
export function pctChange(series: number[]) {
  if (series.length < 4) return null
  const slice = Math.max(2, Math.min(7, Math.floor(series.length / 2)))
  if (series.length < slice * 2) return null
  const next = series.slice(-slice).reduce((sum, n) => sum + n, 0)
  const prev = series.slice(-slice * 2, -slice).reduce((sum, n) => sum + n, 0)
  if (prev <= 0) return null
  const total = prev + next
  // One-sided windows (almost all volume in one slice) read as fake trends.
  if (total > 0 && (prev / total < 0.15 || next / total < 0.15)) return null
  return Math.round(((next - prev) / prev) * 100)
}
