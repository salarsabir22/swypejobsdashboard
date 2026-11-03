"use client"

import { useMemo, useState } from "react"
import { IobmSsoButton } from "@/components/sso/IobmSsoButton"
import { IOBM_STAFF_ROLES, isIobmStaffRole, staffRoleOf } from "@/lib/sso/iobm"

export function FacultyRolePicker({ initialRole }: { initialRole?: string }) {
  const start = staffRoleOf(initialRole)
  const [staffRole, setStaffRole] = useState(start)
  const selected = useMemo(
    () => IOBM_STAFF_ROLES.find((role) => role.id === staffRole) || IOBM_STAFF_ROLES[1],
    [staffRole]
  )

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-medium text-[#051C2C]/80">Your campus role</legend>
        <div className="grid gap-2">
          {IOBM_STAFF_ROLES.map((role) => {
            const active = role.id === staffRole
            return (
              <label
                key={role.id}
                className={`flex min-h-11 cursor-pointer gap-3 rounded-xl border px-4 py-3 ${
                  active
                    ? "border-[#2251FF] bg-[#2251FF]/10"
                    : "border-[#051C2C]/15 hover:bg-[#051C2C]/[0.03]"
                }`}
              >
                <input
                  type="radio"
                  name="staff_role"
                  value={role.id}
                  checked={active}
                  onChange={() => setStaffRole(isIobmStaffRole(role.id) ? role.id : "advisor")}
                  className="mt-1 size-4 accent-[#2251FF]"
                />
                <span>
                  <span className="block text-[14px] font-semibold text-[#051C2C]">{role.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-[#051C2C]/60">{role.description}</span>
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
