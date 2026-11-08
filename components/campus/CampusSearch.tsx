"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Building2, GraduationCap, LoaderCircle, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

type Hit = { id: string; href: string; title: string; subtitle?: string | null }

type Results = {
  jobs: Hit[]
  students: Hit[]
  alumni: Hit[]
  employers: Hit[]
}

const EMPTY: Results = { jobs: [], students: [], alumni: [], employers: [] }

function HitItem({
  hit,
  icon: Icon,
  value,
  onSelect,
}: {
  hit: Hit
  icon: typeof Briefcase
  value: string
  onSelect: () => void
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      <Icon />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{hit.title}</p>
        {hit.subtitle ? <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p> : null}
      </div>
    </CommandItem>
  )
}

export function CampusSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      setQuery("")
      setResults(EMPTY)
      setLoading(false)
      setError(null)
      return
    }

    const q = query.trim()
    if (q.length < 2) {
      abortRef.current?.abort()
      setResults(EMPTY)
      setLoading(false)
      setError(null)
      return
    }

    const handle = window.setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setError(null)
      void fetch(`/api/campus/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(async (res) => {
          const json = await res.json().catch(() => null)
          if (!res.ok) throw new Error(json?.error || "Search failed")
          if (controller.signal.aborted) return
          setResults({
            jobs: Array.isArray(json?.jobs) ? json.jobs : [],
            students: Array.isArray(json?.students) ? json.students : [],
            alumni: Array.isArray(json?.alumni) ? json.alumni : [],
            employers: Array.isArray(json?.employers) ? json.employers : [],
          })
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return
          setResults(EMPTY)
          setError("Couldn’t search right now. Try again.")
        })
        .finally(() => {
          if (abortRef.current === controller) setLoading(false)
        })
    }, 220)

    return () => {
      window.clearTimeout(handle)
      abortRef.current?.abort()
    }
  }, [open, query])

  const total = useMemo(
    () => results.jobs.length + results.students.length + results.alumni.length + results.employers.length,
    [results]
  )

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const emptyMessage = loading
    ? "Searching…"
    : error
      ? error
      : query.trim().length < 2
        ? "Type at least two letters."
        : "No matches."

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-11 min-h-11 w-full max-w-md justify-start rounded-full px-4 text-muted-foreground"
        aria-label="Search jobs, students, alumni, and employers"
      >
        <Search className="h-4 w-4" />
        <span className="truncate">Search jobs, students, alumni, employers</span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        title="Campus search"
        description="Search jobs, students, alumni, and employers across this campus."
      >
        <div className="relative">
          <CommandInput
            placeholder="Search jobs, students, alumni, employers"
            value={query}
            onValueChange={setQuery}
            aria-busy={loading || undefined}
          />
          {loading ? (
            <LoaderCircle
              className="pointer-events-none absolute top-1/2 right-10 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </div>

        <CommandList className="min-h-[12rem] max-h-[min(24rem,50dvh)]">
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-5 animate-spin text-[#005BE2]" aria-hidden />
              Searching…
            </div>
          ) : null}

          {!loading ? <CommandEmpty>{emptyMessage}</CommandEmpty> : null}

          {!loading && results.jobs.length ? (
            <CommandGroup heading="Jobs">
              {results.jobs.map((hit) => (
                <HitItem
                  key={`job-${hit.id}`}
                  hit={hit}
                  icon={Briefcase}
                  value={`job ${hit.title} ${hit.subtitle || ""}`}
                  onSelect={() => go(hit.href)}
                />
              ))}
            </CommandGroup>
          ) : null}

          {!loading && results.students.length ? (
            <CommandGroup heading="Students">
              {results.students.map((hit) => (
                <HitItem
                  key={`st-${hit.id}`}
                  hit={hit}
                  icon={GraduationCap}
                  value={`student ${hit.title} ${hit.subtitle || ""}`}
                  onSelect={() => go(hit.href)}
                />
              ))}
            </CommandGroup>
          ) : null}

          {!loading && results.alumni.length ? (
            <CommandGroup heading="Alumni">
              {results.alumni.map((hit) => (
                <HitItem
                  key={`al-${hit.id}`}
                  hit={hit}
                  icon={Users}
                  value={`alumni ${hit.title} ${hit.subtitle || ""}`}
                  onSelect={() => go(hit.href)}
                />
              ))}
            </CommandGroup>
          ) : null}

          {!loading && results.employers.length ? (
            <CommandGroup heading="Employers">
              {results.employers.map((hit) => (
                <HitItem
                  key={`em-${hit.id}`}
                  hit={hit}
                  icon={Building2}
                  value={`employer ${hit.title} ${hit.subtitle || ""}`}
                  onSelect={() => go(hit.href)}
                />
              ))}
            </CommandGroup>
          ) : null}

          {!loading && total > 0 ? (
            <>
              <CommandSeparator />
              <p className="px-3 py-2 text-[11px] text-muted-foreground">
                {total} result{total === 1 ? "" : "s"} · Enter to open
              </p>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  )
}
