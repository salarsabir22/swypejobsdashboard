export type DataSource = "platform" | "survey" | "self_reported" | "verified"

export type CampusStaffRole = "director" | "advisor" | "dean"

export type CampusAccess = {
  userId: string
  role: "admin" | "university"
  staffRole: CampusStaffRole | "admin"
  university: string | null
  universities: string[]
}

export type CountRow = { label: string; value: number }

export type SourcedNumber = {
  value: number | null
  n: number
  source: DataSource
  note?: string
}

export type OutcomeSlice = {
  checkpoint: "graduation" | "3mo" | "6mo" | "12mo"
  employed: number
  gradSchool: number
  stillSeeking: number
  notSeeking: number
  unknown: number
  n: number
  source: DataSource
}

export type SalaryRow = {
  group: string
  average: number | null
  median: number | null
  n: number
}

export type AlertItem = {
  id: string
  severity: "high" | "medium" | "low"
  title: string
  detail: string
  href: string
  count: number
}

export type AttentionStudent = {
  id: string
  name: string
  university: string | null
  major: string | null
  year: number | null
  reason: string
}

export type CampusSnapshot = {
  access: CampusAccess
  missingTables: string[]
  kpis: {
    placementRate: SourcedNumber
    activeStudentsMonth: SourcedNumber
    openJobsMatched: SourcedNumber
    employersEngaged: SourcedNumber
    needingAttention: SourcedNumber
    equityGapFlag: { flagged: boolean; detail: string; source: DataSource }
  }
  outcomes: {
    slices: OutcomeSlice[]
    internshipParticipation: SourcedNumber
    internshipConversion: SourcedNumber
    salariesByMajor: SalaryRow[]
    salariesByDegree: SalaryRow[]
    timeToFirstOfferDays: SourcedNumber
    industries: CountRow[]
    roles: CountRow[]
    geos: CountRow[]
    employerTypes: CountRow[]
    underemployed: SourcedNumber
  }
  engagement: {
    registered: number
    activeWeek: number
    activeMonth: number
    inactive: number
    profileComplete: SourcedNumber
    resumeUploaded: SourcedNumber
    skillsFilled: SourcedNumber
    swipesPerStudent: number
    appsPerStudent: number
    interviewsPerStudent: number
    zeroActivity: AttentionStudent[]
    byYear: CountRow[]
    byMajor: CountRow[]
    byCollege: CountRow[]
    funnel: { label: string; value: number }[]
    rsvps: number
    appointments: number
    resumeReviews: number
  }
  market: {
    activeEmployers: number
    newEmployers: number
    openJobs: number
    internships: number
    byMajor: CountRow[]
    byLocation: CountRow[]
    byWorkMode: CountRow[]
    supplyGaps: { major: string; students: number; jobs: number; gap: number }[]
    topEmployers: { name: string; hires: number; apps: number }[]
    repeatEmployers: number
    responseRate: SourcedNumber
    timeToRespondHours: SourcedNumber
    partners: { name: string; tier: string }[]
  }
  matchQuality: {
    preferenceMatchRate: SourcedNumber
    skillsEmployersWant: CountRow[]
    skillsStudentsHave: CountRow[]
    skillsGaps: { skill: string; jobs: number; students: number }[]
    demandByMajor: { major: string; roles: string[] }[]
    appToInterview: SourcedNumber
    interviewToOffer: SourcedNumber
    offerAccept: SourcedNumber
    declineReasons: CountRow[]
  }
  equity: {
    available: boolean
    consented: number
    byGender: CountRow[]
    byRace: CountRow[]
    firstGenPlacement: SourcedNumber
    international: { n: number; cptOpt: number; sponsorshipJobs: number }
    veteran: number
    transfer: number
    gaps: { label: string; delta: string }[]
  }
  operations: {
    appointments: number
    noShowRate: SourcedNumber
    waitHint: string
    events: { id: string; title: string; kind: string; rsvps: number; hires: number }[]
    resumeReviews: number
    npsOffice: SourcedNumber
    npsPlatform: SourcedNumber
    caseload: SourcedNumber
  }
  swipeSignals: {
    rightByCategory: CountRow[]
    leftByCategory: CountRow[]
    trendingIndustries: CountRow[]
    wantVsHave: { category: string; studentInterest: number; openJobs: number }[]
  }
  alerts: AlertItem[]
  attention: AttentionStudent[]
}
