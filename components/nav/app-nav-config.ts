import {
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  CircleHelp,
  Columns3,
  FileText,
  Globe,
  GraduationCap,
  Handshake,
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
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/career-office", label: "Career office", icon: Building2 },
  { href: "/internships", label: "Internships", icon: GraduationCap },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/opportunities", label: "International", icon: Globe },
  { href: "/appointments", label: "Advising", icon: Handshake },
  { href: "/announcements", label: "Announcements", icon: MessageSquareText },
  { href: "/community", label: "Community", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/profile#saved", label: "Saved roles", icon: Bookmark },
  { href: "/help", label: "Help", icon: CircleHelp },
  { href: "/feedback", label: "Feedback", icon: MessageSquareText },
]

export const alumniMoreLinks: MoreLink[] = [
  { href: "/mentorship", label: "Mentorship", icon: Handshake },
  { href: "/profile/experience", label: "Employment history", icon: Briefcase },
  ...studentMoreLinks,
]

export const recruiterMoreLinks: MoreLink[] = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/dashboard", label: "Insights", icon: LayoutDashboard },
  { href: "/community", label: "Community", icon: Users },
  { href: "/company", label: "Company", icon: User },
  { href: "/jobs/new", label: "Post a job", icon: Briefcase },
  { href: "/partnerships", label: "Campus partnerships", icon: Handshake },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/help", label: "Help", icon: CircleHelp },
  { href: "/feedback", label: "Feedback", icon: MessageSquareText },
]

export type NavGroup = { label: string; items: MoreLink[] }

export const studentNavGroups: NavGroup[] = [
  {
    label: "Career",
    items: [
      { href: "/matches", label: "Applications", icon: Briefcase },
      { href: "/resume", label: "Resume", icon: FileText },
      { href: "/discover", label: "Discover", icon: Layers },
      { href: "/internships", label: "Internships", icon: GraduationCap },
      { href: "/profile#saved", label: "Saved roles", icon: Bookmark },
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
  {
    label: "Campus",
    items: [
      { href: "/career-office", label: "Career office", icon: Building2 },
      { href: "/events", label: "Events", icon: Calendar },
      { href: "/appointments", label: "Advising", icon: Handshake },
      { href: "/announcements", label: "Announcements", icon: MessageSquareText },
      { href: "/opportunities", label: "International", icon: Globe },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/feed", label: "Feed", icon: Newspaper },
      { href: "/chat", label: "Chat", icon: MessageCircle },
      { href: "/community", label: "Community", icon: Users },
      { href: "/help", label: "Help", icon: CircleHelp },
      { href: "/feedback", label: "Feedback", icon: MessageSquareText },
    ],
  },
]

export const alumniNavGroups: NavGroup[] = [
  {
    label: "Career",
    items: [
      ...studentNavGroups[0].items,
      { href: "/profile/experience", label: "Employment history", icon: Briefcase },
    ],
  },
  {
    label: "Campus",
    items: [
      ...studentNavGroups[1].items,
      { href: "/mentorship", label: "Mentorship", icon: Handshake },
    ],
  },
  studentNavGroups[2],
]

export const recruiterNavGroups: NavGroup[] = [
  {
    label: "Hire",
    items: [
      { href: "/jobs", label: "Jobs", icon: Briefcase },
      { href: "/matches", label: "Pipeline", icon: Columns3 },
      { href: "/jobs/new", label: "Post a job", icon: Briefcase },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "/company", label: "Company", icon: User },
      { href: "/dashboard", label: "Insights", icon: LayoutDashboard },
      { href: "/partnerships", label: "Campus partnerships", icon: Handshake },
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/feed", label: "Feed", icon: Newspaper },
      { href: "/chat", label: "Chat", icon: MessageCircle },
      { href: "/community", label: "Community", icon: Users },
      { href: "/events", label: "Events", icon: Calendar },
      { href: "/help", label: "Help", icon: CircleHelp },
      { href: "/feedback", label: "Feedback", icon: MessageSquareText },
    ],
  },
]
