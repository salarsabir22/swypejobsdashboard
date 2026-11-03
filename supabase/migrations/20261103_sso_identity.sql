-- Durable campus SSO identity (SAML NameID / OIDC sub / Google sub).
-- Service role bypasses RLS. App access goes through /api/campus/sso and /api/scim.

create table if not exists public.sso_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  subject text not null,
  email text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'deprovisioned')),
  affiliation text
    check (affiliation is null or affiliation in ('student', 'alumni', 'faculty')),
  university text not null default 'Institute of Business Management (IoBM), Karachi',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, subject)
);

create index if not exists sso_identities_user_id_idx on public.sso_identities (user_id);
create index if not exists sso_identities_email_idx on public.sso_identities (lower(email));
create index if not exists sso_identities_status_idx on public.sso_identities (status);

create table if not exists public.sso_role_conflicts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text,
  existing_role text,
  requested_portal text,
  requested_role text,
  subject text,
  provider text,
  status text not null default 'open'
    check (status in ('open', 'merged', 'overridden', 'dismissed')),
  keep_user_id uuid,
  absorb_user_id uuid,
  resolved_by uuid,
  resolved_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists sso_role_conflicts_open_idx
  on public.sso_role_conflicts (status, created_at desc);

alter table public.sso_identities enable row level security;
alter table public.sso_role_conflicts enable row level security;

notify pgrst, 'reload schema';
