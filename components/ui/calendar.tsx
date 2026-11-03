"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-background p-3", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
        formatWeekdayName: (date) => date.toLocaleDateString("en-US", { weekday: "narrow" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-[280px]", defaultClassNames.root),
        months: cn("relative flex flex-col", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex items-center justify-between", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 rounded-full p-0 aria-disabled:opacity-40",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 rounded-full p-0 aria-disabled:opacity-40",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-8 w-full items-center justify-center px-8",
          defaultClassNames.month_caption
        ),
        dropdowns: cn("flex h-8 items-center justify-center gap-1.5 text-sm font-medium", defaultClassNames.dropdowns),
        caption_label: cn("select-none text-sm font-medium", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("grid grid-cols-7", defaultClassNames.weekdays),
        weekday: cn(
          "flex size-9 items-center justify-center text-center text-[11px] font-medium text-muted-foreground",
          defaultClassNames.weekday
        ),
        week: cn("grid grid-cols-7", defaultClassNames.week),
        day: cn("relative p-0 text-center", defaultClassNames.day),
        today: cn("rounded-full bg-accent text-accent-foreground", defaultClassNames.today),
        outside: cn("text-muted-foreground/50", defaultClassNames.outside),
        disabled: cn("text-muted-foreground opacity-40", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown
          return <Icon className={cn("size-4", chevronClassName)} strokeWidth={1.75} {...chevronProps} />
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      className={cn(
        "size-9 rounded-full p-0 font-normal leading-none data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[selected-single=true]:hover:bg-primary data-[selected-single=true]:hover:text-primary-foreground",
        modifiers.today && !modifiers.selected && "bg-accent",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
