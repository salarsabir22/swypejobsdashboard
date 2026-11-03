-- Alumni first-destination / career survey (HEC placement + NBEAC employment outcomes).
-- One response per graduate per survey year. Self-reported; reports label it as such.

create table if not exists public.career_surveys (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  survey_year integer not null check (survey_year between 2000 and 2100),
  employment_status text not null check (employment_status in ('employed', 'self_employed', 'further_study', 'seeking', 'not_seeking')),
  employer text,
  designation text,
  industry text,
  salary_pkr integer check (salary_pkr is null or salary_pkr >= 0),
  related_to_degree text check (related_to_degree is null or related_to_degree in ('yes', 'somewhat', 'no')),
  satisfaction smallint check (satisfaction is null or satisfaction between 1 and 5),
  further_study text,
  comments text,
  submitted_at timestamptz not null default now(),
  unique (student_id, survey_year)
);

create index if not exists career_surveys_year_idx on public.career_surveys (survey_year);
create index if not exists career_surveys_student_idx on public.career_surveys (student_id);

alter table public.career_surveys enable row level security;

grant select, insert, update, delete on public.career_surveys to authenticated;
grant all on public.career_surveys to service_role;

drop policy if exists "Students manage own career surveys" on public.career_surveys;
create policy "Students manage own career surveys"
  on public.career_surveys
  for all
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "Campus staff read career surveys" on public.career_surveys;
create policy "Campus staff read career surveys"
  on public.career_surveys
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.campus_staff cs
      where cs.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'university')
    )
  );

notify pgrst, 'reload schema';
