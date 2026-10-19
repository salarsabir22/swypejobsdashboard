import { SourceBadge } from "@/components/campus/SourceBadge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

const STAFF_ROLE_LABEL: Record<string, string> = {
  super_admin: "Super admin",
  moderator: "Moderator",
  support: "Support",
  analyst: "Analyst",
  finance: "Finance",
  readonly: "Read-only",
}

function formatStaffRole(role?: string | null) {
  if (!role) return "Admin"
  return STAFF_ROLE_LABEL[role] || role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AdminFrame({
  title,
  description,
  staffRole,
  missingTables,
  mode = "queue",
  children,
}: {
  title: string
  description: string
  staffRole?: string
  missingTables?: string[]
  /** queue = actionable; observability = read-only until integrations ship; settings = config */
  mode?: "queue" | "observability" | "settings"
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] text-muted-foreground">{formatStaffRole(staffRole)}</p>
          {mode === "observability" ? (
            <Badge variant="outline">Observability · read-only</Badge>
          ) : mode === "settings" ? (
            <Badge variant="secondary">Settings</Badge>
          ) : null}
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.02]">{title}</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </header>
      {mode === "observability" ? (
        <Alert>
          <AlertDescription>
            This page is observability only until Stripe, webhooks, or legal tooling are wired. No queue actions here —
            use Employers, Jobs, Safety, and Users for day-to-day ops.
          </AlertDescription>
        </Alert>
      ) : null}
      {missingTables?.length ? (
        <Alert>
          <AlertDescription>
            Extra ops tables are not live ({missingTables.slice(0, 4).join(", ")}
            {missingTables.length > 4 ? "…" : ""}). Run{" "}
            <code className="text-[12px]">20261009_super_admin.sql</code>. Live queues still use users, jobs, and reports.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SourceBadge source="platform" />
        <SourceBadge source="verified" />
      </div>
      {children}
    </div>
  )
}
