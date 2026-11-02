/**
 * Browser helper: ask the server to email a student about a pipeline move or interview invite.
 * Fire-and-forget; failures never surface to the recruiter UI.
 */

import type { PipelineStatus } from "@/lib/match/fit"

type Payload = { kind: "pipeline"; matchId: string; status: PipelineStatus } | { kind: "interview"; matchId: string; message: string }

export function requestStudentEmail(payload: Payload) {
  if (typeof window === "undefined") return
  void fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined)
}
