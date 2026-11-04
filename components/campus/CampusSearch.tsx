"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Building2, GraduationCap, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type Hit = { id: string; href: string; title: string; subtitle?: string | null }

type Results = {
  jobs: Hit[]
  students: Hit[]
  alumni: Hit[]
  employers: Hit[]
}

const EMPTY: Results = { jobs: [], students: [], alumni: [], employers: [] }

export function CampusSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Results>(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setResults(EMPTY)
      return
    }
    const handle = window.setTimeout(() => {
      setLoading(true)
      void fetch(`/api/campus/search?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((json) => setResults(json as Results))
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [open, query])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

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
        <kbd className="ml-auto hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search jobs, students, alumni, employers" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{loading ? "Searching…" : query.trim().length < 2 ? "Type at least two letters." : "No matches."}</CommandEmpty>
          {results.jobs.length ? (
            <CommandGroup heading="Jobs">
              {results.jobs.map((hit) => (
                <CommandItem key={`job-${hit.id}`} value={`job ${hit.title} ${hit.subtitle || ""}`} onSelect={() => go(hit.href)}>
                  <Briefcase />
                  <span className="truncate">{hit.title}</span>
                  {hit.subtitle ? <span className="truncate text-muted-foreground">{hit.subtitle}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.students.length ? (
            <CommandGroup heading="Students">
              {results.students.map((hit) => (
                <CommandItem key={`st-${hit.id}`} value={`student ${hit.title} ${hit.subtitle || ""}`} onSelect={() => go(hit.href)}>
                  <GraduationCap />
                  <span className="truncate">{hit.title}</span>
                  {hit.subtitle ? <span className="truncate text-muted-foreground">{hit.subtitle}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.alumni.length ? (
            <CommandGroup heading="Alumni">
              {results.alumni.map((hit) => (
                <CommandItem key={`al-${hit.id}`} value={`alumni ${hit.title} ${hit.subtitle || ""}`} onSelect={() => go(hit.href)}>
                  <Users />
                  <span className="truncate">{hit.title}</span>
                  {hit.subtitle ? <span className="truncate text-muted-foreground">{hit.subtitle}</span> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.employers.length ? (
            <CommandGroup heading="Employers">
              {results.employers.map((hit) => (
                <CommandItem key={`em-${hit.id}`} value={`employer ${hit.title} ${hit.subtitle || ""}`} onSelect={() => go(hit.href)}>
                  <Building2 />
                  <span className="truncate">{hit.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  )
}
