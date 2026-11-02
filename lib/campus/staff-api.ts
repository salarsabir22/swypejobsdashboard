import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function requireCampusStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const { data: staff } = await supabase.from("campus_staff").select("university").eq("user_id", user.id).maybeSingle()
  if (profile?.role !== "admin" && profile?.role !== "university" && !staff?.university) {
    return { error: NextResponse.json({ error: "Campus access required." }, { status: 403 }) }
  }

  return {
    user,
    university: staff?.university || null,
    isAdmin: profile?.role === "admin",
    admin: createAdminClient(),
  }
}
