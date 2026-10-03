# Gym Tracker

Track every gym session, log your sets, and watch your strength climb.

A mobile-first progressive web app built with **React 18, TypeScript, Vite, Tailwind CSS and Supabase**. Version **1.2.0**.

## Features

- **Workout logging.** Add exercises from a built-in library or your own. Each exercise records the right fields for its type: weight × reps, reps only, timed holds, or cardio (duration, distance, speed, incline, calories). Sets auto-save as you type and work offline.
- **Exercise intelligence.** Your previous session pre-fills new sets. Each set shows a trend badge (progress, maintaining or deload). There are live volume totals and per-exercise coaching notes.
- **Dashboard and history.** Streaks, weekly stats and recent sessions. Search and filter past workouts, then open, edit or delete them.
- **Progress analytics.** Charts per exercise (weight, volume, estimated 1RM, duration, distance), a personal-record timeline and training frequency.
- **Body metrics.** Track weight, body fat, measurements and calories over time.
- **Import and export.** CSV export and import, and a PDF report.
- **Accounts.** Email/password and Google sign-in, password reset and "remember me". Row Level Security keeps every user's data private.
- **Realtime sync** across devices.
- **Offline-ready PWA.** Installable, caches the app shell and your loaded data.
- **Light, dark and system themes,** keyboard and screen-reader friendly.

## Quick start

Requires **Node.js 20+** (see `.nvmrc`).

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev               # http://localhost:5173
```

Without Supabase credentials the app shows a setup screen instead of the login page.

### Supabase setup

1. Create a free project at [supabase.com](https://supabase.com) and copy the **Project URL** and **anon key** into `.env`.
2. In the SQL editor, run the migrations in `supabase/migrations/` **in numeric order** (`0001` → `0005`).
3. Configure the auth providers and redirect URLs.

Step-by-step details are in [`supabase/README.md`](supabase/README.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` / `npm run test:watch` | Run the Vitest unit tests once, or in watch mode |
| `npm run typecheck` | Type-check the app and config (`tsc -b`) |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |

## Project structure

```
src/
  api/          Supabase data access (workouts, exercises, body metrics)
  components/   UI: ui/ primitives, workout/, charts/, dashboard/, auth/
  contexts/     React context providers (auth, theme, toasts)
  data/         Static data (exercise coaching notes)
  hooks/        Data and behaviour hooks (TanStack Query, auto-save, drafts…)
  layouts/      App shell (sidebar, top bar, mobile nav)
  lib/          Domain logic and config (metrics, progress, env, Supabase client)
  pages/        Route components
  styles/       Tailwind entry and global styles
  types/        Shared TypeScript types
  utils/        Pure helpers (dates, numbers, CSV, PDF, stats)
supabase/       SQL migrations and backend setup guide
public/         PWA icons and favicon
```

The `@/` import alias points to `src/`.

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 18, React Router 6, Tailwind CSS 3, lucide-react icons |
| Data | Supabase (Postgres, Auth, Realtime), TanStack Query with persisted cache |
| Forms | react-hook-form + zod |
| Charts / export | Recharts, jsPDF, Papa Parse |
| Tooling | Vite 5, TypeScript (strict), ESLint 9, Prettier 3, Vitest 2, vite-plugin-pwa |

## Deployment

The app is set up for **Vercel**: `vercel.json` rewrites all routes to `index.html` for client-side routing.

1. Import the repo into Vercel (framework preset: Vite).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and optionally `VITE_APP_NAME`) as environment variables.
3. Add your production URL to Supabase's **Site URL** and **Redirect URLs**.

## Troubleshooting

Build notes, validation results and troubleshooting tips for each milestone are in [`BUILD_LOG.txt`](BUILD_LOG.txt).
