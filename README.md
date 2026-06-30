# Gym Tracker

A production-ready gym workout tracker. Log every session, track strength
progress, and review your history from any device.

Built with **React 18 + TypeScript + Vite + Tailwind CSS**, deployable for
**$0/month** on **Vercel (Hobby)** + **Supabase (Free)**.

> **Status — All 7 milestones complete (v1.0.0).** A production-ready gym
> tracker: auth, full workout logging, dashboard, history, charts & progress
> analytics, body metrics, CSV/PDF export + import, offline (installable PWA),
> realtime sync, unit tests, vendor-split bundles, and deployment docs.
>
> **Backend setup is required to run the app** — see [`supabase/README.md`](./supabase/README.md)
> and apply migrations `0001`–`0004`.

---

## Tech stack

| Area       | Choice                                            |
| ---------- | ------------------------------------------------- |
| Framework  | React 18, TypeScript (strict), Vite               |
| Styling    | Tailwind CSS (class-based dark mode)              |
| Routing    | React Router v6                                    |
| Data/state | TanStack Query v5                                 |
| Forms      | React Hook Form + Zod                             |
| Charts     | Recharts                                          |
| Offline    | vite-plugin-pwa + persisted Query cache           |
| Testing    | Vitest                                            |
| Icons      | lucide-react                                       |
| Tooling    | ESLint 9 (flat config), Prettier                  |
| Backend    | Supabase (Auth + Postgres + RLS)                  |
| Hosting    | Vercel (frontend) + Supabase (backend)            |

---

## Prerequisites

- **Node.js 20+** (an `.nvmrc` is included — run `nvm use`)
- **npm 9+** (ships with Node 20)

---

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env      # Windows: copy .env.example .env

# 3. Start the dev server (opens http://localhost:5173)
npm run dev
```

Supabase credentials in `.env` are optional in Milestone 1 — the app runs
without them. They become required from Milestone 2.

### Available scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start the Vite dev server                    |
| `npm run build`        | Type-check and build for production          |
| `npm run preview`      | Preview the production build locally         |
| `npm run lint`         | Run ESLint                                   |
| `npm run lint:fix`     | Run ESLint with auto-fix                     |
| `npm run format`       | Format the codebase with Prettier            |
| `npm run format:check` | Check formatting without writing changes     |
| `npm run typecheck`    | Type-check without emitting output           |
| `npm test`             | Run the unit test suite (Vitest)             |
| `npm run test:watch`   | Run tests in watch mode                      |

---

## Project structure

```
gym-tracker/
├── public/                 # Static assets served as-is (favicon)
├── src/
│   ├── api/                # Data-access calls (populated from Milestone 2)
│   ├── assets/             # Imported images/fonts
│   ├── components/         # Reusable UI
│   │   └── ui/             # Primitive components (Button, Card, …)
│   ├── contexts/           # React context providers (ThemeContext)
│   ├── hooks/              # Reusable hooks (useTheme)
│   ├── layouts/            # Page shells (AppLayout)
│   ├── lib/                # App-wide config (env, navigation, theme init)
│   ├── pages/              # Route-level views
│   ├── services/           # Business logic (populated in later milestones)
│   ├── styles/             # Global stylesheet + Tailwind layers
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Pure helpers (cn)
│   ├── App.tsx             # Route table
│   └── main.tsx            # Entry point + providers
├── supabase/               # SQL schema & migrations (from Milestone 3)
├── .env.example            # Environment variable template
├── eslint.config.js        # ESLint flat config
├── tailwind.config.js      # Theme tokens (flame accent, iron neutrals)
├── vercel.json             # SPA rewrite for client-side routing
└── vite.config.ts          # Vite config + "@" alias to /src
```

The `@` alias maps to `src/` — import with `@/components/...` instead of
relative paths.

---

## Theming

Light, dark, and system themes are supported via Tailwind's class-based dark
mode. The preference is stored in `localStorage` and applied before first
paint to prevent flashing. Change it from **Settings → Appearance** or the
header toggle.

Brand tokens live in `tailwind.config.js`:

- **`flame`** — the orange accent for primary actions
- **`iron`** — warm graphite neutrals for surfaces and text

---

## Authentication

The app uses Supabase Auth with:

- **Email & password** sign up / sign in, with email confirmation support
- **Google** OAuth (enable the provider in Supabase to activate the button)
- **Forgot / reset password** via emailed recovery link
- **Remember me** — persistent (`localStorage`) vs session-only (`sessionStorage`)
- **Logout** from the header menu or Settings

All app routes are protected by `RequireAuth`; signed-out users are redirected to
`/login` and returned to their destination after signing in. Per-user data is
enforced at the database level with Row Level Security. See
[`supabase/README.md`](./supabase/README.md) for provider and redirect-URL setup.

---

## Logging workouts

The workout editor (`/workout/new`, and `/workout/:id/edit`) lets you:

- set the date (defaults to today), start/end time (duration auto-calculates), and notes;
- add exercises from a **searchable, category-grouped library** of 41 built-in
  movements, or create your own custom exercise (name, category, equipment);
- add unlimited sets per exercise with weight + reps, choose lbs/kg per exercise,
  and record per-exercise notes (machine settings, seat position, grip);
- duplicate, remove, and reorder exercises;
- copy the exercises and sets from your previous workout in one tap.

Data is stored across `workouts`, `workout_exercises` (a name/category snapshot so
library edits never rewrite history), and `sets`. Reads use a single nested
Supabase query; writes use a replace-children strategy on edit. Everything is
fetched and cached with TanStack Query.

---

## Dashboard, history & insights

The dashboard computes everything live from your logged sessions: total workouts,
current streak, this week / this month, average duration, total volume, most-used
and favorite exercises, your top estimated-1RM personal records, and recent
sessions. History lists every workout with full-text search (notes + exercises),
an exercise filter, a date range, and sorting (newest, oldest, longest, most
volume) — each row supports edit, duplicate, and delete. Tapping a workout opens
a detail view with a per-exercise set breakdown, per-exercise volume, and
estimated 1RM. All views share a single cached query.

---

## Charts & progress analytics

The Progress page renders with Recharts (theme-aware, lazy-loaded so it never
weighs down the initial bundle):

- **Workout frequency** — weekly or monthly bar chart
- **Volume over time** — area chart of per-session total volume
- **Workout duration** — line chart (sessions with start/end times)
- **PR timeline** — running best estimated 1RM for the selected exercise
- **Exercise progress** — pick any movement and chart top weight, estimated
  1RM, volume, or total reps over time, with summary stats (sessions, PR, best
  1RM, average weight, average reps, total volume)

Estimated 1RM uses the Epley formula. All analytics are derived client-side from
the same cached workout query used elsewhere.

---

## Body metrics, data export & offline

- **Body metrics** — log body weight, body-fat %, chest, waist, arms, thighs,
  and calories (one entry per day, upserted), with a metric-selectable trend
  chart and a full history table.
- **Export** — download all workouts as **CSV** or a formatted **PDF**
  (jsPDF/html2canvas load only when you export, never in the initial bundle).
- **Import** — load workouts from a CSV in the same export format.
- **Offline** — the app is an installable **PWA**; the app shell is precached by
  a service worker and the query cache is persisted, so previously-loaded data
  works offline. Edits made while offline are paused and replay automatically on
  reconnect (an offline banner shows the current state).
- **Realtime** — Supabase channels invalidate the relevant queries so changes
  made on another device appear here live.
- **Toasts** — lightweight notifications for saves, exports, and imports.

---

## Testing & performance

- **Unit tests** (Vitest) cover the core pure-function utilities — volume and
  estimated-1RM math, streak logic, dashboard aggregation, progress analytics,
  and the CSV export/import round-trip. Run with `npm test`.
- **Code-splitting** keeps the initial app chunk small (~24 kB gzipped).
  Vendors (React, Supabase, TanStack Query, forms) are split into separate
  cacheable chunks; Recharts and the PDF libraries load only when their feature
  is used (the charts pages and PDF export are lazy-loaded).
- **PWA** precaches the app shell; the query cache is persisted for offline use.
- **Accessibility**: skip-to-content link, visible keyboard focus, labelled
  controls, and reduced-motion support.

### Production checklist

1. Apply migrations `0001`–`0004` in Supabase; confirm Realtime is enabled.
2. Configure Auth providers and redirect URLs (see `supabase/README.md`).
3. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_NAME` in Vercel.
4. Deploy; verify sign-in, logging a workout, charts, export/import, and the
   installable PWA.

---

## Deployment

### Frontend — Vercel (Hobby)

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Vercel auto-detects Vite. Confirm:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Add environment variables (from Milestone 2 onward):
   - `VITE_APP_NAME`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. **Deploy.** The included `vercel.json` rewrites all routes to `index.html`
   so client-side routing works on refresh and deep links.

### Backend — Supabase (Free)

Configured in Milestone 2. You'll create a project, copy the API URL and anon
key into your environment variables, then apply the SQL schema from
`supabase/` (added in Milestone 3).

---

## Git

```bash
git init
git add .
git commit -m "Milestone 1: project scaffold, theming, routing, app shell"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`.env` is git-ignored — never commit secrets. Share `.env.example` instead.

---

## Roadmap

1. **Milestone 1 — Scaffold, theming, routing, app shell** ✅
2. **Milestone 2 — Supabase, auth, protected routes** ✅
3. **Milestone 3 — Database schema, workout & exercise CRUD, entry page** ✅
4. **Milestone 4 — Dashboard, history, search, filters, detail view** ✅
5. **Milestone 5 — Charts, analytics, progress, PRs** ✅
6. **Milestone 6 — Body metrics, CSV/PDF, offline, realtime** ✅
7. **Milestone 7 — Polish, performance, testing, deployment, docs** ✅
