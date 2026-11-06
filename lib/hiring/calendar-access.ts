import type { SupabaseClient } from "@supabase/supabase-js"

/** Recruiters and campus staff can connect Google Calendar for in-app scheduling. */
export async function userCanUseGoogleCalendar(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any> | { from: (table: string) => any },
  userId: string
) {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
  if (profile?.role === "recruiter" || profile?.role === "admin") return true
  const { data: staff } = await supabase.from("campus_staff").select("user_id").eq("user_id", userId).maybeSingle()
  return Boolean(staff?.user_id)
}
