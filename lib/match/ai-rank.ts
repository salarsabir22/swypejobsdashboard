import { briefForModel, type ApplicantBrief, type ApplicantPick, type JobBrief } from "@/lib/match/applicant-picks"

type AiConfig = { key: string; base: string; model: string }

export function aiRankConfig(): AiConfig | null {
  const requested = process.env.AI_MODEL?.trim()
  const groq = process.env.GROQ_API_KEY?.trim()
  if (groq) {
    return {
      key: groq,
      base: "https://api.groq.com/openai/v1",
      model: requested && !requested.startsWith("grok-") ? requested : "openai/gpt-oss-120b",
    }
  }
  const xai = process.env.XAI_API_KEY?.trim()
  if (xai) {
    return {
      key: xai,
      base: "https://api.x.ai/v1",
      model: requested?.startsWith("grok") ? requested : "grok-4.7",
    }
  }
  const override = process.env.AI_API_KEY?.trim()
  if (override) {
    return {
      key: override,
      base: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: requested || "gpt-4o-mini",
    }
  }
  const openai = process.env.OPENAI_API_KEY?.trim()
  if (openai) {
    return { key: openai, base: "https://api.openai.com/v1", model: requested || "gpt-4o-mini" }
  }
  return null
}

function parsePicks(raw: string, allowed: Set<string>): ApplicantPick[] | null {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
  const rows =
    parsed && typeof parsed === "object" && Array.isArray((parsed as { picks?: unknown }).picks)
      ? (parsed as { picks: unknown[] }).picks
      : []
  const out: ApplicantPick[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const item = row as Record<string, unknown>
    const id = typeof item.id === "string" ? item.id : typeof item.studentId === "string" ? item.studentId : ""
    if (!allowed.has(id) || seen.has(id)) continue
    const score = Math.round(Number(item.score))
    const reason = typeof item.reason === "string" ? item.reason.replace(/\s+/g, " ").trim().slice(0, 180) : ""
    if (!Number.isFinite(score) || !reason) continue
    seen.add(id)
    out.push({ studentId: id, score: Math.max(0, Math.min(100, score)), reason })
    if (out.length >= 10) break
  }
  return out.length ? out : null
}

async function complete(config: AiConfig, messages: { role: string; content: string }[], jsonMode: boolean): Promise<string | null> {
  const res = await fetch(`${config.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      max_tokens: 2500,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) {
    if (jsonMode && (res.status === 400 || res.status === 422)) return complete(config, messages, false)
    return null
  }
  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
  const text = data.choices?.[0]?.message?.content
  return typeof text === "string" ? text : null
}

export async function rankApplicantsWithAi(job: JobBrief, applicants: ApplicantBrief[]): Promise<ApplicantPick[] | null> {
  const config = aiRankConfig()
  if (!config || applicants.length === 0) return null
  const messages = [
    {
      role: "system",
      content:
        'You rank applicants for one job. Reply with JSON only: {"picks":[{"id":"uuid","score":0,"reason":"one sentence"}]}. Return at most 10 picks, best first. Use only ids from the applicants list. Score 0-100 for fit to this job from skills, experience, and answers. Do not use name, school prestige, age, or other traits unrelated to the work.',
    },
    {
      role: "user",
      content: JSON.stringify({
        job: {
          title: job.title,
          category: job.category,
          requiredSkills: job.requiredSkills,
          niceToHaveSkills: job.niceSkills,
          description: job.description.slice(0, 1500),
        },
        applicants: applicants.map(briefForModel),
      }),
    },
  ]
  try {
    const raw = await complete(config, messages, true)
    if (!raw) return null
    return parsePicks(raw, new Set(applicants.map((person) => person.id)))
  } catch (error) {
    console.error("[picks] ai rank failed", error instanceof Error ? error.message : "unknown")
    return null
  }
}
