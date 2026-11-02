/**
 * Excel (SpreadsheetML, opens in Excel) and PDF renderers for tabular exports and accreditation reports.
 * No extra dependencies: pdf-lib is already installed; SpreadsheetML is a single XML file.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib"

export type Sheet = {
  name: string
  columns: string[]
  rows: Record<string, unknown>[]
}

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
      const header = `<Row>${sheet.columns.map((c) => cell(c)).join("")}</Row>`
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

const PAGE_W = 841.89
const PAGE_H = 595.28
const MARGIN = 36

/** Helvetica only covers WinAnsi. Replace anything else so drawText doesn't throw. */
function latin(value: string) {
  return value.replace(/[^\t\r\n\x20-\x7e]/g, "?")
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
  return lines.slice(0, 3)
}

export async function toPdf(opts: { title: string; subtitle?: string; sheets: Sheet[]; rowCap?: number }) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const cap = opts.rowCap ?? 400
  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H])
    y = PAGE_H - MARGIN
  }
  const ensure = (height: number) => {
    if (y - height < MARGIN) newPage()
  }
  const draw = (text: string, size: number, face: PDFFont, color = rgb(0.07, 0.09, 0.12)) => {
    ensure(size + 6)
    page.drawText(latin(text), { x: MARGIN, y, size, font: face, color })
    y -= size + 6
  }

  draw(opts.title.slice(0, 120), 16, bold)
  if (opts.subtitle) draw(opts.subtitle.slice(0, 180), 9, font, rgb(0.35, 0.38, 0.42))
  y -= 6

  for (const sheet of opts.sheets) {
    draw(sheet.name, 12, bold)
    const shown = sheet.rows.slice(0, cap)
    const cols = sheet.columns.slice(0, 8)
    const tableW = PAGE_W - MARGIN * 2
    const colW = tableW / Math.max(cols.length, 1)
    const paintRow = (values: string[], face: PDFFont, size: number) => {
      const wrapped = values.map((value) => wrap(value || "—", face, size, colW - 6))
      const lines = Math.max(1, ...wrapped.map((w) => w.length))
      const height = lines * (size + 2) + 6
      ensure(height)
      wrapped.forEach((block, i) => {
        block.forEach((line, li) => {
          page.drawText(latin(line), { x: MARGIN + i * colW, y: y - li * (size + 2), size, font: face })
        })
      })
      y -= height
    }
    paintRow(cols, bold, 8)
    for (const row of shown) {
      paintRow(
        cols.map((c) => {
          const value = row[c]
          const s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value)
          return s.slice(0, 80)
        }),
        font,
        8,
      )
    }
    if (sheet.rows.length > shown.length || sheet.columns.length > cols.length) {
      draw(
        `Showing ${shown.length} of ${sheet.rows.length} rows and ${cols.length} of ${sheet.columns.length} columns. Use the Excel download for the full table.`,
        8,
        font,
        rgb(0.35, 0.38, 0.42),
      )
    }
    y -= 8
  }

  draw(`Generated ${new Date().toISOString().slice(0, 10)} · SwypeJobs`, 8, font, rgb(0.45, 0.48, 0.52))
  return doc.save()
}
