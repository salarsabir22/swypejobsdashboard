import { requireAdmin } from "@/lib/admin/access"
import { AdminNav } from "@/components/admin/AdminNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="space-y-5">
      <AdminNav />
      {children}
    </div>
  )
}
