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

export function pctChange(series: number[]) {
  if (series.length < 2) return null
  const mid = Math.max(1, Math.floor(series.length / 2))
  const prev = series.slice(0, mid).reduce((sum, n) => sum + n, 0)
  const next = series.slice(mid).reduce((sum, n) => sum + n, 0)
  if (prev <= 0) return null
  return Math.round(((next - prev) / prev) * 100)
}
