create table if not exists public.international_opportunities (
  id uuid primary key default gen_random_uuid(),
  university text,
  kind text not null check (kind in ('study_abroad', 'exchange', 'dual_degree', 'scholarship')),
  title text not null,
  country text,
  organization text,
  summary text,
  eligibility text,
  visa_url text,
  apply_url text,
  deadline date,
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists international_opportunities_university_idx
  on public.international_opportunities (university, is_active);

alter table public.international_opportunities enable row level security;

grant select on public.international_opportunities to authenticated;
grant insert, update, delete on public.international_opportunities to authenticated;
grant all on public.international_opportunities to service_role;

drop policy if exists "Anyone authenticated can read international opportunities" on public.international_opportunities;
create policy "Anyone authenticated can read international opportunities"
  on public.international_opportunities
  for select
  to authenticated
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'university')
  ));

drop policy if exists "Campus staff write international opportunities" on public.international_opportunities;
create policy "Campus staff write international opportunities"
  on public.international_opportunities
  for all
  to authenticated
  using (
    exists (
      select 1 from public.campus_staff cs
      where cs.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'university')
    )
  )
  with check (
    exists (
      select 1 from public.campus_staff cs
      where cs.user_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'university')
    )
  );

notify pgrst, 'reload schema';
