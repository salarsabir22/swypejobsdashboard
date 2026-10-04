"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const signOut = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={signOut} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Sign Out
    </Button>
  )
}
