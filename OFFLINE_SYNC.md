# Offline mode and manual cloud sync

The app works fully offline. All data is stored on the device, and **nothing is sent to the database until you press "Sync to cloud"**.

## How to use it

1. Sign in once while you have internet. With "Remember me" on (the default), you stay signed in, even offline.
2. Log workouts, body metrics and custom exercises as normal. Everything saves on the device instantly. The editor shows **Saved on device**.
3. When you want to back up or share data with another device, press **Sync to cloud**:
   - in the top bar (the number badge shows how many changes are waiting), or
   - in **Settings → Cloud sync**, which also shows when you last synced.
4. On a new device, sign in and press **Sync to cloud** once to download your data. Until the first sync, a banner says the data is on this device only.

## What a sync does

| Step | What happens |
| --- | --- |
| 1. Line up exercise ids | The built-in exercise library ships with the app so it works before any sync. Its placeholder ids are matched by name to the database's built-in exercises. A new custom exercise with the same name as one already in your account takes that one's id. |
| 2. Upload | Deletions first, then custom exercises, body metrics and workouts. **This device wins**: its version overwrites the cloud copy. For body metrics (one per day), this device's entry for a date replaces the cloud one. |
| 3. Download | Everything in your account is downloaded and replaces the local copy, except records with local changes that haven't uploaded yet. Records deleted on another device are removed here. |

If one record fails to upload (for example the connection drops), it stays on the device, the badge still counts it, and it's retried on the next sync. Edits you make while a sync is running are kept and go up next time.

## What no longer happens automatically

- No realtime updates from other devices.
- No automatic upload or refetch when the connection comes back.
- No database reads when the app opens. The profile (name, default unit) is cached on the device and refreshed only right after signing in and on each sync.

Signing in and refreshing the sign-in token still use the internet when it's available. That is authentication, not data sync.

## Signing out

Unsynced changes stay on the device and come back when you sign in again on the same device. Settings asks you to confirm before signing out when changes are waiting. Signing out works offline. Signing back in needs internet.

## Limits

- **Remember me off:** the sign-in is cleared when the tab closes, so you need internet to sign in again. Data on the device is kept.
- **Clearing site data** in the browser deletes anything not yet synced.
- Each workout is uploaded as a few separate requests. If the connection drops part-way through, the workout stays queued, and the next sync rewrites it completely.
- "This device wins" applies to the whole record. If the same workout was edited on two devices between syncs, the device that syncs last decides the final version.

## Files

| File | Role |
| --- | --- |
| `src/lib/localStore.ts` | On-device store (IndexedDB, falls back to localStorage), change queue, per-user data |
| `src/lib/cloudSync.ts` | Sync engine: upload, download, merge, Supabase transport |
| `src/data/builtinExercises.ts` | Bundled built-in exercise library (mirrors migrations 0003/0005) |
| `src/api/workouts.ts`, `bodyMetrics.ts`, `exercises.ts` | Same functions as before, now reading and writing the local store |
| `src/hooks/useCloudSync.ts`, `src/hooks/useLocalData.ts` | Sync action and status for the UI |
| `src/components/sync/SyncButton.tsx` | "Sync to cloud" button with pending badge |
| `src/components/LocalDataGate.tsx` | Loads the user's local data before showing the app |
| `src/components/OfflineBanner.tsx` | Offline notice and first-sync prompt |
| `src/contexts/AuthProvider.tsx`, `src/lib/supabase.ts` | Offline sign-in, cached profile, offline sign-out |
| `src/lib/syncLogger.ts` | Debug log (Settings → Copy sync log) |
| `src/lib/cloudSync.test.ts` | 15 tests for the store and sync |

No database migration is needed.

## Troubleshooting

- **See what a sync did:** Settings → **Copy sync log**. In production, run `localStorage.setItem('gym-tracker:debug', 'sync')` in the browser console to also print the log there.
- **"Your sign-in has expired":** sign out and back in while online, then sync. Unsynced data is kept.
- **Inspect local data:** DevTools → Application → IndexedDB → `gym-tracker` → `state` → key `gym-tracker:local:<your user id>`.
