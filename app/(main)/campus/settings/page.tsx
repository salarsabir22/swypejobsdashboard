import { Suspense } from "react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { FocusAnchor } from "@/components/campus/FocusAnchor"
import { SsoDesk } from "@/components/campus/SsoDesk"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { listCampusIdentities, listOpenConflicts } from "@/lib/sso/identity"

export default async function CampusSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string; focus?: string }>
}) {
  const { snapshot } = await loadCampusPage(searchParams, "view_sso")
  const [identities, conflicts] = await Promise.all([listCampusIdentities(), listOpenConflicts()])

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Settings & integrations"
      description="SSO, identity conflicts, and approved external connections. Confirm the live IdP protocol with IoBM before changing SAML, OIDC, or JWT settings."
    >
      <Suspense fallback={null}>
        <FocusAnchor id="sso" />
      </Suspense>
      <DashboardPanel title="Campus SSO">
        <div id="sso" className="scroll-mt-24">
          <SsoDesk identities={identities.rows} conflicts={conflicts.rows} missingTable={identities.missingTable || conflicts.missingTable} />
        </div>
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Identity protocol">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Google Workspace on iobm.edu.pk is the current stand-in for campus SSO.</li>
            <li>OIDC and SAML routes exist; they stay dark until IoBM issues client credentials.</li>
            <li>Identities are keyed by NameID or OIDC sub, not email.</li>
          </ul>
        </DashboardPanel>
        <DashboardPanel title="Email and OTP">
          <p className="text-sm text-muted-foreground">
            Students and alumni enter through campus SSO. Employers register with a work email; OTP verification is listed in the IoBM source and is not enabled until that mail provider is confirmed.
          </p>
        </DashboardPanel>
        <DashboardPanel title="Data ownership">
          <p className="text-sm text-muted-foreground">
            IoBM owns campus student, alumni, and employer records in this tenant. Equity views require consent and are written to the campus audit log.
          </p>
        </DashboardPanel>
        <DashboardPanel title="Approved integrations">
          <p className="text-sm text-muted-foreground">
            LinkedIn, Indeed, and Rozee are Phase 3 in the source. Do not wire them until IoBM signs the integration. The API routes under /api/campus and /api/reports are the extension points.
          </p>
        </DashboardPanel>
      </div>
    </CampusFrame>
  )
}
