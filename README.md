# swypejobs dashboard

Signed-in app for swypejobs. The public landing page stays in the Job-Match repo.

A Tinder-style job matching platform for students and recruiters — built with Next.js 14 (App Router) and Supabase.

## Features

- **Swipe-based matching** — Students swipe on jobs, recruiters swipe on candidates
- **Mutual matching** — Chat unlocks only when both sides swipe right (via Postgres trigger)
- **Real-time chat** — 1:1 messaging per match via Supabase Realtime
- **Community channels** — Interest-based group chats
- **Three roles** — Student, Recruiter, Admin
- **Admin dashboard** — Recruiter approvals, user management, channel moderation

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| State | TanStack Query, Zustand |
| Forms | React Hook Form + Zod |

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd esehi
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **anon public key**
3. Copy `.env.local.example` to `.env.local` and fill in your credentials

```bash
cp .env.local.example .env.local
```

### 3. Run database migrations

In the Supabase dashboard → **SQL Editor**, run the following files in order:

1. `supabase/migrations/001_schema.sql` — Tables, enums, triggers
2. `supabase/migrations/002_rls.sql` — Row Level Security policies
3. `supabase/migrations/003_storage.sql` — Storage buckets and policies

### 4. Enable Google OAuth (optional)

In Supabase → **Authentication** → **Providers** → enable Google and add your OAuth credentials.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  (auth)/           # Login, signup, onboarding
  (student)/        # Student dashboard (discover, matches, chat, profile)
  (recruiter)/      # Recruiter dashboard (jobs, discover, matches, profile)
  (admin)/          # Admin panel
  community/        # Community channels (shared)
components/
  ui/               # shadcn UI components
  swipe/            # Swipe card components
  chat/             # Chat window
  community/        # Channel chat
  nav/              # Bottom navigation
lib/
  supabase/         # Supabase client (browser + server)
  hooks/            # React hooks (toast)
supabase/
  migrations/       # SQL migration files
```

## How Matching Works

1. Student swipes right on a job → `job_swipes` row inserted
2. Recruiter swipes right on that student for that job → `candidate_swipes` row inserted
3. Postgres trigger fires → checks if both exist → creates `matches` + `conversations` rows
4. Both users get a notification and can now chat

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Server-only. Dashboard → Settings → API → Secret key (`sb_secret_...`) or legacy service_role JWT.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-or-secret-key
```

Use either the **publishable** key (`sb_publishable_...`) or the legacy **anon** JWT (`eyJ...`) from [Project Settings → API Keys](https://supabase.com/dashboard/project/_/settings/api-keys). For PostgREST (`/rest/v1`), this app removes non-JWT `Authorization` bearer values so publishable keys work (see `lib/supabase/fetch.ts`). Never expose the service role key in client code or `NEXT_PUBLIC_*` vars.
