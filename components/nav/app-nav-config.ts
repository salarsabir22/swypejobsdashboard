import {
  Bookmark,
  Briefcase,
  Columns3,
  FileText,
  LayoutDashboard,
  Layers,
  MessageCircle,
  MessageSquareText,
  Newspaper,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"

export type TabItem = { href: string; label: string; icon: LucideIcon }
export type MoreLink = { href: string; label: string; icon: LucideIcon }

export const studentTabs: TabItem[] = [
  { href: "/discover", icon: Layers, label: "Discover" },
  { href: "/feed", icon: Newspaper, label: "Feed" },
  { href: "/matches", icon: Briefcase, label: "Apps" },
  { href: "/resume", icon: FileText, label: "Resume" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
]

export const recruiterTabs: TabItem[] = [
  { href: "/discover", icon: Layers, label: "Discover" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/matches", icon: Columns3, label: "Pipeline" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
]

export const studentMoreLinks: MoreLink[] = [
  { href: "/dashboard", label: "Insights", icon: LayoutDashboard },
  { href: "/community", label: "Community", icon: Users },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/profile#saved", label: "Saved roles", icon: Bookmark },
  { href: "/feedback", label: "Feedback", icon: MessageSquareText },
]

export const recruiterMoreLinks: MoreLink[] = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/dashboard", label: "Insights", icon: LayoutDashboard },
  { href: "/community", label: "Community", icon: Users },
  { href: "/profile", label: "Company page", icon: User },
  { href: "/jobs/new", label: "Post a job", icon: Briefcase },
  { href: "/feedback", label: "Feedback", icon: MessageSquareText },
]
