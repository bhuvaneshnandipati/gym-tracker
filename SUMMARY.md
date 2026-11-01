# Summary: Offline-first with manual "Sync to cloud" (v1.3.0)

**Request:** make the gym tracker work completely offline, and only write to the database when the user presses "Sync to cloud". No automatic syncing.

## Decisions confirmed with the owner
- **Sign-in:** still required. Sign in once online. A remembered sign-in then works offline.
- **Sync:** two-way. Upload local changes, then download changes from other devices.
- **Conflicts:** this device wins.
- **Automatic activity:** all removed (realtime, reconnect refetch, profile loads on startup).

## What was delivered
- **On-device store** (IndexedDB, falls back to localStorage), kept per user, with a queue of local edits and deletions. All screens read and write it, and nothing touches the network.
- **Sync to cloud** button in the top bar with a pending-changes badge, plus a **Cloud sync** card in Settings (pending count, last synced, copy sync log).
- **Sync engine:** maps exercise ids, uploads deletions, custom exercises, body metrics and workouts, then downloads and merges. Failed items stay queued for the next sync. Edits made during a sync are kept.
- **Bundled exercise library**, so the picker works offline before the first sync.
- **Offline sign-in:** the app opens offline even when the 1-hour access token has expired. The profile is cached, and sign-out works offline.
- **First-run banner** on a device that has never synced. The offline banner now says data is saved on the device.
- Removed realtime sync, the persisted query cache and two unused packages (`@tanstack/query-sync-storage-persister`, `@tanstack/react-query-persist-client`).
- **Bug fix (existing):** the first auto-save in the editor sent you to the workout detail page partway through logging. It now stays in the editor (`/workout/:id/edit`).
- Docs: `OFFLINE_SYNC.md`, README, `supabase/README.md`, `BUILD_LOG.txt`. Version is 1.3.0 in `package.json` and Settings.
- **No database migration.**

## Verification
| Check | Result |
| --- | --- |
| `npm test` | 111 passed (15 new in `src/lib/cloudSync.test.ts`) |
| `npm run build` (`tsc -b` + Vite + PWA) | Pass |
| `npm run lint` | 0 problems |
| `npm run format:check` | Pass |
| Playwright on the production build, Supabase mocked | 12/12: opens with an expired token while Supabase is unreachable, logs a workout, saves on the device, survives a reload, **no database requests until Sync**, sync uploads with the real exercise id, badge and banner clear, no page errors |

## Open items
- Not tested against a live Supabase project. The REST calls match the existing schema and RLS: upserts by `id`, and body metrics upsert on `user_id,date`.
- The sidebar footer still shows "v0.1.0". This was already the case and is unchanged.

---

# Follow-up: timer notifications not always arriving (B + C)

**Cause:** the "Rest finished" notification was triggered by the page's own timer, and only if the app was in the background at that exact moment. Phones pause background pages (locked screen or another app), so the timer never ran. When you came back, the app was on screen, so it skipped the notification.

## What was delivered
- **B. Backup timer in the service worker.** When a rest starts, is adjusted, paused or reset, the page sends the end time to the service worker, which shows the notification on time even if the page is paused or closed. It stays quiet when the app is on screen. A shared id prevents duplicates.
- **C. Reliability fixes.**
  - A **Send test notification (10s)** button in Timer, Alerts. Lock the phone and check it arrives.
  - Permission is re-checked when you return to the app. If it was removed in phone settings, the card says so and the toggle shows off.
  - If you come back after rest ended while the page was paused, a toast says "Rest finished 1m 20s ago".
- **Bug fix in the offline change.** With a saved sign-in and no connection, the app took about 25 s to open, and never opened if the connection hung. It now opens from the saved sign-in in about 0.25 s, and Supabase checks the session in the background.

## Verification
| Check | Result |
| --- | --- |
| `npm test` | 115 passed (4 new in `src/lib/timerNotify.test.ts`) |
| Build, lint, format | Pass |
| Playwright with the real service worker (production build) | 10/10: notification arrives with the page closed, shown once, quiet while on screen, cancelled on pause, late-return toast, test button works with the page closed, revoked permission shown, no errors |
| Playwright offline-sync suite (rerun) | 12/12 |
| Startup with Supabase unreachable / hanging | 0.25 s / 0.27 s (was 25 s / never) |
| Signed-out visitor | Redirected to login |

## Limits
- Browsers keep the service worker alive for a few minutes. Expect reliable alerts on Android Chrome for rests up to about 5 minutes.
- On iPhone, alerts need the app on the Home Screen, and iOS stops the worker quickly, so this helps less there.
- Battery saver, "Do not disturb", or force-closing the browser can still hold notifications back.
