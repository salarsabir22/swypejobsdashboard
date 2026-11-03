-- IoBM CDC content. Safe to re-run (fixed UUIDs).
-- Events, announcements, international opportunities, partners, and campus internships.

create table if not exists public.international_opportunities (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  country text,
  organization text,
  summary text,
  eligibility text,
  visa_url text,
  apply_url text,
  deadline date,
  university text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.international_opportunities enable row level security;

drop policy if exists international_opportunities_read on public.international_opportunities;
create policy international_opportunities_read
  on public.international_opportunities
  for select
  to authenticated
  using (is_active = true);

insert into public.campus_events (id, university, title, kind, summary, location, starts_at, ends_at)
values
  ('a1b11000-0000-4000-8000-000000000001', 'Institute of Business Management (IoBM), Karachi', 'Resume lab with IoBM CDC', 'workshop', 'Bring a printed CV. Advisors mark one version you can upload to swypejobs the same afternoon.', 'CDC, CBM Building, 2nd floor', '2026-11-10T06:00:00Z', '2026-11-10T08:00:00Z'),
  ('a1b11000-0000-4000-8000-000000000002', 'Institute of Business Management (IoBM), Karachi', 'Unilever Pakistan — campus info session', 'info_session', 'Summer internship tracks in brand, supply chain, and finance. Q&A with IoBM alumni on the team.', 'Auditorium A, Student Center', '2026-11-13T10:00:00Z', '2026-11-13T11:30:00Z'),
  ('a1b11000-0000-4000-8000-000000000003', 'Institute of Business Management (IoBM), Karachi', 'Interview prep for banks and Big 4', 'workshop', 'Case drills, competency answers, and what CDC wants on your experiential record after you accept.', 'CES seminar room 3', '2026-11-18T09:00:00Z', '2026-11-18T11:00:00Z'),
  ('a1b11000-0000-4000-8000-000000000004', 'Institute of Business Management (IoBM), Karachi', 'Spring 2027 career fair', 'career_fair', '40 employers on the Korangi Creek lawn. Bring student ID and two printed CVs. RSVP to skip the queue.', 'Main lawn, Korangi Creek campus', '2026-11-20T05:00:00Z', '2026-11-20T11:00:00Z'),
  ('a1b11000-0000-4000-8000-000000000005', 'Institute of Business Management (IoBM), Karachi', 'Alumni homecoming mixer', 'other', 'Mentorship matching for the 2027 cycle. Alumni RSVP; current students attend with a CDC pass.', 'Faculty lounge, CBM Building', '2026-12-05T13:00:00Z', '2026-12-05T16:00:00Z')
on conflict (id) do update set
  title = excluded.title,
  kind = excluded.kind,
  summary = excluded.summary,
  location = excluded.location,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  university = excluded.university;

insert into public.campus_announcements (id, university, title, body, audience, requires_ack, expires_at)
values
  ('a1b21000-0000-4000-8000-000000000001', 'Institute of Business Management (IoBM), Karachi', 'Acknowledge the Fall 2026 internship reporting rule', 'If you are on an internship this semester, log it under Internships by 21 November. CDC cannot verify late records for the Dean’s list or experiential credit.', 'students', true, '2026-12-31T18:00:00Z'),
  ('a1b21000-0000-4000-8000-000000000002', 'Institute of Business Management (IoBM), Karachi', 'CDC walk-in hours this week', 'Advisors are in the CBM Building, 2nd floor, Monday–Thursday 11:00–15:00. Book Advising if you need a reserved slot for resume review or internship search.', 'students', false, null),
  ('a1b21000-0000-4000-8000-000000000003', 'Institute of Business Management (IoBM), Karachi', 'Spring 2027 career fair — employer list is live', 'Careem, Folio3, Motive, Systems Limited, Unilever, and 35 other employers are confirmed. RSVP on Events. Dress code is business casual; student ID required at the gate.', 'all', false, '2026-11-21T18:00:00Z'),
  ('a1b21000-0000-4000-8000-000000000004', 'Institute of Business Management (IoBM), Karachi', 'Alumni mentorship cycle is open', 'The 2027 IoBM alumni mentor roster is open through 15 December. Opt in under Mentorship. CDC matches on industry, not batch year.', 'alumni', false, '2026-12-16T18:00:00Z'),
  ('a1b21000-0000-4000-8000-000000000005', 'Institute of Business Management (IoBM), Karachi', 'Visa workshop before the Malaya semester abroad', 'International Programmes and CDC will walk through the Malaysian student pass on 24 November, 14:00, CES seminar room 1. Bring your passport scan.', 'students', false, '2026-11-25T18:00:00Z')
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  audience = excluded.audience,
  requires_ack = excluded.requires_ack,
  expires_at = excluded.expires_at,
  university = excluded.university;

insert into public.international_opportunities (id, kind, title, country, organization, summary, eligibility, visa_url, apply_url, deadline, university, is_active)
values
  ('a1b41000-0000-4000-8000-000000000001', 'study_abroad', 'IoBM × University of Malaya semester abroad', 'Malaysia', 'University of Malaya · IoBM Office of International Programmes', 'Spend spring 2027 at UM in Kuala Lumpur. Credits map to BBA, BSAF, and CS electives.', 'CGPA 3.0+, two completed semesters, valid passport', 'https://www.imi.gov.my/index.php/en/main-services/visa/student-pass/', 'https://www.iobm.edu.pk', '2026-12-15', 'Institute of Business Management (IoBM), Karachi', true),
  ('a1b41000-0000-4000-8000-000000000002', 'exchange', 'Soka University exchange — Tokyo', 'Japan', 'Soka University', 'One-semester exchange for IoBM undergraduates. Japanese language is not required for the English-taught track.', 'Third-year BBA or BSAF, CGPA 3.2+', 'https://www.mofa.go.jp/j_info/visit/visa/index.html', 'https://www.iobm.edu.pk', '2027-01-20', 'Institute of Business Management (IoBM), Karachi', true),
  ('a1b41000-0000-4000-8000-000000000003', 'scholarship', 'CDC merit scholarship for unpaid internships', 'Pakistan', 'IoBM Career Development Center', 'PKR 40,000 stipend for students who accept an unpaid internship of at least eight weeks.', 'Enrolled IoBM student, internship letter on company letterhead', null, 'https://www.iobm.edu.pk', '2026-11-30', 'Institute of Business Management (IoBM), Karachi', true),
  ('a1b41000-0000-4000-8000-000000000004', 'dual_degree', 'IoBM–University of Hull dual MSc pathway', 'United Kingdom', 'University of Hull', 'Finish the IoBM master’s year, then complete a taught MSc at Hull.', 'Final-year master’s, English test as required by Hull', 'https://www.gov.uk/student-visa', 'https://www.iobm.edu.pk', '2027-02-28', 'Institute of Business Management (IoBM), Karachi', true)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  deadline = excluded.deadline,
  university = excluded.university,
  is_active = true;
