const BLOCK_CLOSE = /<\/(p|div|h[1-6]|li|blockquote)>/gi

export function isHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value)
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
}

export function htmlToPlain(html: string) {
  if (!html) return ""
  if (!isHtml(html)) return html
  return decodeHtml(
    sanitizeHtml(html)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(BLOCK_CLOSE, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function toEditorHtml(value: string) {
  if (!value?.trim()) return ""
  if (isHtml(value)) return sanitizeHtml(value)
  return value
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("")
}

export function linesToListHtml(lines: string[]) {
  const items = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const inner = isHtml(line)
        ? sanitizeHtml(line).replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "")
        : escapeHtml(line)
      return `<li><p>${inner}</p></li>`
    })
  if (!items.length) return ""
  return `<ul>${items.join("")}</ul>`
}

export function listHtmlToLines(html: string) {
  if (!html) return []
  const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => (match[1] || "").replace(/<\/?p[^>]*>/gi, "").trim())
    .filter(Boolean)
  if (items.length) return items
  const plain = htmlToPlain(html)
  return plain ? plain.split("\n") : []
}

export const richHtmlClassName =
  "resume-html [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_a]:text-primary"
