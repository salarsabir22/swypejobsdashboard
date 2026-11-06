import { htmlToPlain } from "@/lib/resume/html"
import type { CoverLetter, JsonResume } from "@/lib/resume/schema"
import { slugName } from "@/lib/resume/pdf"

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function para(text: string, style = "margin:0 0 8pt 0;font-size:11pt;line-height:1.45;") {
  const plain = htmlToPlain(text).trim()
  if (!plain) return ""
  return `<p style="${style}">${esc(plain)}</p>`
}

function heading(text: string) {
  return `<h2 style="margin:18pt 0 6pt;font-size:13pt;color:#005BE2;border-bottom:1px solid #B3B3B3;padding-bottom:4pt;">${esc(text)}</h2>`
}

export function resumeToWordHtml(resume: JsonResume) {
  const b = resume.basics
  const meta = [b.email, b.phone, [b.location?.city, b.location?.region].filter(Boolean).join(", "), b.url]
    .filter(Boolean)
    .map(String)
  const profiles = (b.profiles || []).filter((p) => p.url).map((p) => p.url)

  const sections: string[] = []
  sections.push(`<h1 style="margin:0 0 4pt;font-size:22pt;">${esc(b.name || "Resume")}</h1>`)
  if (b.label) sections.push(`<p style="margin:0 0 6pt;color:#495057;">${esc(b.label)}</p>`)
  if (meta.length || profiles.length) {
    sections.push(`<p style="margin:0 0 14pt;font-size:10pt;color:#495057;">${esc([...meta, ...profiles].join(" · "))}</p>`)
  }
  if (htmlToPlain(b.summary || "")) {
    sections.push(heading("Summary"), para(b.summary || ""))
  }
  if (resume.education.some((e) => e.institution || e.studyType)) {
    sections.push(heading("Education"))
    for (const edu of resume.education) {
      if (!edu.institution && !edu.studyType) continue
      sections.push(
        `<p style="margin:0 0 2pt;font-weight:700;">${esc(edu.institution || "Institution")}</p>`,
        `<p style="margin:0 0 10pt;font-size:10pt;color:#495057;">${esc(
          [edu.studyType, edu.area, edu.score, edu.endDate].filter(Boolean).join(" · ")
        )}</p>`
      )
    }
  }
  if (resume.work.some((job) => job.name || job.position)) {
    sections.push(heading("Experience"))
    for (const job of resume.work) {
      if (!job.name && !job.position) continue
      sections.push(
        `<p style="margin:0 0 2pt;font-weight:700;">${esc([job.position, job.name].filter(Boolean).join(" · "))}</p>`,
        `<p style="margin:0 0 4pt;font-size:10pt;color:#495057;">${esc(
          [job.startDate, job.endDate || (job.startDate ? "Present" : "")].filter(Boolean).join(" – ")
        )}</p>`,
        para(job.summary || "")
      )
      for (const h of job.highlights || []) {
        const plain = htmlToPlain(h)
        if (plain) sections.push(`<p style="margin:0 0 4pt 16pt;">• ${esc(plain)}</p>`)
      }
    }
  }
  if (resume.projects.some((p) => p.name)) {
    sections.push(heading("Projects"))
    for (const project of resume.projects) {
      if (!project.name) continue
      sections.push(`<p style="margin:0 0 2pt;font-weight:700;">${esc(project.name)}</p>`, para(project.description || ""))
    }
  }
  if (resume.skills.length) {
    sections.push(heading("Skills"), para(resume.skills.map((s) => s.name).join(", ")))
  }
  if (resume.languages?.some((row) => row.language)) {
    sections.push(
      heading("Languages"),
      para(
        resume.languages
          .filter((row) => row.language)
          .map((row) => [row.language, row.fluency].filter(Boolean).join(" — "))
          .join(" · ")
      )
    )
  }
  if (resume.certificates?.some((row) => row.name)) {
    sections.push(heading("Certificates"))
    for (const row of resume.certificates.filter((item) => item.name)) {
      sections.push(
        `<p style="margin:0 0 6pt;">${esc(row.name)}${
          row.issuer || row.date ? ` <span style="color:#495057;">· ${esc([row.issuer, row.date].filter(Boolean).join(" · "))}</span>` : ""
        }</p>`
      )
    }
  }
  if (resume.awards?.some((row) => row.title)) {
    sections.push(heading("Awards"))
    for (const row of resume.awards.filter((item) => item.title)) {
      sections.push(
        `<p style="margin:0 0 2pt;font-weight:700;">${esc(row.title)}${row.date ? ` · ${esc(row.date)}` : ""}</p>`,
        para(row.summary || "")
      )
    }
  }

  return `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(
    b.name || "Resume"
  )}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--></head><body style="font-family:Calibri,Arial,sans-serif;color:#000;">${sections.join(
    ""
  )}</body></html>`
}

export function downloadResumeWord(resume: JsonResume, title?: string) {
  const html = resumeToWordHtml(resume)
  const blob = new Blob(["\ufeff", html], { type: "application/msword" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${slugName(title || resume.basics.name || "resume")}-resume.doc`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCoverLetterWord(letter: CoverLetter, name?: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;">
    <h1 style="font-size:18pt;">${esc(name || "Cover letter")}</h1>
    <p style="color:#495057;">${esc([letter.role, letter.company].filter(Boolean).join(" · ") || letter.title || "")}</p>
    ${para(letter.body || "", "margin:16pt 0 0;font-size:12pt;line-height:1.6;")}
  </body></html>`
  const blob = new Blob(["\ufeff", html], { type: "application/msword" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${slugName(letter.title || "cover-letter")}.doc`
  a.click()
  URL.revokeObjectURL(url)
}
