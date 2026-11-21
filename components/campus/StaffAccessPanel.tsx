"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"
import { STAFF_PERMISSIONS } from "@/lib/campus/staff-permissions"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type StaffAccessRow = {
  userId: string
  name: string | null
  staffRole: string
  staffRoleLabel: string
  university: string | null
  /** Explicit switches on campus_staff.access_grants; null = role default. */
  grants: string[] | null
  /** Effective permission ids for this person right now. */
  permissions: string[]
  /** Director / platform admin seats always keep full access. */
  locked: boolean
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-border bg-muted",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "block size-5 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export function StaffAccessPanel({
  rows,
  canManage,
}: {
  rows: StaffAccessRow[]
  canManage: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [permissionsById, setPermissionsById] = useState<Record<string, string[]>>(
    () => Object.fromEntries(rows.map((row) => [row.userId, row.permissions]))
  )
  const [usingDefault, setUsingDefault] = useState<Record<string, boolean>>(
    () => Object.fromEntries(rows.map((row) => [row.userId, row.grants === null]))
  )
  const [savingId, setSavingId] = useState<string | null>(null)

  const save = async (row: StaffAccessRow, permissions: string[] | null, success: string) => {
    setSavingId(row.userId)
    const res = await fetch("/api/campus/staff-access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: row.userId, permissions }),
    })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    setSavingId(null)
    if (!res.ok) {
      toast({ variant: "destructive", title: "Couldn’t update access", description: body?.error })
      return false
    }
    toast({ title: success })
    router.refresh()
    return true
  }

  const toggle = async (row: StaffAccessRow, permissionId: string) => {
    const current = permissionsById[row.userId] || []
    const next = current.includes(permissionId)
      ? current.filter((id) => id !== permissionId)
      : [...current, permissionId]
    const previous = current
    setPermissionsById((prev) => ({ ...prev, [row.userId]: next }))
    setUsingDefault((prev) => ({ ...prev, [row.userId]: false }))
    const label = STAFF_PERMISSIONS.find((item) => item.id === permissionId)?.label || permissionId
    const ok = await save(
      row,
      next,
      `${next.includes(permissionId) ? "Enabled" : "Disabled"} ${label.toLowerCase()} for ${
        row.name || "this staff member"
      }`
    )
    if (!ok) {
      setPermissionsById((prev) => ({ ...prev, [row.userId]: previous }))
    }
  }

  const resetToRoleDefault = async (row: StaffAccessRow) => {
    const ok = await save(row, null, "Back to the staff-role defaults")
    if (ok) setUsingDefault((prev) => ({ ...prev, [row.userId]: true }))
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[12rem]">Staff member</TableHead>
            <TableHead className="min-w-[9rem]">IoBM role</TableHead>
            {STAFF_PERMISSIONS.map((permission) => (
              <TableHead key={permission.id} className="min-w-[7.5rem] text-center">
                {permission.label}
              </TableHead>
            ))}
            <TableHead className="text-right">Reset</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const current = permissionsById[row.userId] || []
            const disabled = !canManage || row.locked || savingId === row.userId
            return (
              <TableRow key={row.userId}>
                <TableCell className="font-medium">
                  <span className="flex flex-wrap items-center gap-2">
                    {row.name || row.userId.slice(0, 8)}
                    {row.locked ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                        <Lock className="size-3" strokeWidth={1.75} /> full access
                      </span>
                    ) : null}
                  </span>
                  {row.university ? (
                    <span className="block text-xs font-normal text-muted-foreground">{row.university}</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{row.staffRoleLabel}</TableCell>
                {STAFF_PERMISSIONS.map((permission) => (
                  <TableCell key={permission.id} className="text-center">
                    <Switch
                      checked={current.includes(permission.id)}
                      disabled={disabled}
                      label={`${permission.label} for ${row.name || row.userId}`}
                      onChange={() => void toggle(row, permission.id)}
                    />
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {row.locked || !canManage ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : usingDefault[row.userId] ? (
                    <span className="text-xs text-muted-foreground">Role default</span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-full px-2.5 text-xs"
                      disabled={savingId === row.userId}
                      onClick={() => void resetToRoleDefault(row)}
                    >
                      Use role default
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
