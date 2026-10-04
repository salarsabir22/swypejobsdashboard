"use client"

import { RecruiterMatchesView } from "@/app/(main)/matches/RecruiterMatchesView"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function RecruiterJobsHub({
  userId,
  defaultTab,
  children,
}: {
  userId: string
  defaultTab: "jobs" | "pipeline"
  children: React.ReactNode
}) {
  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <TabsList className="grid h-auto w-full grid-cols-2">
        <TabsTrigger value="jobs" className="py-2">
          Your jobs
        </TabsTrigger>
        <TabsTrigger value="pipeline" className="py-2">
          Matches
        </TabsTrigger>
      </TabsList>
      <TabsContent value="jobs">{children}</TabsContent>
      <TabsContent value="pipeline">
        <RecruiterMatchesView userId={userId} />
      </TabsContent>
    </Tabs>
  )
}
