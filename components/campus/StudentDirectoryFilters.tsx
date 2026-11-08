"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter, Search, X } from "lucide-react"
import {
  directoryClassYearOptions,
  directoryCollegeOptions,
} from "@/lib/campus/directory"
import { iobmCollegeById, iobmCollegeByName } from "@/lib/sso/iobm-programs"
import { CampusFilterPendingBadge, useCampusFilterNav } from "@/components/campus/CampusFilterPending"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const KEEP_KEYS = ["campus", "kind", "range", "from", "to"] as const

function collegeIdFromParam(value: string | null) {
  if (!value) return ""
  return iobmCollegeById(value)?.id || iobmCollegeByName(value)?.id || ""
}

export function StudentDirectoryFilters({ kind }: { kind: "students" | "alumni" }) {
  const { pending, pathname, params, navigate } = useCampusFilterNav()
  const colleges = useMemo(() => directoryCollegeOptions(), [])
  const classYears = useMemo(() => directoryClassYearOptions(), [])

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(params.get("q") || "")
  const [collegeId, setCollegeId] = useState(collegeIdFromParam(params.get("college")))
  const [program, setProgram] = useState(params.get("program") || "")
  const [classYear, setClassYear] = useState(params.get("class") || "")
  const [completion, setCompletion] = useState(params.get("completion") || "")
  const [completionOp, setCompletionOp] = useState(params.get("completion_op") || "lt")
  const [completionN, setCompletionN] = useState(params.get("completion_n") || "60")
  const [inactive, setInactive] = useState(params.get("inactive") || "")
  const [inactiveN, setInactiveN] = useState(params.get("inactive_n") || "30")
  const [employed, setEmployed] = useState(params.get("employed") || "")
  const [suspended, setSuspended] = useState(params.get("suspended") || "")

  useEffect(() => {
    setQ(params.get("q") || "")
    setCollegeId(collegeIdFromParam(params.get("college")))
    setProgram(params.get("program") || "")
    setClassYear(params.get("class") || "")
    setCompletion(params.get("completion") || "")
    setCompletionOp(params.get("completion_op") || "lt")
    setCompletionN(params.get("completion_n") || "60")
    setInactive(params.get("inactive") || "")
    setInactiveN(params.get("inactive_n") || "30")
    setEmployed(params.get("employed") || "")
    setSuspended(params.get("suspended") || "")
  }, [params])

  const programs = useMemo(() => {
    if (collegeId) {
      const college = colleges.find((c) => c.id === collegeId)
      return college?.programs ? [...college.programs] : []
    }
    return colleges.flatMap((c) => [...c.programs])
  }, [collegeId, colleges])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (params.get("college")) n++
    if (params.get("program")) n++
    if (params.get("class")) n++
    if (params.get("completion")) n++
    if (params.get("inactive")) n++
    if (params.get("employed")) n++
    if (params.get("suspended")) n++
    return n
  }, [params])

  function buildQuery(overrides?: Record<string, string | null>) {
    const next = new URLSearchParams()
    for (const key of KEEP_KEYS) {
      const value = params.get(key)
      if (value) next.set(key, value)
    }
    next.set("kind", kind)

    const values: Record<string, string> = {
      q: q.trim(),
      college: collegeId ? colleges.find((c) => c.id === collegeId)?.name || collegeId : "",
      program: program.trim(),
      class: classYear,
      completion,
      completion_op: completion === "custom" ? completionOp : "",
      completion_n: completion === "custom" ? completionN : "",
      inactive,
      inactive_n: inactive === "custom" ? inactiveN : "",
      employed,
      suspended,
    }

    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        if (value == null) delete values[key]
        else values[key] = value
      }
    }

    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
    }

    return next
  }

  function apply(overrides?: Record<string, string | null>) {
    const next = buildQuery(overrides)
    setOpen(false)
    navigate(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  function clearFilters() {
    setQ("")
    setCollegeId("")
    setProgram("")
    setClassYear("")
    setCompletion("")
    setCompletionOp("lt")
    setCompletionN("60")
    setInactive("")
    setInactiveN("30")
    setEmployed("")
    setSuspended("")
    const next = new URLSearchParams()
    for (const key of KEEP_KEYS) {
      const value = params.get(key)
      if (value) next.set(key, value)
    }
    next.set("kind", kind)
    navigate(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  const filterFields = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label htmlFor="dir-college">College</Label>
        <Select
          value={collegeId || "__any"}
          onValueChange={(value) => {
            setCollegeId(value === "__any" ? "" : value)
            setProgram("")
          }}
        >
          <SelectTrigger id="dir-college" className="rounded-full">
            <SelectValue placeholder="All colleges" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">All colleges</SelectItem>
            {colleges.map((college) => (
              <SelectItem key={college.id} value={college.id}>
                {college.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dir-program">Program</Label>
        <Select value={program || "__any"} onValueChange={(value) => setProgram(value === "__any" ? "" : value)}>
          <SelectTrigger id="dir-program" className="rounded-full">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">All programs</SelectItem>
            {programs.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dir-class">Class</Label>
        <Select value={classYear || "__any"} onValueChange={(value) => setClassYear(value === "__any" ? "" : value)}>
          <SelectTrigger id="dir-class" className="rounded-full">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">All classes</SelectItem>
            {classYears.map((year) => (
              <SelectItem key={year} value={year}>
                Class of {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
        <Label htmlFor="dir-completion">Profile completion</Label>
        <Select value={completion || "__any"} onValueChange={(value) => setCompletion(value === "__any" ? "" : value)}>
          <SelectTrigger id="dir-completion" className="rounded-full">
            <SelectValue placeholder="Any score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">Any score</SelectItem>
            <SelectItem value="below60">Below 60%</SelectItem>
            <SelectItem value="above60">60% and above</SelectItem>
            <SelectItem value="custom">Custom threshold…</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {completion === "custom" ? (
        <div className="grid grid-cols-[7rem_1fr] gap-2 sm:col-span-2 lg:col-span-2">
          <div className="space-y-1.5">
            <Label>Compare</Label>
            <Select value={completionOp} onValueChange={setCompletionOp}>
              <SelectTrigger className="rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lt">Below</SelectItem>
                <SelectItem value="gte">At or above</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dir-completion-n">Percent</Label>
            <Input
              id="dir-completion-n"
              type="number"
              min={0}
              max={100}
              value={completionN}
              onChange={(e) => setCompletionN(e.target.value)}
              className="rounded-full"
              placeholder="e.g. 45"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="dir-inactive">Inactive</Label>
        <Select value={inactive || "__any"} onValueChange={(value) => setInactive(value === "__any" ? "" : value)}>
          <SelectTrigger id="dir-inactive" className="rounded-full">
            <SelectValue placeholder="Any activity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">Any activity</SelectItem>
            <SelectItem value="15">Inactive 15+ days</SelectItem>
            <SelectItem value="30">Inactive 30+ days</SelectItem>
            <SelectItem value="45">Inactive 45+ days</SelectItem>
            <SelectItem value="custom">Custom days…</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {inactive === "custom" ? (
        <div className="space-y-1.5">
          <Label htmlFor="dir-inactive-n">Days inactive</Label>
          <Input
            id="dir-inactive-n"
            type="number"
            min={1}
            max={3650}
            value={inactiveN}
            onChange={(e) => setInactiveN(e.target.value)}
            className="rounded-full"
            placeholder="e.g. 21"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="dir-employed">Employment</Label>
        <Select value={employed || "__any"} onValueChange={(value) => setEmployed(value === "__any" ? "" : value)}>
          <SelectTrigger id="dir-employed" className="rounded-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">Any</SelectItem>
            <SelectItem value="yes">Currently employed</SelectItem>
            <SelectItem value="no">Not employed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dir-suspended">Campus partnership</Label>
        <Select value={suspended || "__any"} onValueChange={(value) => setSuspended(value === "__any" ? "" : value)}>
          <SelectTrigger id="dir-suspended" className="rounded-full">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">Any</SelectItem>
            <SelectItem value="yes">Disconnected</SelectItem>
            <SelectItem value="no">Connected</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="space-y-3" aria-busy={pending || undefined}>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or student ID…"
            className="h-9 rounded-full pl-9"
            aria-label="Search by student name or student ID"
          />
        </div>
        <Button type="submit" size="sm" className="rounded-full" loading={pending} loadingText="Updating…">
          Search
        </Button>
        <CampusFilterPendingBadge pending={pending} />

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="rounded-full">
              <Filter className="size-3.5" strokeWidth={1.75} />
              Filters
              {activeFilterCount ? (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Directory filters</SheetTitle>
              <SheetDescription>
                Narrow the {kind === "alumni" ? "alumni" : "student"} list by completion, inactivity, program, and more.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4 px-1 pb-4">{filterFields}</div>
            <SheetFooter className="gap-2 sm:flex-row">
              <Button type="button" variant="ghost" className="rounded-full" onClick={clearFilters}>
                Clear all
              </Button>
              <Button type="button" className="rounded-full" loading={pending} loadingText="Updating…" onClick={() => apply()}>
                Apply filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {activeFilterCount || params.get("q") ? (
          <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={clearFilters}>
            <X className="size-3.5" strokeWidth={1.75} />
            Clear
          </Button>
        ) : null}
      </form>

      {/* Desktop inline filter strip for common presets */}
      <div className="hidden flex-wrap items-center gap-1.5 md:flex" role="group" aria-label="Quick filters">
        <Button
          type="button"
          size="sm"
          variant={params.get("completion") === "below60" ? "default" : "outline"}
          className="h-8 rounded-full"
          onClick={() =>
            apply({
              completion: params.get("completion") === "below60" ? "" : "below60",
              completion_op: null,
              completion_n: null,
            })
          }
        >
          Below 60%
        </Button>
        <Button
          type="button"
          size="sm"
          variant={params.get("completion") === "above60" ? "default" : "outline"}
          className="h-8 rounded-full"
          onClick={() =>
            apply({
              completion: params.get("completion") === "above60" ? "" : "above60",
              completion_op: null,
              completion_n: null,
            })
          }
        >
          60%+
        </Button>
        {(["15", "30", "45"] as const).map((days) => (
          <Button
            key={days}
            type="button"
            size="sm"
            variant={params.get("inactive") === days ? "default" : "outline"}
            className="h-8 rounded-full"
            onClick={() =>
              apply({
                inactive: params.get("inactive") === days ? "" : days,
                inactive_n: null,
              })
            }
          >
            Inactive {days}d
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={params.get("employed") === "yes" ? "default" : "outline"}
          className="h-8 rounded-full"
          onClick={() => apply({ employed: params.get("employed") === "yes" ? "" : "yes" })}
        >
          Employed
        </Button>
        <Button
          type="button"
          size="sm"
          variant={params.get("employed") === "no" ? "default" : "outline"}
          className="h-8 rounded-full"
          onClick={() => apply({ employed: params.get("employed") === "no" ? "" : "no" })}
        >
          Not employed
        </Button>
        <Button
          type="button"
          size="sm"
          variant={params.get("suspended") === "yes" ? "default" : "outline"}
          className="h-8 rounded-full"
          onClick={() => apply({ suspended: params.get("suspended") === "yes" ? "" : "yes" })}
        >
          Disconnected
        </Button>
      </div>
    </div>
  )
}
