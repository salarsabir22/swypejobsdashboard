import { Pencil } from "lucide-react"
import { htmlToPlain, isHtml, richHtmlClassName, sanitizeHtml, toEditorHtml } from "@/lib/resume/html"
import type { JsonResume } from "@/lib/resume/schema"

function RichHtml({ html, className }: { html?: string; className?: string }) {
  const value = html || ""
  const plain = htmlToPlain(value)
  if (!plain) return null
  const markup = isHtml(value) ? sanitizeHtml(value) : toEditorHtml(value)
  return <div className={`${richHtmlClassName} ${className || ""}`} dangerouslySetInnerHTML={{ __html: markup }} />
}

function Section({
  title,
  sectionId,
  onEditSection,
  children,
}: {
  title: string
  sectionId?: string
  onEditSection?: (sectionId: string) => void
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 border-b border-[#e4e0f5] pb-1">
        <h3 className="text-[13px] font-semibold tracking-[-0.02em] text-primary">{title}</h3>
        {sectionId && onEditSection ? (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10"
            aria-label={`Edit ${title}`}
            onClick={() => onEditSection(sectionId)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function ResumePreview({
  resume,
  onEditSection,
}: {
  resume: JsonResume
  onEditSection?: (sectionId: string) => void
}) {
  const b = resume.basics
  const meta = [
    b.email,
    b.phone,
    [b.location?.city, b.location?.region].filter(Boolean).join(", "),
    b.url,
  ].filter(Boolean)
  const profiles = (b.profiles || []).filter((p) => p.url)

  return (
    <article className="resume-sheet mx-auto min-h-[640px] w-full max-w-[210mm] overflow-hidden rounded-2xl bg-white text-[#14102e] shadow-[0_18px_48px_-20px_rgba(90,72,255,0.35)] ring-1 ring-black/[0.06]">
      <div className="h-1.5 bg-primary" />
      <div className="px-8 py-8 sm:px-10">
        <header className="space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.045em]">{b.name || "Your name"}</h2>
            {onEditSection ? (
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary/10"
                aria-label="Edit basics"
                onClick={() => onEditSection("basics")}
              >
                <Pencil className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {b.label ? <p className="text-[14px] text-[#55506b]">{b.label}</p> : null}
          {meta.length ? <p className="text-[12px] leading-relaxed text-[#55506b]">{meta.join(" · ")}</p> : null}
          {profiles.length ? (
            <p className="text-[12px] leading-relaxed text-primary">
              {profiles.map((p) => p.url.replace(/^https?:\/\//, "")).join(" · ")}
            </p>
          ) : null}
        </header>

        {htmlToPlain(b.summary || "") || onEditSection ? (
          <div className="mt-6">
            <Section title="Summary" sectionId="summary" onEditSection={onEditSection}>
              {htmlToPlain(b.summary || "") ? (
                <RichHtml html={b.summary} className="text-[13px] leading-relaxed" />
              ) : (
                <p className="text-[13px] text-[#55506b]">Add a short summary with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}

        {resume.education.some((e) => e.institution || e.studyType) || onEditSection ? (
          <div className="mt-6">
            <Section title="Education" sectionId="education" onEditSection={onEditSection}>
              {resume.education.some((e) => e.institution || e.studyType) ? (
                <ul className="space-y-2.5">
                  {resume.education.map((edu) => (
                    <li key={edu.id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[13px] font-semibold">{edu.institution || "Institution"}</p>
                        <p className="text-[12px] text-[#55506b]">{[edu.studyType, edu.area, edu.score].filter(Boolean).join(" · ")}</p>
                      </div>
                      {edu.endDate ? <p className="shrink-0 text-[12px] text-[#55506b]">{edu.endDate}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#55506b]">Add education with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}

        {resume.work.some((job) => job.name || job.position) || onEditSection ? (
          <div className="mt-6">
            <Section title="Experience" sectionId="experience" onEditSection={onEditSection}>
              {resume.work.some((job) => job.name || job.position) ? (
                <ul className="space-y-4">
                  {resume.work.map((job) => (
                    <li key={job.id}>
                      <div className="flex items-start justify-between gap-4">
                        <p className="text-[13px] font-semibold">{[job.position, job.name].filter(Boolean).join(" · ")}</p>
                        <p className="shrink-0 text-[12px] text-[#55506b]">
                          {[job.startDate, job.endDate || (job.startDate ? "Present" : "")].filter(Boolean).join(" – ")}
                        </p>
                      </div>
                      <RichHtml html={job.summary} className="mt-1 text-[13px] leading-relaxed" />
                      {job.highlights?.some((h) => htmlToPlain(h)) ? (
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[13px] leading-relaxed">
                          {job.highlights.filter((h) => htmlToPlain(h)).map((h) => (
                            <li key={h}>
                              <RichHtml html={h} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#55506b]">Add experience with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}

        {resume.projects.some((p) => p.name) || onEditSection ? (
          <div className="mt-6">
            <Section title="Projects" sectionId="projects" onEditSection={onEditSection}>
              {resume.projects.some((p) => p.name) ? (
                <ul className="space-y-3">
                  {resume.projects.map((project) => (
                    <li key={project.id}>
                      <p className="text-[13px] font-semibold">{project.name}</p>
                      {project.url ? <p className="text-[12px] text-primary">{project.url.replace(/^https?:\/\//, "")}</p> : null}
                      <RichHtml html={project.description} className="mt-1 text-[13px] leading-relaxed" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#55506b]">Add a project with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}

        {resume.skills.length || onEditSection ? (
          <div className="mt-6">
            <Section title="Skills" sectionId="skills" onEditSection={onEditSection}>
              {resume.skills.length ? (
                <p className="text-[13px] leading-relaxed">{resume.skills.map((s) => s.name).join(" · ")}</p>
              ) : (
                <p className="text-[13px] text-[#55506b]">Add skills with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}

        {resume.languages?.some((row) => row.language) || onEditSection ? (
          <div className="mt-6">
            <Section title="Languages" sectionId="languages" onEditSection={onEditSection}>
              {resume.languages?.some((row) => row.language) ? (
                <p className="text-[13px] leading-relaxed">
                  {resume.languages
                    .filter((row) => row.language)
                    .map((row) => [row.language, row.fluency].filter(Boolean).join(" — "))
                    .join(" · ")}
                </p>
              ) : (
                <p className="text-[13px] text-[#55506b]">Add languages with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}

        {resume.certificates?.some((row) => row.name) || onEditSection ? (
          <div className="mt-6">
            <Section title="Certificates" sectionId="certificates" onEditSection={onEditSection}>
              {resume.certificates?.some((row) => row.name) ? (
                <ul className="space-y-1.5">
                  {resume.certificates
                    .filter((row) => row.name)
                    .map((row) => (
                      <li key={row.id} className="text-[13px]">
                        <span className="font-semibold">{row.name}</span>
                        {row.issuer || row.date ? (
                          <span className="text-[#55506b]"> · {[row.issuer, row.date].filter(Boolean).join(" · ")}</span>
                        ) : null}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#55506b]">Add certificates with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}

        {resume.awards?.some((row) => row.title) || onEditSection ? (
          <div className="mt-6">
            <Section title="Awards" sectionId="awards" onEditSection={onEditSection}>
              {resume.awards?.some((row) => row.title) ? (
                <ul className="space-y-2">
                  {resume.awards
                    .filter((row) => row.title)
                    .map((row) => (
                      <li key={row.id}>
                        <p className="text-[13px] font-semibold">
                          {row.title}
                          {row.date ? <span className="ml-2 font-normal text-[#55506b]">{row.date}</span> : null}
                        </p>
                        <RichHtml html={row.summary} className="text-[13px] leading-relaxed" />
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#55506b]">Add awards with the pen.</p>
              )}
            </Section>
          </div>
        ) : null}
      </div>
    </article>
  )
}

export function CoverLetterPreview({
  body,
  name,
  role,
  company,
}: {
  body: string
  name?: string
  role?: string
  company?: string
}) {
  return (
    <article className="resume-sheet mx-auto min-h-[640px] w-full max-w-[210mm] overflow-hidden rounded-2xl bg-white text-[#14102e] shadow-[0_18px_48px_-20px_rgba(90,72,255,0.35)] ring-1 ring-black/[0.06]">
      <div className="h-1.5 bg-primary" />
      <div className="px-8 py-8 sm:px-10">
        <header className="mb-8 space-y-1">
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.04em]">{name || "Your name"}</h2>
          <p className="text-[13px] text-[#55506b]">{[role, company].filter(Boolean).join(" · ") || "Cover letter"}</p>
        </header>
        {htmlToPlain(body) ? (
          <RichHtml html={body} className="text-[13.5px] leading-7" />
        ) : (
          <p className="text-[13.5px] leading-7 text-[#55506b]">
            Write a letter on the left. A first draft can be generated from your profile and the role.
          </p>
        )}
      </div>
    </article>
  )
}
