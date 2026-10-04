import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatInboxClient } from "@/components/chat/ChatInboxClient"

export default async function ChatIndexPage() {
  const supabase = await createClient()
  const { data: userRes } = await supabase.auth.getUser()
  const user = userRes.user

  if (!user) redirect("/login")

  return <ChatInboxClient currentUserId={user.id} />
}
