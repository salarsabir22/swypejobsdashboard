import { htmlToPlain, isHtml, richHtmlClassName, sanitizeHtml, toEditorHtml } from "@/lib/resume/html"
import type { JsonResume } from "@/lib/resume/schema"

function RichHtml({ html, className }: { html?: string; className?: string }) {
  const value = html || ""
  const plain = htmlToPlain(value)
  if (!plain) return null
  const markup = isHtml(value) ? sanitizeHtml(value) : toEditorHtml(value)
  return <div className={`${richHtmlClassName} ${className || ""}`} dangerouslySetInnerHTML={{ __html: markup }} />
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="border-b border-[#e4e0f5] pb-1 text-[13px] font-semibold tracking-[-0.02em] text-primary">{title}</h3>
      {children}
    </section>
  )
}

export function ResumePreview({ resume }: { resume: JsonResume }) {
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
          <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.045em]">{b.name || "Your name"}</h2>
          {b.label ? <p className="text-[14px] text-[#55506b]">{b.label}</p> : null}
          {meta.length ? <p className="text-[12px] leading-relaxed text-[#55506b]">{meta.join(" · ")}</p> : null}
          {profiles.length ? (
            <p className="text-[12px] leading-relaxed text-primary">
              {profiles.map((p) => p.url.replace(/^https?:\/\//, "")).join(" · ")}
            </p>
          ) : null}
        </header>

        {htmlToPlain(b.summary || "") ? (
          <div className="mt-6">
            <Section title="Summary">
              <RichHtml html={b.summary} className="text-[13px] leading-relaxed" />
            </Section>
          </div>
        ) : null}

        {resume.education.some((e) => e.institution || e.studyType) ? (
          <div className="mt-6">
            <Section title="Education">
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
            </Section>
          </div>
        ) : null}

        {resume.work.some((job) => job.name || job.position) ? (
          <div className="mt-6">
            <Section title="Experience">
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
            </Section>
          </div>
        ) : null}

        {resume.projects.some((p) => p.name) ? (
          <div className="mt-6">
            <Section title="Projects">
              <ul className="space-y-3">
                {resume.projects.map((project) => (
                  <li key={project.id}>
                    <p className="text-[13px] font-semibold">{project.name}</p>
                    {project.url ? <p className="text-[12px] text-primary">{project.url.replace(/^https?:\/\//, "")}</p> : null}
                    <RichHtml html={project.description} className="mt-1 text-[13px] leading-relaxed" />
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        ) : null}

        {resume.skills.length ? (
          <div className="mt-6">
            <Section title="Skills">
              <p className="text-[13px] leading-relaxed">{resume.skills.map((s) => s.name).join(" · ")}</p>
            </Section>
          </div>
        ) : null}

        {resume.languages?.some((row) => row.language) ? (
          <div className="mt-6">
            <Section title="Languages">
              <p className="text-[13px] leading-relaxed">
                {resume.languages
                  .filter((row) => row.language)
                  .map((row) => [row.language, row.fluency].filter(Boolean).join(" — "))
                  .join(" · ")}
              </p>
            </Section>
          </div>
        ) : null}

        {resume.certificates?.some((row) => row.name) ? (
          <div className="mt-6">
            <Section title="Certificates">
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
            </Section>
          </div>
        ) : null}

        {resume.awards?.some((row) => row.title) ? (
          <div className="mt-6">
            <Section title="Awards">
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
