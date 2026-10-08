import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { htmlToPlain } from "@/lib/resume/html"
import type { CoverLetter, JsonResume } from "@/lib/resume/schema"

const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 54
const INK = rgb(0.08, 0.06, 0.18)
const MUTED = rgb(0.33, 0.31, 0.42)
const LINE = rgb(0.35, 0.28, 1)
const RULE = rgb(0.85, 0.83, 0.93)

function latin(value: string) {
  return value.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim()
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = latin(text).split(" ").filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : [""]
}

class Writer {
  doc: PDFDocument
  page: PDFPage
  font: PDFFont
  bold: PDFFont
  y: number

  constructor(doc: PDFDocument, page: PDFPage, font: PDFFont, bold: PDFFont) {
    this.doc = doc
    this.page = page
    this.font = font
    this.bold = bold
    this.y = PAGE_H - MARGIN
  }

  ensure(needed = 48) {
    if (this.y > MARGIN + needed) return
    this.page = this.doc.addPage([PAGE_W, PAGE_H])
    this.y = PAGE_H - MARGIN
  }

  gap(n: number) {
    this.y -= n
  }

  text(value: string, opts: { size: number; font?: PDFFont; color?: ReturnType<typeof rgb>; max?: number }) {
    const font = opts.font || this.font
    const width = opts.max ?? PAGE_W - MARGIN * 2
    const lines = wrap(font, value, opts.size, width)
    for (const line of lines) {
      this.ensure(opts.size + 6)
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y - opts.size,
        size: opts.size,
        font,
        color: opts.color || INK,
      })
      this.y -= opts.size + 4
    }
  }

  heading(label: string) {
    this.ensure(36)
    this.gap(10)
    this.page.drawText(latin(label), {
      x: MARGIN,
      y: this.y - 10,
      size: 9,
      font: this.bold,
      color: LINE,
    })
    this.y -= 16
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness: 0.7,
      color: RULE,
    })
    this.gap(10)
  }
}

export async function renderResumePdf(resume: JsonResume) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([PAGE_W, PAGE_H])
  const w = new Writer(pdf, page, font, bold)
  const b = resume.basics

  w.text(b.name || "Your name", { size: 22, font: bold })
  if (b.label) w.text(b.label, { size: 11, color: MUTED })
  const meta = [
    b.email,
    b.phone,
    [b.location?.city, b.location?.region].filter(Boolean).join(", "),
    b.url,
    ...(b.profiles || []).map((p) => p.url),
  ]
    .filter(Boolean)
    .join("  ·  ")
  if (meta) w.text(meta, { size: 9, color: MUTED })
  w.gap(6)

  if (htmlToPlain(b.summary || "")) {
    w.heading("Summary")
    w.text(htmlToPlain(b.summary || ""), { size: 10 })
  }

  if (resume.education.some((e) => e.institution || e.studyType || e.area)) {
    w.heading("Education")
    for (const edu of resume.education) {
      const title = [edu.institution, edu.endDate].filter(Boolean).join("  ·  ")
      if (title) w.text(title, { size: 11, font: bold })
      const detail = [edu.studyType, edu.area, edu.score].filter(Boolean).join(" · ")
      if (detail) w.text(detail, { size: 10, color: MUTED })
      w.gap(6)
    }
  }

  if (resume.work.some((job) => job.name || job.position)) {
    w.heading("Experience")
    for (const job of resume.work) {
      const title = [job.position, job.name].filter(Boolean).join(" · ")
      if (title) w.text(title, { size: 11, font: bold })
      const dates = [job.startDate, job.endDate || "Present"].filter(Boolean).join(" – ")
      if (dates) w.text(dates, { size: 9, color: MUTED })
      if (htmlToPlain(job.summary || "")) w.text(htmlToPlain(job.summary || ""), { size: 10 })
      for (const h of job.highlights || []) {
        const line = htmlToPlain(h)
        if (line) w.text(`• ${line}`, { size: 10 })
      }
      w.gap(8)
    }
  }

  if (resume.projects.some((p) => p.name)) {
    w.heading("Projects")
    for (const project of resume.projects) {
      w.text(project.name, { size: 11, font: bold })
      if (project.url) w.text(project.url, { size: 9, color: MUTED })
      if (htmlToPlain(project.description || "")) w.text(htmlToPlain(project.description || ""), { size: 10 })
      for (const h of project.highlights || []) {
        if (h.trim()) w.text(`• ${h}`, { size: 10 })
      }
      w.gap(8)
    }
  }

  const skills = resume.skills.map((s) => s.name).filter(Boolean)
  if (skills.length) {
    w.heading("Skills")
    w.text(skills.join("  ·  "), { size: 10 })
  }

  if (resume.languages?.some((row) => row.language)) {
    w.heading("Languages")
    w.text(
      resume.languages
        .filter((row) => row.language)
        .map((row) => [row.language, row.fluency].filter(Boolean).join(" — "))
        .join("  ·  "),
      { size: 10 }
    )
  }

  if (resume.certificates?.some((row) => row.name)) {
    w.heading("Certificates")
    for (const row of resume.certificates) {
      if (!row.name) continue
      w.text([row.name, row.issuer, row.date].filter(Boolean).join(" · "), { size: 10 })
    }
  }

  if (resume.awards?.some((row) => row.title)) {
    w.heading("Awards")
    for (const row of resume.awards) {
      if (!row.title) continue
      w.text([row.title, row.date].filter(Boolean).join(" · "), { size: 11, font: bold })
      if (htmlToPlain(row.summary || "")) w.text(htmlToPlain(row.summary || ""), { size: 10 })
    }
  }

  return pdf.save()
}

export async function renderCoverLetterPdf(letter: CoverLetter, name?: string) {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([PAGE_W, PAGE_H])
  const w = new Writer(pdf, page, font, bold)
  const heading = [letter.role, letter.company].filter(Boolean).join(" · ") || letter.title
  w.text(name || letter.title, { size: 16, font: bold })
  w.text(heading, { size: 11, color: MUTED })
  w.gap(16)
  for (const para of htmlToPlain(letter.body).split(/\n+/)) {
    if (!para.trim()) {
      w.gap(8)
      continue
    }
    w.text(para.replace(/^•\s*/, "• "), { size: 11 })
    w.gap(8)
  }
  return pdf.save()
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugName(value: string) {
  return latin(value || "document")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "document"
}
