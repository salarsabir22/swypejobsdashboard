"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SearchablePicker({
  options,
  value,
  onChange,
  placeholder,
  otherLabel = "Other (type your own)",
}: {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  otherLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? options.filter((item) => item.toLowerCase().includes(q)) : [...options]
    return [...list.slice(0, 40), otherLabel]
  }, [options, otherLabel, query])

  const known = (options as readonly string[]).includes(value)

  return (
    <div className="relative">
      <Input
        className="h-11 rounded-xl"
        placeholder={placeholder}
        value={open ? query : value}
        onFocus={() => {
          setQuery(value && !known ? value : "")
          setOpen(true)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          onChange(e.target.value)
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150)
        }}
      />
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {filtered.map((item) => (
            <li key={item}>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start rounded-lg px-3 py-2 font-body text-sm",
                  value === item && "bg-muted font-medium"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (item === otherLabel) {
                    onChange("")
                    setQuery("")
                    setOpen(false)
                    return
                  }
                  onChange(item)
                  setQuery("")
                  setOpen(false)
                }}
              >
                {item}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
