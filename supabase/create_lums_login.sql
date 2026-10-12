-- Test career-office login for the university that already has the most students.
-- If this fails with: invalid input value for enum user_role: "university"
-- run supabase/add_university_role.sql by itself, then run this file again.

-- Signup may store a career-office role. Anything else still becomes a student.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := lower(coalesce(new.raw_user_meta_data->>'role', 'student'));
  if v_role not in ('student', 'recruiter', 'university') then
    v_role := 'student';
  end if;

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    v_role::user_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Clients still cannot change their own role. The SQL editor and service role can.
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is not distinct from new.role then
    return new;
  end if;

  if auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if new.role = 'admin' or old.role = 'admin' then
    raise exception 'admin role cannot be changed from the client';
  end if;

  if old.role = 'student' and new.role = 'recruiter' and new.id = auth.uid() then
    return new;
  end if;

  raise exception 'role cannot be changed';
end;
$$;

do $login$
declare
  v_uni text;
  v_id uuid;
  v_email text := 'lums.career@swypejobs.app';
begin
  select sp.university into v_uni
  from public.student_profiles sp
  where sp.university is not null and length(trim(sp.university)) > 0
  group by sp.university
  order by count(*) desc
  limit 1;

  if v_uni is null then
    raise exception 'No university found on student profiles';
  end if;

  select id into v_id from auth.users where lower(email) = v_email;

  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt('LumsOffice!2026', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', 'LUMS Career Office',
        'role', 'university',
        'university', v_uni,
        'staff_role', 'director'
      ),
      now(), now(),
      '', '', '', '', '', '', '', '',
      false, false
    );
  else
    update auth.users
    set
      encrypted_password = extensions.crypt('LumsOffice!2026', extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'full_name', 'LUMS Career Office',
        'role', 'university',
        'university', v_uni,
        'staff_role', 'director'
      ),
      updated_at = now()
    where id = v_id;
  end if;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  select
    gen_random_uuid(),
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_id::text,
    now(), now(), now()
  where not exists (
    select 1 from auth.identities i where i.user_id = v_id and i.provider = 'email'
  );

  -- Signup creates a student profile, and trg_profiles_guard_role blocks the role change.
  execute 'alter table public.profiles disable trigger trg_profiles_guard_role';
  insert into public.profiles (id, role, full_name)
  values (v_id, 'university', 'LUMS Career Office')
  on conflict (id) do update
  set role = excluded.role, full_name = excluded.full_name;
  execute 'alter table public.profiles enable trigger trg_profiles_guard_role';

  insert into public.campus_staff (user_id, university, staff_role)
  values (v_id, v_uni, 'director')
  on conflict (user_id) do update
  set university = excluded.university, staff_role = excluded.staff_role;
end
$login$;
