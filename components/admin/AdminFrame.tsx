import { SourceBadge } from "@/components/campus/SourceBadge"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function AdminFrame({
  title,
  description,
  staffRole,
  missingTables,
  children,
}: {
  title: string
  description: string
  staffRole?: string
  missingTables?: string[]
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-[14px] text-muted-foreground">Super admin · {staffRole || "super_admin"}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.02]">{title}</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      </header>
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
