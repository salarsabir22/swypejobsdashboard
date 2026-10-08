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
