"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { COMPANY_INDUSTRIES, EMPLOYEE_RANGES } from "@/lib/company-options"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/lib/hooks/use-toast"

export type CompanyProfile = {
  id: string
  name: string
  description: string | null
  website_url: string | null
  industry: string | null
  employee_count: string | null
  hiring_focus: string | null
}

export type CompanyMember = {
  user_id: string
  role: "owner" | "recruiter"
  full_name: string | null
  hiring_area?: string | null
}

export type CompanyInvite = {
  email: string
  full_name?: string | null
  hiring_area?: string | null
}

type DraftRecruiter = { name: string; email: string; area: string }

const emptyRecruiter = (): DraftRecruiter => ({ name: "", email: "", area: "" })

type Props = {
  role: "owner" | "recruiter" | null
  company: CompanyProfile | null
  defaults: CompanyProfile | null
  members: CompanyMember[]
  invites: CompanyInvite[]
  schemaReady: boolean
}

export function CompanyWorkspace({ role, company, defaults, members, invites, schemaReady }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const seed = company || defaults
  const [name, setName] = useState(seed?.name || "")
  const [description, setDescription] = useState(seed?.description || "")
  const [website, setWebsite] = useState(seed?.website_url || "")
  const [industry, setIndustry] = useState(seed?.industry || "")
  const [employeeCount, setEmployeeCount] = useState(seed?.employee_count || "")
  const [hiringFocus, setHiringFocus] = useState(seed?.hiring_focus || "")
  const [drafts, setDrafts] = useState<DraftRecruiter[]>([emptyRecruiter(), emptyRecruiter()])
  const [extra, setExtra] = useState<DraftRecruiter>(emptyRecruiter())
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const isOwner = role === "owner"
  const canEdit = !company || isOwner

  const updateDraft = (index: number, patch: Partial<DraftRecruiter>) => {
    setDrafts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const addRecruiters = async (rows: DraftRecruiter[]) => {
    const supabase = createClient()
    const ready = rows.filter((row) => row.email.includes("@"))
    for (const row of ready) {
      const { error } = await supabase.rpc("add_company_recruiter", {
        invite_email: row.email,
        invite_name: row.name,
        hiring_area: row.area,
      })
      if (error) return error.message
    }
    return null
  }

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    const args = {
      p_name: name,
      p_description: description,
      p_website: website,
      p_industry: industry,
      p_employee_count: employeeCount,
      p_hiring_focus: hiringFocus,
    }
    const { error } = company
      ? await supabase.rpc("save_company_profile", args)
      : await supabase.rpc("create_company", args)
    if (error) {
      setSaving(false)
      toast({ variant: "destructive", title: "Couldn’t save the company", description: error.message })
      return
    }
    if (!company) {
      const addError = await addRecruiters(drafts)
      setSaving(false)
      if (addError) {
        toast({ variant: "destructive", title: "Company saved, recruiter not added", description: addError })
        router.refresh()
        return
      }
    } else {
      setSaving(false)
    }
    toast({ title: company ? "Company profile saved" : "Company created" })
    router.refresh()
  }

  const addRecruiter = async () => {
    setAdding(true)
    const addError = await addRecruiters([extra])
    setAdding(false)
    if (addError) {
      toast({ variant: "destructive", title: "Couldn’t add recruiter", description: addError })
      return
    }
    setExtra(emptyRecruiter())
    toast({
      title: "Recruiter added",
      description: "They get their own portal for jobs and applications. If they have no account yet, it opens when they sign up with this email.",
    })
    router.refresh()
  }

  if (!schemaReady) {
    return (
      <div className="space-y-6">
        <DashboardPageHeader
          title="Company"
          description="Create the company profile and add recruiters. Each recruiter gets a separate portal for their own jobs and applications."
        />
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            The company workspace is not in the database yet. Run supabase/migrations/004_companies.sql and
            005_company_workspace.sql in the Supabase SQL editor, then reload this page.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title={company?.name || "Company"}
        description="Add the people who hire for you. One recruiter can run sales from their portal, and another can run engineering from theirs. Each person posts jobs and reviews their own applications."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/jobs">Jobs</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/matches">Pipeline</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/dashboard">Timeline</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">{company ? "Company profile" : "Create the company profile"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Company name</Label>
              <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-description">Description</Label>
              <Textarea id="company-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-website">Website</Label>
              <Input id="company-website" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={!canEdit} placeholder="https://" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="company-industry">Industry</Label>
                <select
                  id="company-industry"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">Select</option>
                  {industry && !(COMPANY_INDUSTRIES as readonly string[]).includes(industry) ? (
                    <option value={industry}>{industry}</option>
                  ) : null}
                  {COMPANY_INDUSTRIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company-size">Company size</Label>
                <select
                  id="company-size"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">Select</option>
                  {employeeCount && !(EMPLOYEE_RANGES as readonly string[]).includes(employeeCount) ? (
                    <option value={employeeCount}>{employeeCount}</option>
                  ) : null}
                  {EMPLOYEE_RANGES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-focus">Hiring focus</Label>
              <Textarea id="company-focus" rows={3} value={hiringFocus} onChange={(e) => setHiringFocus(e.target.value)} disabled={!canEdit} />
            </div>
            {!company && canEdit ? (
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium">Recruiters</p>
                  <p className="text-xs text-muted-foreground">Add more than one. Each person signs in to their own jobs, applications, and pipeline.</p>
                </div>
                {drafts.map((row, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Name, e.g. Jose" value={row.name} onChange={(e) => updateDraft(index, { name: e.target.value })} />
                    <Input type="email" placeholder="jose@company.com" value={row.email} onChange={(e) => updateDraft(index, { email: e.target.value })} />
                    <Input placeholder="Hires for, e.g. Sales" value={row.area} onChange={(e) => updateDraft(index, { area: e.target.value })} />
                  </div>
                ))}
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setDrafts((rows) => [...rows, emptyRecruiter()])}>
                  Add another recruiter
                </Button>
              </div>
            ) : null}
            {canEdit ? (
              <Button type="button" className="rounded-full" onClick={() => void save()} disabled={saving || name.trim().length < 2}>
                {saving ? "Saving…" : company ? "Save profile" : "Create company"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">The company owner edits this profile. Your jobs and applications stay in your own portal.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Recruiters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Save the company profile to add recruiters. Each one keeps a separate portal.</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li key={member.user_id} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {member.full_name || "Recruiter"}
                        {member.hiring_area ? <span className="text-muted-foreground"> · {member.hiring_area}</span> : null}
                      </span>
                      <Badge variant="outline">{member.role === "owner" ? "Owner" : "Own portal"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {isOwner && company ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <Label htmlFor="recruiter-name">Add another recruiter</Label>
                  <Input id="recruiter-name" placeholder="Name, e.g. Joshua" value={extra.name} onChange={(e) => setExtra({ ...extra, name: e.target.value })} />
                  <Input type="email" placeholder="joshua@company.com" value={extra.email} onChange={(e) => setExtra({ ...extra, email: e.target.value })} />
                  <Input placeholder="Hires for, e.g. Engineering" value={extra.area} onChange={(e) => setExtra({ ...extra, area: e.target.value })} />
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => void addRecruiter()} disabled={adding || !extra.email.includes("@")}>
                    {adding ? "Adding…" : "Add recruiter"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    They sign in to their own jobs and applications. A new email joins this company when that person signs up.
                  </p>
                </div>
              ) : null}
              {isOwner && invites.length > 0 ? (
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-sm font-medium">Waiting to sign up</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {invites.map((invite) => (
                      <li key={invite.email}>
                        {[invite.full_name, invite.email, invite.hiring_area].filter(Boolean).join(" · ")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
