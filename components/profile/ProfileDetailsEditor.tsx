"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, Info, Mail, Phone, Plus, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { UniversityPicker } from "@/components/profile/UniversityPicker"
import { JOB_CATEGORIES, MAX_SKILLS, SKILL_SUGGESTIONS } from "@/lib/profile/options"
import { contactIssues, saveStudentContact } from "@/lib/profile/contact"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type ProfileDetails = {
  bio: string
  phone: string
  personalEmail: string
  university: string
  degree: string
  graduationYear: string
  cgpa: string
  skills: string[]
  categories: string[]
  linkedin: string
  github: string
  portfolio: string
}

const labelClass = "font-data text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"

function isValidHttpUrl(value: string) {
  if (!value.trim()) return true
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Everything a student entered during onboarding (bio, CGPA, skills, links) can be
 * edited here later — the wizard stays the first-run flow only.
 */
export function ProfileDetailsEditor({ userId, initial }: { userId: string; initial: ProfileDetails }) {
  const router = useRouter()
  const { toast } = useToast()
  const [details, setDetails] = useState<ProfileDetails>(initial)
  const [skillInput, setSkillInput] = useState("")
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<ProfileDetails>) => setDetails((prev) => ({ ...prev, ...patch }))

  const addSkill = (value: string) => {
    const skill = value.trim()
    if (skill && !details.skills.includes(skill) && details.skills.length < MAX_SKILLS) {
      set({ skills: [...details.skills, skill] })
    }
    setSkillInput("")
  }

  const toggleCategory = (category: string) =>
    set({
      categories: details.categories.includes(category)
        ? details.categories.filter((item) => item !== category)
        : [...details.categories, category],
    })

  const save = async () => {
    // Contact details are required once the student starts filling them in.
    if (details.phone.trim() || details.personalEmail.trim()) {
      const contactError = contactIssues({ phone: details.phone, personalEmail: details.personalEmail })
      if (contactError) {
        toast({ variant: "destructive", title: "Check your contact details", description: contactError })
        return
      }
    }
    for (const [label, value] of [
      ["LinkedIn", details.linkedin],
      ["GitHub", details.github],
      ["Portfolio", details.portfolio],
    ] as const) {
      if (!isValidHttpUrl(value)) {
        toast({ variant: "destructive", title: `Check your ${label} link`, description: "Links must start with http:// or https://." })
        return
      }
    }
    const year = details.graduationYear.trim() ? Number(details.graduationYear) : null
    if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
      toast({ variant: "destructive", title: "Check the graduation year", description: "Use a four-digit year, e.g. 2027." })
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ bio: details.bio.trim() || null })
      .eq("id", userId)

    const payload: Record<string, unknown> = {
      university: details.university.trim() || null,
      degree: details.degree.trim() || null,
      graduation_year: year,
      cgpa: details.cgpa.trim() ? Number(details.cgpa) : null,
      skills: details.skills,
      preferred_job_categories: details.categories,
      linkedin_url: details.linkedin.trim() || null,
      github_url: details.github.trim() || null,
      portfolio_url: details.portfolio.trim() || null,
    }
    let { error } = await supabase.from("student_profiles").update(payload).eq("id", userId)
    if (error && /cgpa|graduation_year/i.test(error.message)) {
      delete payload.cgpa
      delete payload.graduation_year
      ;({ error } = await supabase.from("student_profiles").update(payload).eq("id", userId))
    }
    const contactError = await saveStudentContact(supabase, userId, {
      phone: details.phone,
      personalEmail: details.personalEmail,
    })
    setSaving(false)

    const failure = profileError?.message || error?.message || contactError
    if (failure) {
      toast({
        variant: "destructive",
        title: "Couldn’t save",
        description: failure,
      })
      return
    }
    toast({ title: "Details saved", description: "Your profile is up to date." })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm" id="about">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-semibold">About you</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Shown at the top of your profile and when you message recruiters.</p>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Short bio</Label>
            <Textarea
              rows={4}
              maxLength={300}
              className="rounded-xl"
              placeholder="Brief background and what you are looking for next."
              value={details.bio}
              onChange={(e) => set({ bio: e.target.value })}
            />
            <p className="text-right font-data text-[10px] text-muted-foreground">{details.bio.length}/300</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm" id="contact">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-semibold">Contact</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Shared with recruiters you match with. Use a personal email you&apos;ll keep after graduation.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelClass}>Phone number</Label>
              <div className="relative">
                <Input
                  className="rounded-xl pl-10"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+92 300 1234567"
                  value={details.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                />
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Personal email</Label>
              <div className="relative">
                <Input
                  className="rounded-xl pl-10"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@gmail.com"
                  value={details.personalEmail}
                  onChange={(e) => set({ personalEmail: e.target.value })}
                />
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm" id="education">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-semibold">Education & CGPA</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Employers filter on CGPA and graduation year. Add extra degrees under{" "}
              <Link href="/profile/education" className="text-primary hover:underline">
                Education
              </Link>
              .
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelClass}>University / Institution</Label>
              <UniversityPicker value={details.university} onChange={(university) => set({ university })} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Degree & field</Label>
              <Input
                className="rounded-xl"
                placeholder="e.g. B.Sc. Computer Science"
                value={details.degree}
                onChange={(e) => set({ degree: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Graduation year</Label>
              <Input
                className="rounded-xl"
                inputMode="numeric"
                placeholder="e.g. 2027"
                value={details.graduationYear}
                onChange={(e) => set({ graduationYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>CGPA (out of 4.00)</Label>
              <Input
                className="rounded-xl"
                inputMode="decimal"
                placeholder="e.g. 3.40"
                value={details.cgpa}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d.]/g, "")
                  if (value === "" || (Number(value) >= 0 && Number(value) <= 4)) set({ cgpa: value })
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm" id="skills">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-base font-semibold">Skills & interests</h2>
            <span className="font-data text-[10px] text-muted-foreground">
              {details.skills.length}/{MAX_SKILLS}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              className="rounded-xl"
              placeholder="Type a skill and press Enter"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addSkill(skillInput)
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl"
              onClick={() => addSkill(skillInput)}
              disabled={!skillInput.trim()}
              aria-label="Add skill"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_SUGGESTIONS.filter((skill) => !details.skills.includes(skill))
              .slice(0, 8)
              .map((skill) => (
                <Button
                  key={skill}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto rounded-full border-dashed px-2.5 py-1 text-xs font-normal text-muted-foreground"
                  onClick={() => addSkill(skill)}
                >
                  + {skill}
                </Button>
              ))}
          </div>
          {details.skills.length ? (
            <div className="flex flex-wrap gap-1.5">
              {details.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
                >
                  {skill}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:text-muted-foreground"
                    aria-label={`Remove ${skill}`}
                    onClick={() => set({ skills: details.skills.filter((item) => item !== skill) })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              ))}
            </div>
          ) : null}
          <div>
            <Label className={labelClass}>Preferred job categories</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {JOB_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={details.categories.includes(category) ? "secondary" : "outline"}
                  size="sm"
                  className="h-auto rounded-full px-2.5 py-1 text-xs font-normal"
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm" id="links">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-heading text-base font-semibold">Links</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Recruiters open these before they swipe. LinkedIn is optional but recommended.</p>
          </div>
          {[
            { label: "LinkedIn", key: "linkedin" as const, placeholder: "https://linkedin.com/in/your-name" },
            { label: "GitHub", key: "github" as const, placeholder: "https://github.com/your-username" },
            { label: "Portfolio / website", key: "portfolio" as const, placeholder: "https://yourportfolio.com" },
          ].map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className={labelClass}>{field.label}</Label>
              <div className="relative">
                <Input
                  className="rounded-xl pl-10"
                  placeholder={field.placeholder}
                  value={details[field.key]}
                  onChange={(e) => set({ [field.key]: e.target.value } as Partial<ProfileDetails>)}
                />
                <ExternalLink className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="font-body text-[11px] leading-relaxed text-muted-foreground">
              A CV lives under Resume, and experience under Experience — both editable any time.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
        <Button type="button" className="h-12 rounded-xl px-6 shadow-lg" onClick={() => void save()} loading={saving} loadingText="Saving…">
          Save details
        </Button>
      </div>
    </div>
  )
}
