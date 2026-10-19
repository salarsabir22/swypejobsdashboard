import { requireAdmin } from "@/lib/admin/access"
import { AdminNav } from "@/components/admin/AdminNav"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  return (
    <div className="space-y-5">
      <AdminNav modules={admin.modules} />
      {children}
    </div>
  )
}
