"use client"

import { useState } from "react"
import { SlidersHorizontal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export function DiscoverFilters({
  fields,
  onClear,
  title = "Refine",
}: {
  fields: DiscoverFilterField[]
  onClear: () => void
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const count = fields.filter(isActive).length
  const pinned = fields.filter((field) => field.pin)

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
        <div className="space-y-3 p-4">
          <FilterGrid fields={fields} idPrefix="discover-desktop" />
          <ActiveChips fields={fields} onClear={onClear} />
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        <div className="flex items-center gap-2">
          {pinned.map((field) => (
            <div key={field.id} className="min-w-0 flex-1">
              <FieldControl field={field} compact />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {count > 0 ? (
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1.5">
                {count}
              </Badge>
            ) : null}
          </Button>
        </div>
        <ActiveChips fields={fields} onClear={onClear} showClear />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 sm:px-6">
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Narrow this stack. The deck jumps back to the first matching card.</SheetDescription>
          </SheetHeader>
          <div className="mt-5">
            <FilterGrid fields={fields} idPrefix="discover-sheet" />
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
