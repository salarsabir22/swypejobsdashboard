import type { ScreeningQuestion } from "@/lib/jobs/screening"

export type UserRole = "student" | "recruiter" | "admin"
export type JobType = "internship" | "full_time" | "part_time" | "contract"
export type SwipeDirection = "right" | "left" | "saved"

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  cover_url?: string | null
  bio: string | null
  profile_video_url: string | null
  created_at: string
  updated_at: string
}

export interface StudentProfile {
  id: string
  university: string | null
  degree: string | null
  graduation_year: number | null
  institution_type?: "university" | "college" | null
  still_enrolled?: boolean | null
  current_semester?: number | null
  skills: string[]
  interests: string[]
  resume_url: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  preferred_job_categories: string[]
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface RecruiterProfile {
  id: string
  company_name: string
  logo_url: string | null
  description: string | null
  hiring_focus: string | null
  website_url: string | null
  employee_count: string | null
  industry: string | null
  calendly_url?: string | null
  is_approved: boolean
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface Job {
  id: string
  recruiter_id: string
  title: string
  description: string | null
  job_type: JobType
  required_skills: string[]
  nice_to_have_skills: string[]
  location: string | null
  category: string | null
  is_remote: boolean
  is_active: boolean
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  compensation_note?: string | null
  screening_questions?: ScreeningQuestion[] | null
  required_semesters?: number[] | null
  created_at: string
  updated_at: string
  recruiter_profiles?: RecruiterProfile
}

export interface JobSwipe {
  id: string
  student_id: string
  job_id: string
  direction: SwipeDirection
  created_at: string
  jobs?: Job
}

export interface CandidateSwipe {
  id: string
  recruiter_id: string
  student_id: string
  job_id: string
  direction: SwipeDirection
  created_at: string
}

export interface Match {
  id: string
  student_id: string
  recruiter_id: string
  job_id: string
  is_shortlisted: boolean
  is_archived: boolean
  pipeline_status?: string | null
  recruiter_notes?: string | null
  created_at: string
  student?: Profile & { student_profiles?: StudentProfile }
  recruiter?: Profile & { recruiter_profiles?: RecruiterProfile }
  job?: Job
  conversations?: Conversation
}

export interface Conversation {
  id: string
  match_id: string
  created_at: string
  matches?: Match
}

export type ChatMessageType = "text" | "voice" | "image" | "file" | "video" | "audio"

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  message_type?: ChatMessageType
  media_url?: string | null
  duration_seconds?: number | null
  file_name?: string | null
  file_size?: number | null
  mime_type?: string | null
  sender?: Profile
}

export interface CommunityChannel {
  id: string
  name: string
  description: string | null
  category: string | null
  created_by: string | null
  created_at: string
  channel_members?: ChannelMember[]
  _count?: { channel_members: number }
}

export interface ChannelMember {
  channel_id: string
  user_id: string
  joined_at: string
  profiles?: Profile
}

export interface ChannelMessage {
  id: string
  channel_id: string
  sender_id: string
  content: string
  created_at: string
  profiles?: Profile
}

export interface FeedPost {
  id: string
  author_id: string
  body: string
  image_url: string | null
  media_type?: string | null
  created_at: string
  updated_at?: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  data: Record<string, unknown> | null
  created_at: string
}
