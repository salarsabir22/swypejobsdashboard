"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter, Search, X } from "lucide-react"
import { employerIndustryOptions, employerSizeOptions } from "@/lib/campus/employer-directory"
import { CampusFilterPendingBadge, useCampusFilterNav } from "@/components/campus/CampusFilterPending"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const KEEP_KEYS = ["campus", "range", "from", "to"] as const

export function EmployerDirectoryFilters() {
  const { pending, pathname, params, navigate } = useCampusFilterNav()
  const industries = useMemo(() => employerIndustryOptions(), [])
  const sizes = useMemo(() => employerSizeOptions(), [])

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(params.get("q") || "")
  const [industry, setIndustry] = useState(params.get("industry") || "")
  const [size, setSize] = useState(params.get("size") || "")
  const [inactive, setInactive] = useState(params.get("inactive") || "")
  const [inactiveN, setInactiveN] = useState(params.get("inactive_n") || "30")
  const [suspended, setSuspended] = useState(params.get("suspended") || "")

  useEffect(() => {
    setQ(params.get("q") || "")
    setIndustry(params.get("industry") || "")
    setSize(params.get("size") || "")
    setInactive(params.get("inactive") || "")
    setInactiveN(params.get("inactive_n") || "30")
    setSuspended(params.get("suspended") || "")
  }, [params])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (params.get("industry")) n++
    if (params.get("size")) n++
    if (params.get("inactive")) n++
    if (params.get("suspended")) n++
    return n
  }, [params])

  function buildQuery(overrides?: Record<string, string | null>) {
    const next = new URLSearchParams()
    for (const key of KEEP_KEYS) {
      const value = params.get(key)
      if (value) next.set(key, value)
    }

    const values: Record<string, string> = {
      q: q.trim(),
      industry,
      size,
      inactive,
      inactive_n: inactive === "custom" ? inactiveN : "",
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
    setIndustry("")
    setSize("")
    setInactive("")
    setInactiveN("30")
    setSuspended("")
    const next = new URLSearchParams()
    for (const key of KEEP_KEYS) {
      const value = params.get(key)
      if (value) next.set(key, value)
    }
    navigate(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  const filterFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="emp-industry">Industry</Label>
        <Select value={industry || "__any"} onValueChange={(value) => setIndustry(value === "__any" ? "" : value)}>
          <SelectTrigger id="emp-industry" className="rounded-full">
            <SelectValue placeholder="All industries" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="__any">All industries</SelectItem>
            {industries.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emp-size">Company size</Label>
        <Select value={size || "__any"} onValueChange={(value) => setSize(value === "__any" ? "" : value)}>
          <SelectTrigger id="emp-size" className="rounded-full">
            <SelectValue placeholder="Any size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__any">Any size</SelectItem>
            {sizes.map((item) => (
              <SelectItem key={item} value={item}>
                {item} employees
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="emp-inactive">Inactive</Label>
        <Select value={inactive || "__any"} onValueChange={(value) => setInactive(value === "__any" ? "" : value)}>
          <SelectTrigger id="emp-inactive" className="rounded-full">
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="emp-inactive-n">Days inactive</Label>
          <Input
            id="emp-inactive-n"
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
        <Label htmlFor="emp-suspended">Campus partnership</Label>
        <Select value={suspended || "__any"} onValueChange={(value) => setSuspended(value === "__any" ? "" : value)}>
          <SelectTrigger id="emp-suspended" className="rounded-full">
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
            placeholder="Search by company name…"
            className="h-9 rounded-full pl-9"
            aria-label="Search by company name"
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
              <SheetTitle>Employer filters</SheetTitle>
              <SheetDescription>Narrow by industry, size, inactivity, and account status.</SheetDescription>
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

      <div className="hidden flex-wrap items-center gap-1.5 md:flex" role="group" aria-label="Quick filters">
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
