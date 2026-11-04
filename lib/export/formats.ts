/**
 * Excel (SpreadsheetML, opens in Excel) and PDF renderers for tabular exports and accreditation reports.
 * No extra dependencies: pdf-lib is already installed; SpreadsheetML is a single XML file.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

export type Sheet = {
  name: string
  columns: string[]
  rows: Record<string, unknown>[]
}

export type PdfHero = { label: string; value: string; hint?: string }

function xml(value: unknown) {
  const s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value)
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function cell(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
  }
  return `<Cell><Data ss:Type="String">${xml(value)}</Data></Cell>`
}

/** Excel 2003 XML. Excel, LibreOffice, and Google Sheets open it. */
export function toExcel(sheets: Sheet[]) {
  const body = sheets
    .map((sheet) => {
      const header = `<Row>${sheet.columns.map((c) => cell(c.replace(/_/g, " "))).join("")}</Row>`
      const rows = sheet.rows.map((row) => `<Row>${sheet.columns.map((c) => cell(row[c])).join("")}</Row>`).join("")
      const name = xml(sheet.name.slice(0, 31) || "Sheet")
      return `<Worksheet ss:Name="${name}"><Table>${header}${rows}</Table></Worksheet>`
    })
    .join("")
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${body}
</Workbook>`
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return ""
  const s = Array.isArray(value) ? value.join("; ") : typeof value === "object" ? JSON.stringify(value) : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** One workbook as a sectioned CSV so overall reports keep every table. */
export function toCsvSheets(sheets: Sheet[]) {
  const parts = (sheets.length ? sheets : [{ name: "Report", columns: ["value"], rows: [] as Record<string, unknown>[] }]).map((sheet) => {
    const header = sheet.columns.map(csvEscape).join(",")
    const rows = sheet.rows.map((row) => sheet.columns.map((c) => csvEscape(row[c])).join(","))
    return [`# ${sheet.name}`, header, ...rows].join("\r\n")
  })
  return `\uFEFF${parts.join("\r\n\r\n")}\r\n`
}

const LANDSCAPE = { w: 841.89, h: 595.28 }
const PORTRAIT = { w: 595.28, h: 841.89 }
const MARGIN = 40
const NAVY = rgb(0.02, 0.11, 0.173)
const BLUE = rgb(0.133, 0.318, 1)
const INK = rgb(0.07, 0.09, 0.12)
const MUTED = rgb(0.35, 0.38, 0.42)
const LINE = rgb(0.88, 0.9, 0.93)
const HEAD = rgb(0.95, 0.96, 0.98)
const ZEBRA = rgb(0.97, 0.98, 0.99)
const WHITE = rgb(1, 1, 1)

/** Helvetica only covers WinAnsi. Replace anything else so drawText doesn't throw. */
function latin(value: string) {
  return value
    .replace(/\u00b7/g, " - ")
    .replace(/[•]/g, "-")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\t\r\n\x20-\x7e]/g, "?")
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const word of words.length ? words : [""]) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= width) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
  }
  if (line) lines.push(line)
  return lines.length ? lines : [""]
}

function cellText(value: unknown) {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) return value.join("; ")
  return String(value)
}

export async function toPdf(opts: {
  title: string
  subtitle?: string
  org?: string
  hero?: PdfHero
  notes?: string[]
  sheets: Sheet[]
  rowCap?: number
  layout?: "landscape" | "portrait"
}) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const size = opts.layout === "portrait" ? PORTRAIT : LANDSCAPE
  const cap = opts.rowCap ?? 400
  const headerH = 56
  const footerH = 28
  const org = opts.org || "IoBM Career Development Center"

  let page!: PDFPage
  let y = 0
  const pages: PDFPage[] = []

  const paintChrome = (target: PDFPage) => {
    target.drawRectangle({ x: 0, y: size.h - headerH, width: size.w, height: headerH, color: NAVY })
    target.drawRectangle({ x: 0, y: size.h - headerH, width: 6, height: headerH, color: BLUE })
    target.drawText(latin(org), {
      x: MARGIN,
      y: size.h - 24,
      size: 9,
      font: bold,
      color: WHITE,
    })
    const sub = latin((opts.subtitle || "Career office report").slice(0, 90))
    target.drawText(sub, {
      x: MARGIN,
      y: size.h - 40,
      size: 8,
      font,
      color: rgb(0.75, 0.8, 0.86),
    })
  }

  const addPage = () => {
    page = doc.addPage([size.w, size.h])
    pages.push(page)
    paintChrome(page)
    y = size.h - headerH - 22
  }

  const ensure = (height: number) => {
    if (y - height < MARGIN + footerH) addPage()
  }

  addPage()

  const titleLines = wrap(latin(opts.title), bold, 18, size.w - MARGIN * 2).slice(0, 3)
  for (const line of titleLines) {
    ensure(22)
    page.drawText(line, { x: MARGIN, y, size: 18, font: bold, color: INK })
    y -= 22
  }
  page.drawText(latin(`Generated ${new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`), {
    x: MARGIN,
    y,
    size: 8,
    font,
    color: MUTED,
  })
  y -= 18

  if (opts.hero) {
    const hintLines = opts.hero.hint ? wrap(latin(opts.hero.hint), font, 8, size.w - MARGIN * 2 - 28).slice(0, 2) : []
    const boxH = 62 + hintLines.length * 12
    ensure(boxH + 12)
    const boxBottom = y - boxH
    page.drawRectangle({
      x: MARGIN,
      y: boxBottom,
      width: size.w - MARGIN * 2,
      height: boxH,
      color: HEAD,
      borderColor: LINE,
      borderWidth: 0.6,
    })
    page.drawRectangle({
      x: MARGIN,
      y: boxBottom,
      width: 5,
      height: boxH,
      color: BLUE,
    })
    page.drawText(latin(opts.hero.label), { x: MARGIN + 16, y: boxBottom + boxH - 18, size: 9, font, color: MUTED })
    page.drawText(latin(opts.hero.value), { x: MARGIN + 16, y: boxBottom + boxH - 46, size: 22, font: bold, color: BLUE })
    hintLines.forEach((line, i) => {
      page.drawText(line, { x: MARGIN + 16, y: boxBottom + 12 + (hintLines.length - 1 - i) * 12, size: 8, font, color: MUTED })
    })
    y = boxBottom - 16
  }

  if (opts.notes?.length) {
    ensure(16)
    page.drawText("Notes", { x: MARGIN, y, size: 11, font: bold, color: INK })
    y -= 16
    for (const note of opts.notes.slice(0, 8)) {
      const lines = wrap(latin(`- ${note}`), font, 9, size.w - MARGIN * 2)
      for (const line of lines.slice(0, 3)) {
        ensure(12)
        page.drawText(line, { x: MARGIN, y, size: 9, font, color: MUTED })
        y -= 12
      }
    }
    y -= 8
  }

  for (const sheet of opts.sheets) {
    ensure(28)
    page.drawText(latin(sheet.name.slice(0, 80)), { x: MARGIN, y, size: 12, font: bold, color: INK })
    y -= 8
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: size.w - MARGIN, y },
      thickness: 1,
      color: BLUE,
    })
    y -= 14

    const shown = sheet.rows.slice(0, cap)
    const cols = sheet.columns.slice(0, 8)
    const tableW = size.w - MARGIN * 2
    const colW = tableW / Math.max(cols.length, 1)
    const rowSize = 8

    const paintRow = (values: string[], face: PDFFont, header: boolean, zebra: boolean) => {
      const wrapped = values.map((value) => wrap(value || "-", face, rowSize, colW - 8).slice(0, header ? 1 : 3))
      const lines = Math.max(1, ...wrapped.map((w) => w.length))
      const padY = 6
      const height = lines * (rowSize + 2) + padY * 2
      ensure(height)
      const bottom = y - height
      page.drawRectangle({
        x: MARGIN,
        y: bottom,
        width: tableW,
        height,
        color: header ? NAVY : zebra ? ZEBRA : WHITE,
      })
      wrapped.forEach((block, i) => {
        block.forEach((line, li) => {
          page.drawText(latin(line), {
            x: MARGIN + 4 + i * colW,
            y: bottom + height - padY - rowSize - li * (rowSize + 2),
            size: rowSize,
            font: face,
            color: header ? WHITE : INK,
          })
        })
      })
      y = bottom
    }

    paintRow(
      cols.map((c) => c.replace(/_/g, " ")),
      bold,
      true,
      false
    )
    shown.forEach((row, index) => {
      paintRow(
        cols.map((c) => cellText(row[c]).slice(0, 80)),
        font,
        false,
        index % 2 === 1
      )
    })
    if (!shown.length) {
      ensure(16)
      page.drawText("No rows for this section.", { x: MARGIN, y, size: 8, font, color: MUTED })
      y -= 16
    }
    if (sheet.rows.length > shown.length || sheet.columns.length > cols.length) {
      ensure(14)
      page.drawText(
        latin(
          `Showing ${shown.length} of ${sheet.rows.length} rows and ${cols.length} of ${sheet.columns.length} columns. Use Excel for the full table.`
        ),
        { x: MARGIN, y, size: 8, font, color: MUTED }
      )
      y -= 14
    }
    y -= 12
  }

  pages.forEach((target, index) => {
    target.drawLine({
      start: { x: MARGIN, y: MARGIN + 10 },
      end: { x: size.w - MARGIN, y: MARGIN + 10 },
      thickness: 0.4,
      color: LINE,
    })
    target.drawText("Confidential · For career-office use", {
      x: MARGIN,
      y: MARGIN,
      size: 7,
      font,
      color: MUTED,
    })
    const label = `Page ${index + 1} of ${pages.length}`
    const width = font.widthOfTextAtSize(label, 7)
    target.drawText(label, {
      x: size.w - MARGIN - width,
      y: MARGIN,
      size: 7,
      font,
      color: MUTED,
    })
  })

  return doc.save()
}
