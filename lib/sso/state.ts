import { cookies } from "next/headers"
import { isIobmPortal, isIobmStaffRole, type IobmPortal } from "@/lib/sso/iobm"

export type IobmSsoState = {
  portal: IobmPortal
  staffRole?: string
  identityClaim?: boolean
  nonce: string
  next?: string
}

const COOKIE = "iobm_sso"

export async function writeIobmSsoState(state: IobmSsoState) {
  const jar = await cookies()
  jar.set(COOKIE, JSON.stringify(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  })
}

export async function readIobmSsoState(): Promise<IobmSsoState | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as IobmSsoState
    if (!isIobmPortal(parsed.portal) || parsed.portal === "employer") return null
    if (parsed.staffRole && !isIobmStaffRole(parsed.staffRole)) parsed.staffRole = "advisor"
    return parsed
  } catch {
    return null
  }
}

export function newNonce() {
  return crypto.randomUUID()
}
