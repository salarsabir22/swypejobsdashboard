import type { JsonResume } from "@/lib/resume/schema"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="border-b border-[#e4e0f5] pb-1 text-[11px] font-semibold tracking-[0.08em] text-primary">
        {title}
      </h3>
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
    <article className="resume-sheet mx-auto min-h-[520px] w-full max-w-[210mm] bg-white px-8 py-9 text-[#14102e] shadow-[0_18px_48px_-20px_rgba(90,72,255,0.35)] ring-1 ring-black/[0.06] sm:px-10">
      <header className="space-y-1">
        <h2 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.04em]">{b.name || "Your name"}</h2>
        {b.label ? <p className="text-[13px] text-[#55506b]">{b.label}</p> : null}
        {meta.length ? <p className="text-[11px] leading-relaxed text-[#55506b]">{meta.join(" · ")}</p> : null}
        {profiles.length ? (
          <p className="text-[11px] leading-relaxed text-primary">
            {profiles.map((p) => p.url.replace(/^https?:\/\//, "")).join(" · ")}
          </p>
        ) : null}
      </header>

      {b.summary?.trim() ? (
        <div className="mt-5">
          <Section title="Summary">
            <p className="text-[12.5px] leading-relaxed">{b.summary}</p>
          </Section>
        </div>
      ) : null}

      {resume.education.some((e) => e.institution || e.studyType) ? (
        <div className="mt-5">
          <Section title="Education">
            <ul className="space-y-2">
              {resume.education.map((edu) => (
                <li key={edu.id}>
                  <p className="text-[13px] font-semibold">
                    {edu.institution || "Institution"}
                    {edu.endDate ? <span className="ml-2 font-normal text-[#55506b]">{edu.endDate}</span> : null}
                  </p>
                  <p className="text-[12px] text-[#55506b]">{[edu.studyType, edu.area, edu.score].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : null}

      {resume.work.some((job) => job.name || job.position) ? (
        <div className="mt-5">
          <Section title="Experience">
            <ul className="space-y-3">
              {resume.work.map((job) => (
                <li key={job.id}>
                  <p className="text-[13px] font-semibold">{[job.position, job.name].filter(Boolean).join(" · ")}</p>
                  <p className="text-[11px] text-[#55506b]">{[job.startDate, job.endDate || (job.startDate ? "Present" : "")].filter(Boolean).join(" – ")}</p>
                  {job.summary ? <p className="mt-1 text-[12.5px] leading-relaxed">{job.summary}</p> : null}
                  {job.highlights?.filter(Boolean).length ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12.5px] leading-relaxed">
                      {job.highlights.filter(Boolean).map((h) => (
                        <li key={h}>{h}</li>
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
        <div className="mt-5">
          <Section title="Projects">
            <ul className="space-y-3">
              {resume.projects.map((project) => (
                <li key={project.id}>
                  <p className="text-[13px] font-semibold">{project.name}</p>
                  {project.url ? <p className="text-[11px] text-primary">{project.url}</p> : null}
                  {project.description ? <p className="mt-1 text-[12.5px] leading-relaxed">{project.description}</p> : null}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : null}

      {resume.skills.length ? (
        <div className="mt-5">
          <Section title="Skills">
            <p className="text-[12.5px] leading-relaxed">{resume.skills.map((s) => s.name).join(" · ")}</p>
          </Section>
        </div>
      ) : null}
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
    <article className="resume-sheet mx-auto min-h-[520px] w-full max-w-[210mm] bg-white px-8 py-9 text-[#14102e] shadow-[0_18px_48px_-20px_rgba(90,72,255,0.35)] ring-1 ring-black/[0.06] sm:px-10">
      <header className="mb-8 space-y-1">
        <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em]">{name || "Your name"}</h2>
        <p className="text-[12px] text-[#55506b]">{[role, company].filter(Boolean).join(" · ") || "Cover letter"}</p>
      </header>
      <div className="space-y-4 whitespace-pre-wrap text-[13px] leading-7">
        {body.trim() || "Write a letter on the left. A first draft can be generated from your profile and the role."}
      </div>
    </article>
  )
}
