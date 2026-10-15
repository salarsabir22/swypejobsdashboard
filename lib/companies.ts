type SchemaError = { message?: string; code?: string } | null

export function isCompanySchemaMissing(error: SchemaError) {
  if (!error) return false
  const code = error.code || ""
  if (code === "42P01" || code === "PGRST202" || code === "PGRST205" || code === "PGRST204") return true
  const message = (error.message || "").toLowerCase()
  return message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find")
}

