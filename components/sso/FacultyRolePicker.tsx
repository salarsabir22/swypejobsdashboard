"use client"

import { useMemo, useState } from "react"
import { IobmSsoButton } from "@/components/sso/IobmSsoButton"
import { IOBM_STAFF_ICONS } from "@/lib/sso/iobm-icons"
import { IOBM_SELF_STAFF_ROLES, selfAssignableStaffRole } from "@/lib/sso/iobm"

export function FacultyRolePicker({ initialRole }: { initialRole?: string }) {
  const start = selfAssignableStaffRole(initialRole)
  const [staffRole, setStaffRole] = useState(start)
  const selected = useMemo(
    () => IOBM_SELF_STAFF_ROLES.find((role) => role.id === staffRole) || IOBM_SELF_STAFF_ROLES[0],
    [staffRole]
  )

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-[12px] font-medium text-[#5C6370]">Your campus role</legend>
        <div className="grid gap-1.5">
          {IOBM_SELF_STAFF_ROLES.map((role) => {
            const active = role.id === staffRole
            const Icon = IOBM_STAFF_ICONS[role.id]
            return (
              <label
                key={role.id}
                className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 ${
                  active
                    ? "border-[#C41E3A] bg-[#C41E3A]/[0.06]"
                    : "border-[#111111]/10 hover:bg-[#111111]/[0.03]"
                }`}
              >
                <input
                  type="radio"
                  name="staff_role"
                  value={role.id}
                  checked={active}
                  onChange={() => setStaffRole(selfAssignableStaffRole(role.id))}
                  className="size-3.5 accent-[#C41E3A]"
                />
                <Icon className={`size-3.5 shrink-0 ${active ? "text-[#C41E3A]" : "text-[#5C6370]"}`} aria-hidden />
                <span>
                  <span className="block text-[13px] font-medium text-[#111111]">{role.label}</span>
                  <span className="block text-[11px] leading-4 text-[#5C6370]">{role.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <IobmSsoButton portal="faculty" staffRole={staffRole} label={`Continue as ${selected.label}`} />
    </div>
  )
}
