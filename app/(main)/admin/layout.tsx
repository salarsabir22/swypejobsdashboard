import { requireAdmin } from "@/lib/admin/access"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return <div className="space-y-5">{children}</div>
}
