-- Allow the full IoBM CDC staff set. Live DB previously only accepted director, advisor, dean.
alter table public.campus_staff
  drop constraint if exists campus_staff_staff_role_check;

alter table public.campus_staff
  add constraint campus_staff_staff_role_check
  check (staff_role in ('director', 'advisor', 'dean', 'coordinator', 'faculty', 'auditor'));
