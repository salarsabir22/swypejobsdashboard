"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandInput } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type DiscoverFilterOption = { value: string; label: string }

type FilterBase = {
  id: string
  label: string
  chip?: boolean
  pin?: boolean
}

export type DiscoverFilterField =
  | (FilterBase & {
      kind: "select"
      value: string
      emptyValue?: string
      options: DiscoverFilterOption[]
      onChange: (value: string) => void
    })
  | (FilterBase & {
      kind: "text"
      value: string
      placeholder?: string
      inputMode?: "text" | "search" | "numeric" | "tel" | "url" | "email" | "decimal" | "none"
      onChange: (value: string) => void
    })

function isActive(field: DiscoverFilterField) {
  if (field.chip === false) return false
  if (field.kind === "select") return field.value !== (field.emptyValue ?? "all")
  return field.value.trim().length > 0
}

function chipLabel(field: DiscoverFilterField) {
  if (field.kind === "select") {
    const option = field.options.find((item) => item.value === field.value)
    return `${field.label}: ${option?.label || field.value}`
  }
  return `${field.label}: ${field.value.trim()}`
}

function clearField(field: DiscoverFilterField) {
  if (field.kind === "select") field.onChange(field.emptyValue ?? "all")
  else field.onChange("")
}

function useTypewriter(phrases: string[], enabled: boolean) {
  const reduceMotion = useReducedMotion()
  const [text, setText] = useState("")
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const first = phrases[0] ?? ""
    if (!enabled || reduceMotion || phrases.length === 0) {
      setText("")
      setPhraseIndex(0)
      setDeleting(false)
      return
    }

    const phrase = phrases[phraseIndex % phrases.length] ?? first
    const atEnd = text === phrase
    const atStart = text.length === 0
    const delay = atEnd && !deleting ? 1400 : deleting && atStart ? 320 : deleting ? 36 : 58

    const timer = window.setTimeout(() => {
      if (!deleting && atEnd) {
        setDeleting(true)
        return
      }
      if (deleting && atStart) {
        setDeleting(false)
        setPhraseIndex((index) => (index + 1) % phrases.length)
        return
      }
      const nextLength = deleting ? text.length - 1 : text.length + 1
      setText(phrase.slice(0, nextLength))
    }, delay)

    return () => window.clearTimeout(timer)
  }, [deleting, enabled, phraseIndex, phrases, reduceMotion, text])

  if (!enabled || reduceMotion) {
    return { text: phrases[0] ?? "", caret: false }
  }
  return { text, caret: true }
}

function FieldControl({
  field,
  id,
  compact,
}: {
  field: DiscoverFilterField
  id?: string
  compact?: boolean
}) {
  const active = isActive(field) || field.chip === false

  if (field.kind === "select") {
    return (
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger
          id={id}
          aria-label={field.label}
          className={cn(
            compact ? "h-9 rounded-full bg-card" : "h-10 rounded-xl bg-background",
            !active && "text-muted-foreground"
          )}
        >
          <SelectValue placeholder={field.label} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      id={id}
      className={cn(compact ? "h-9 rounded-full bg-card" : "h-10 rounded-xl bg-background")}
      placeholder={field.placeholder}
      value={field.value}
      inputMode={field.inputMode}
      aria-label={field.label}
      onChange={(e) => field.onChange(e.target.value)}
    />
  )
}

function FilterGrid({ fields, idPrefix }: { fields: DiscoverFilterField[]; idPrefix: string }) {
  const cols =
    fields.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : fields.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"

  return (
    <div className={cn("grid gap-3", cols)}>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.id}`
        return (
          <div key={field.id} className="min-w-0 space-y-1.5">
            <Label htmlFor={id} className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {field.label}
            </Label>
            <FieldControl field={field} id={id} />
          </div>
        )
      })}
    </div>
  )
}

function ActiveChips({
  fields,
  onClear,
  showClear,
}: {
  fields: DiscoverFilterField[]
  onClear: () => void
  showClear?: boolean
}) {
  const active = fields.filter(isActive)
  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map((field) => (
        <button
          key={field.id}
          type="button"
          onClick={() => clearField(field)}
          className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2.5 font-body text-xs text-primary"
          aria-label={`Remove ${field.label} filter`}
        >
          <span className="truncate">{chipLabel(field)}</span>
          <X className="h-3 w-3 shrink-0" />
        </button>
      ))}
      {showClear ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-full px-2 text-xs" onClick={onClear}>
          Clear all
        </Button>
      ) : null}
    </div>
  )
}

function DiscoverSearchBar({
  field,
  hints,
}: {
  field: Extract<DiscoverFilterField, { kind: "text" }>
  hints: string[]
}) {
  const [focused, setFocused] = useState(false)
  const showHint = !focused && field.value.trim().length === 0
  const { text, caret } = useTypewriter(hints, showHint)

  return (
    <div className="relative">
      <Command
        shouldFilter={false}
        label={field.label}
        className="h-11 overflow-hidden rounded-full border border-input bg-white shadow-sm"
      >
        <CommandInput
          value={field.value}
          onValueChange={field.onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={field.label}
          placeholder={showHint ? "" : field.placeholder || "Search"}
          className="h-11 py-0"
        />
      </Command>
      {showHint ? (
        <span
          className="pointer-events-none absolute inset-y-0 left-9 right-4 flex items-center font-body text-sm text-muted-foreground"
          aria-hidden
        >
          <span className="truncate">{text}</span>
          {caret ? (
            <motion.span
              className="ml-0.5 inline-block h-4 w-px bg-muted-foreground"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

function FiltersFab({
  count,
  onOpen,
}: {
  count: number
  onOpen: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 lg:hidden"
        style={{ bottom: "calc(var(--app-tabbar-offset) + 0.5rem)" }}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <Button
          type="button"
          size="sm"
          className="pointer-events-auto h-11 min-w-11 rounded-full px-4 shadow-[0_10px_28px_-12px_rgba(90,72,255,0.55)] transition-transform hover:scale-[1.04] active:scale-[0.97]"
          onClick={onOpen}
          aria-label={count ? `Open filters, ${count} active` : "Open filters"}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {count > 0 ? (
            <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 border-0 bg-white px-1.5 text-primary">
              {count}
            </Badge>
          ) : null}
        </Button>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export function DiscoverFilters({
  fields,
  onClear,
  title = "Refine",
  searchHints,
}: {
  fields: DiscoverFilterField[]
  onClear: () => void
  title?: string
  searchHints?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const count = fields.filter(isActive).length
  const searchField = fields.find((field): field is Extract<DiscoverFilterField, { kind: "text" }> => field.id === "keyword" && field.kind === "text")
  const hints = useMemo(() => {
    const extra = (searchHints || []).map((hint) => hint.trim()).filter(Boolean)
    const fallback = searchField?.placeholder?.trim()
    const list = extra.length ? extra : fallback ? [fallback] : ["Search…"]
    return list
  }, [searchField?.placeholder, searchHints])
  const contextFields = fields.filter((field) => field.chip === false)
  const gridFields = fields.filter((field) => field.id !== "keyword")
  const pinned = gridFields.filter((field) => field.pin)
  const extras = gridFields.filter((field) => !field.pin)
  const desktopFields =
    showAll || extras.length === 0 ? gridFields : pinned.length ? pinned : gridFields.slice(0, Math.min(4, gridFields.length))

  return (
    <div className="space-y-2">
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:block">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="font-data text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
            {count > 0 ? (
              <Badge variant="secondary" className="h-5 px-1.5 font-data text-[10px] font-medium">
                {count} active
              </Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {extras.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2 text-xs"
                onClick={() => setShowAll((openAll) => !openAll)}
                aria-expanded={showAll}
              >
                {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAll ? "Show fewer filters" : "Show all filters"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-2 text-xs"
              onClick={onClear}
              disabled={count === 0}
            >
              Clear
            </Button>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {searchField ? <DiscoverSearchBar field={searchField} hints={hints} /> : null}
          <FilterGrid fields={desktopFields} idPrefix="discover-desktop" />
          {showAll ? null : <ActiveChips fields={fields} onClear={onClear} />}
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {searchField ? <DiscoverSearchBar field={searchField} hints={hints} /> : null}
        {contextFields.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-w-0 items-center text-left text-muted-foreground"
          >
            <p className="min-w-0 truncate font-body text-xs">
              {contextFields
                .map((field) => {
                  if (field.kind !== "select") return `${field.label}: ${field.value}`
                  const option = field.options.find((item) => item.value === field.value)
                  return `${field.label}: ${option?.label || field.value}`
                })
                .join(" · ")}
            </p>
          </button>
        ) : null}
        <ActiveChips fields={fields} onClear={onClear} showClear />
      </div>

      {open ? null : <FiltersFab count={count} onOpen={() => setOpen(true)} />}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 sm:px-6">
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Narrow this stack. The deck jumps back to the first matching card.</SheetDescription>
          </SheetHeader>
          <div className="mt-5">
            <FilterGrid fields={gridFields} idPrefix="discover-sheet" />
          </div>
          <SheetFooter className="mt-6 flex-row justify-end gap-2 sm:space-x-0">
            <Button type="button" variant="ghost" className="rounded-full" onClick={onClear} disabled={count === 0}>
              Clear all
            </Button>
            <Button type="button" className="rounded-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
