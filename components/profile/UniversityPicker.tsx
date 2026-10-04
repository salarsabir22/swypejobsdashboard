"use client"

import { SearchablePicker } from "@/components/ui/searchable-picker"
import { PAKISTANI_UNIVERSITIES, UNIVERSITY_OTHER } from "@/lib/pakistan-universities"

export function UniversityPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SearchablePicker
      options={PAKISTANI_UNIVERSITIES}
      value={value}
      onChange={onChange}
      placeholder="Search any university in Pakistan"
      otherLabel={UNIVERSITY_OTHER}
    />
  )
}
