import Link from "next/link"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"

const TASKS = [
  { href: "/discover", title: "Find a role", body: "Swipe campus-curated jobs first, or switch to All jobs. Right to apply, up to save." },
  { href: "/jobs/new", title: "Post a job", body: "Employers: Home → Post a job. Fill the form, then publish. Candidates see it after review if your account is pending." },
  { href: "/profile", title: "Finish your profile", body: "Photo, education, skills, and LinkedIn help you get shortlisted. Resume lives under Resume." },
  { href: "/matches", title: "Track applications", body: "Students see status on Applications. Employers manage people in Pipeline." },
  { href: "/chat", title: "Message a match", body: "Chat unlocks when both sides show interest. Interview times can be proposed in the thread." },
  { href: "/campus", title: "Career office", body: "Approve jobs, curate the student feed, invite employers, and book advising from Campus Home." },
]

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DashboardPageHeader
        eyebrow="Support"
        title="Help"
        description="The fastest path for each common task. Feed and Community stay as they are — Discover is the source of truth for job cards."
      />
      <ul className="space-y-3">
        {TASKS.map((task) => (
          <li key={task.href} className="rounded-2xl border border-border bg-card p-4">
            <Link href={task.href} className="font-heading text-base font-semibold text-foreground hover:text-primary">
              {task.title}
            </Link>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
