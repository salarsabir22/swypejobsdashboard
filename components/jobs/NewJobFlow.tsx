"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { JobEditor } from "@/components/jobs/JobEditor"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ATS = [
  { id: "greenhouse", label: "Greenhouse" },
  { id: "workday", label: "Workday" },
  { id: "flowhcm", label: "FlowHCM" },
  { id: "other", label: "Other" },
] as const

export function NewJobFlow() {
  const [path, setPath] = useState<"choose" | "manual" | "ats">("choose")
  const [provider, setProvider] = useState<(typeof ATS)[number]["id"]>("greenhouse")

  if (path === "manual") return <JobEditor />

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" asChild>
          <Link href="/jobs" aria-label="Back">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.25rem]">Post a job</h1>
          <p className="text-sm text-muted-foreground">Free for the base posting workflow. Reachable from Overview in under three clicks.</p>
        </div>
      </div>

      {path === "choose" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={() => setPath("manual")} className="rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-primary">
            <p className="font-heading text-lg font-semibold">Enter manually</p>
            <p className="mt-2 text-sm text-muted-foreground">Guided form with company defaults. Save a draft, then publish or send to partner campuses.</p>
          </button>
          <button type="button" onClick={() => setPath("ats")} className="rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-primary">
            <p className="font-heading text-lg font-semibold">Fetch from ATS</p>
            <p className="mt-2 text-sm text-muted-foreground">Greenhouse, Workday, FlowHCM, or another approved connector. Review mapped fields before going live.</p>
          </button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Import from your ATS</CardTitle>
            <CardDescription>
              We only pull fields through an authorized connector. Arbitrary page scraping is blocked.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ATS.map((item) => (
                <Button key={item.id} type="button" size="sm" variant={provider === item.id ? "default" : "outline"} className="rounded-full" onClick={() => setProvider(item.id)}>
                  {item.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {provider === "other"
                ? "This provider isn’t connected yet. Enter the role manually, or attach a job file your career office has approved."
                : `${ATS.find((a) => a.id === provider)?.label} import isn’t live on this workspace yet. Use manual entry and we’ll map fields when the connector is enabled.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full" onClick={() => setPath("manual")}>
                Continue with manual entry
              </Button>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setPath("choose")}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
