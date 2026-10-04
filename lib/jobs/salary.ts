export function formatSalary(opts: {
  min?: number | null
  max?: number | null
  currency?: string | null
  note?: string | null
}) {
  const currency = opts.currency?.trim() || "PKR"
  const min = opts.min != null ? Number(opts.min) : null
  const max = opts.max != null ? Number(opts.max) : null
  if (min != null && max != null && min > 0 && max > 0) {
    return `${currency} ${formatBand(min)}–${formatBand(max)}`
  }
  if (min != null && min > 0) return `${currency} ${formatBand(min)}+`
  if (max != null && max > 0) return `Up to ${currency} ${formatBand(max)}`
  return opts.note?.trim() || null
}

function formatBand(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}
