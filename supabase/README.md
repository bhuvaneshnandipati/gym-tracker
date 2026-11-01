# Supabase setup

This folder holds the backend configuration for Gym Tracker. The Supabase
client lives in `src/lib/supabase.ts`; SQL migrations live in `migrations/`.

## 1. Create a project

1. Sign in at [supabase.com](https://supabase.com) and create a free project.
2. Open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`
3. Put both in your `.env` (and in Vercel's environment variables for deploys).

## 2. Apply the database migrations

In the Supabase dashboard, open **SQL Editor** and run every file in
`migrations/` in numeric order (see the index at the bottom). The first one,
`0001_profiles.sql`, creates:

- a `profiles` table (1:1 with `auth.users`),
- Row Level Security so each user only sees their own row,
- a trigger that creates a profile automatically on signup,
- an `updated_at` trigger.

> Prefer the CLI? With the [Supabase CLI](https://supabase.com/docs/guides/cli)
> linked to your project, run `supabase db push`.

## 3. Configure authentication

Under **Authentication → Providers / URL configuration**:

- **Email**: enabled by default. For local testing you can turn off
  "Confirm email" to skip the confirmation step.
- **Google**: enable the Google provider and paste your Google OAuth client ID
  and secret (from the Google Cloud Console). The app's button works
  automatically once this is on.
- **Redirect URLs**: add the URLs the app redirects back to, e.g.
  - `http://localhost:5173/auth/callback`
  - `http://localhost:5173/reset-password`
  - `https://your-app.vercel.app/auth/callback`
  - `https://your-app.vercel.app/reset-password`
- Set the **Site URL** to your deployed origin (e.g. `https://your-app.vercel.app`).

## Realtime

The app no longer uses Realtime: data stays on the device until you press
**Sync to cloud** (see `OFFLINE_SYNC.md`). Migration `0004` still adds
`workouts` and `body_metrics` to the `supabase_realtime` publication; that is
harmless and needs no change.

## How "Remember me" works

Sessions are stored in `localStorage` when "Remember me" is checked (persists
across browser restarts) and in `sessionStorage` when unchecked (cleared when
the tab closes). See `src/lib/supabase.ts`.

## Migrations index

| File                      | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `0001_profiles.sql`       | Profiles table, RLS, signup + updated_at triggers |
| `0002_workouts.sql`       | Exercises, workouts, workout_exercises, sets + RLS + indexes |
| `0003_seed_exercises.sql` | Built-in exercise library (idempotent seed)       |
| `0004_body_metrics.sql`   | Body metrics table + RLS + realtime publication   |
| `0005_exercise_metrics.sql` | Per-exercise tracking types + cardio/duration set columns |

Apply migrations in numeric order (0001 → 0005).
