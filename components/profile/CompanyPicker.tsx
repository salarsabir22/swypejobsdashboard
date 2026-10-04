"use client"

import { SearchablePicker } from "@/components/ui/searchable-picker"
import { COMPANY_OTHER, PAKISTANI_COMPANIES } from "@/lib/pakistan-companies"

export function CompanyPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <SearchablePicker
      options={PAKISTANI_COMPANIES}
      value={value}
      onChange={onChange}
      placeholder="Search companies in Pakistan"
      otherLabel={COMPANY_OTHER}
    />
  )
}
