-- Allow platform admins to update recruiter_profiles (approve / revoke).
-- Browser client updates previously failed silently under RLS (0 rows, no error).
-- App also approves via /api/admin/employers (service role) as a hard guarantee.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "Admins can update recruiter profiles" on public.recruiter_profiles;
create policy "Admins can update recruiter profiles"
  on public.recruiter_profiles
  for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
