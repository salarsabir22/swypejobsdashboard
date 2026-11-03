"use client"

import { useMemo, useState } from "react"
import { format, parse } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type PickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

function parseDay(value?: string) {
  if (!value) return undefined
  const d = parse(value.slice(0, 10), "yyyy-MM-dd", new Date())
  return Number.isNaN(d.getTime()) ? undefined : d
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function isOutOfRange(date: Date, min?: string, max?: string) {
  const day = startOfDay(date)
  const minDay = parseDay(min)
  const maxDay = parseDay(max)
  if (minDay && day < startOfDay(minDay)) return true
  if (maxDay && day > startOfDay(maxDay)) return true
  return false
}

const triggerClass =
  "h-11 w-full min-w-0 justify-start rounded-full border-input bg-white px-4 text-left font-normal text-foreground shadow-none hover:bg-white hover:text-foreground"

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  disabled,
  className,
}: PickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseDay(value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(triggerClass, !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4 shrink-0" strokeWidth={1.75} />
          {selected ? format(selected, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(format(date, "yyyy-MM-dd"))
            setOpen(false)
          }}
          disabled={(date) => isOutOfRange(date, min, max)}
        />
      </PopoverContent>
    </Popover>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"))

function parseDateTime(value: string) {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function DateTimePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick date and time",
  disabled,
  className,
}: PickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseDateTime(value)
  const hour = selected ? String(selected.getHours()).padStart(2, "0") : "09"
  const minute = selected ? String(selected.getMinutes()).padStart(2, "0") : "00"
  const minuteOptions = useMemo(() => {
    if (MINUTES.includes(minute)) return MINUTES
    return [...MINUTES, minute].sort()
  }, [minute])

  const apply = (date: Date, nextHour: string, nextMinute: string) => {
    const next = new Date(date)
    next.setHours(Number(nextHour), Number(nextMinute), 0, 0)
    onChange(format(next, "yyyy-MM-dd'T'HH:mm"))
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(triggerClass, !selected && "text-muted-foreground", className)}
        >
          <CalendarIcon className="size-4 shrink-0" strokeWidth={1.75} />
          {selected ? format(selected, "PPP p") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[280px] p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            apply(date, hour, minute)
          }}
          disabled={(date) => isOutOfRange(date, min, max)}
        />
        <div className="flex items-center gap-2 border-t border-border p-3">
          <Clock className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
          <Select
            value={hour}
            onValueChange={(nextHour) => {
              apply(selected ?? new Date(), nextHour, minute)
            }}
          >
            <SelectTrigger aria-label="Hour" className="h-10 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOURS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select
            value={minute}
            onValueChange={(nextMinute) => {
              apply(selected ?? new Date(), hour, nextMinute)
            }}
          >
            <SelectTrigger aria-label="Minute" className="h-10 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {minuteOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
