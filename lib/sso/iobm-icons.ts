import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSearch,
  GraduationCap,
  Landmark,
  School,
  Shield,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import type { IobmPortal, IobmStaffRoleId } from "@/lib/sso/iobm"

export const IOBM_PORTAL_ICONS = {
  student: GraduationCap,
  alumni: Award,
  faculty: School,
  employer: Building2,
} as const satisfies Record<IobmPortal, typeof GraduationCap>

export const IOBM_STAFF_ICONS = {
  director: Shield,
  advisor: UserRound,
  coordinator: ClipboardList,
  dean: Landmark,
  faculty: BookOpen,
  auditor: FileSearch,
} as const satisfies Record<IobmStaffRoleId, typeof Shield>

export const IOBM_MODULE_ICONS = {
  jobs: Briefcase,
  events: CalendarDays,
  advising: Users,
  sso: ShieldCheck,
} as const
