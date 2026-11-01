# Timer feature

Three timers for use during a session, available from the **Timer** tab (`/timer`):

| Mode | What it does |
| --- | --- |
| **Rest** | Countdown between sets. Presets 30s / 60s / 90s / 2m / 3m plus a custom time, −15s / +15s while running, pause/resume, stop. Sound + vibration when it ends. One-tap start from any set row in the workout editor. |
| **Stopwatch** | Total session time with start, pause, resume and reset. Keeps running across screens and page refreshes. When you save a new workout, its duration is taken from the stopwatch (paused time excluded). |
| **Intervals** | Work time, rest time, rounds, optional warm-up and cool-down. Shows the current phase, the round (e.g. 3/8) and the time left. A different sound for each phase, plus 3-2-1 countdown beeps. Pause, skip to the next phase, reset. |

No new dependencies were added. Sounds are generated with the Web Audio API, so there are no audio files.

---

## How to use it

### Rest timer
1. Open **Timer → Rest** and tap a preset, or enter minutes/seconds under *Custom time* and tap **Start**.
2. While it runs, use **−15s / +15s**, **pause** or **Stop**.
3. When it reaches zero you get three bright beeps, a vibration (on supported devices) and a screen-reader announcement. The readout shows *Rest finished — go lift!*.
4. **From a logged set:** in the workout editor, each set row has an hourglass button. One tap starts a rest using the **last rest length you picked** (90s by default).

### Workout stopwatch
- Start it from **Timer → Stopwatch**, or with **Start session timer** in the workout editor's session card.
- In a new workout, the session card shows the running time with Pause/Resume. *Start time* is filled from the stopwatch's first start if you left it empty.
- **Save workout** writes the stopwatch's active time (pauses excluded) as the workout's `duration_seconds`. It also fills an empty *End time* with the current time, then resets the stopwatch.
- When you re-open a workout whose saved duration came from the stopwatch, the editor shows *Duration: 52m (session timer)*. **Use start/end times** goes back to end − start.

### Interval / HIIT timer
1. Open **Timer → Intervals** and set Work, Rest, Rounds and optionally Warm-up / Cool-down (0 = off). The total time updates as you type.
2. Tap **Start intervals**. The order is: warm-up → work/rest × rounds (no rest after the last round) → cool-down.
3. Each phase has its own colour and sound:

   | Phase | Colour | Sound |
   | --- | --- | --- |
   | Warm-up | amber | rising tone |
   | Work | flame | sharp double beep |
   | Rest | green | long low tone |
   | Cool-down | sky | falling tone |
   | Finished | — | ascending three-note chime |
   | Last 3 s of every phase | — | short 3-2-1 beeps |

### While you're on other screens
A floating pill (bottom-left, above the nav) shows whichever timer is most relevant: rest → intervals → stopwatch. Tap it to open that timer's tab. A finished rest turns the pill green with a dismiss (×) button. The pill is hidden on the Timer page itself.

### Alerts
The **Alerts** card on the Timer page has four saved settings:

| Setting | Default | What it does |
| --- | --- | --- |
| Sound | On | Beeps described above. |
| Vibration | On | Buzzes on the same events. Greyed out where unsupported (iPhone Safari). |
| Keep screen on | On | Holds a screen wake lock while any timer runs, so the phone doesn't dim or lock mid-rest and the alert plays on time. Released as soon as nothing is running. No permission prompt. |
| Rest notifications | Off | When rest ends while you're in another app or tab, shows a system notification ("Rest finished — Time for your next set."). Turning it on asks for notification permission once. Tapping the notification brings the app back. The notification clears itself when you return. **Send test notification (10s)** lets you lock the phone and confirm it works. If permission is removed in phone settings, the card says so. |

---

## How it works

### Accuracy: timestamps, not ticks
Every timer stores **epoch timestamps** and derives the time left (or elapsed) from `Date.now()` each time it's read. Nothing counts ticks.

- Rest: `endsAt` while running, `remainingMs` while paused.
- Stopwatch / intervals: `runningSince` + `accumulatedMs` (time banked before the last pause).

So when a background tab is throttled, a phone screen sleeps or a page reloads, the next read is still exactly right. The 250 ms UI tick only triggers a re-render. A `visibilitychange` / `pageshow` / `focus` listener refreshes the display the moment the app comes back.

`Date.now()` is used rather than `performance.now()` on purpose: `performance.now()` restarts at 0 on every page load, so it can't describe a moment that happened before a refresh. The trade-off is that changing the device clock while a timer runs will shift it.

### Persistence
The whole timer state is saved to `localStorage` under `gym-tracker:timers` on every change, so a refresh resumes exactly where you were. Saving on change is enough because the state only changes on user actions and on phase or finish transitions, never per tick. Parsing is defensive and versioned (`version: 1`): corrupt or old data falls back to defaults field by field. A `storage` listener keeps several open tabs in sync, which also prevents double beeps.

### Sound and vibration
- Cues are **pre-scheduled on the Web Audio clock**, which keeps running when JS timers are throttled in background tabs. They're rebuilt whenever state changes (start, pause, ±15s, skip). Long interval sessions keep only a 5-minute window queued and top it up every minute.
- Browsers only allow audio after a user gesture. Every timer button unlocks audio, and after a reload the first tap anywhere does. Until then cues are deferred (never queued on a frozen clock) and scheduled as soon as audio is unlocked.
- Vibration fires when the UI notices a transition. It's skipped if the transition is noticed more than 5 s late (e.g. the phone was asleep), and before the user has interacted with the page, which browsers block.

### State management
This follows the existing context pattern (`theme-context.ts` + `ThemeProvider.tsx` + `useTheme`):

- `TimerProvider` sits once above the router in `main.tsx`, so timers survive route changes.
- It exposes **two contexts**:
  - `TimerActionsContext`: stable controls that never change identity. Set rows and the editor use it, so typing never re-renders on timer ticks.
  - `TimerStateContext`: live readings, used only by components that show time.
- All logic is a pure reducer plus helpers in `src/lib/timerEngine.ts`, unit-tested with injected `now`.

### Accessibility
- Readouts use `role="timer"` with an `aria-label` such as "Rest time remaining: 1 minute 30 seconds". Screen readers can read the value on demand without being flooded every second.
- A shared polite live region announces start, pause, ±15s, rest finished, each interval phase ("Rest, round 1 of 2. 20 seconds.") and session complete.
- Every icon-only control has an `aria-label`. Tabs follow the WAI-ARIA tabs pattern (arrow keys, Home/End). Sound and vibration are `role="switch"` toggles, presets use `aria-pressed`, and session progress is a `progressbar`.
- Controls are 56 px tall (`BigButton`), set-row buttons are 36 px (the same as the existing remove button), and everything matches the flame/iron palette in light and dark mode. Animations respect the app's existing `prefers-reduced-motion` rule.

### Keep screen on (Wake Lock)
`src/lib/wakeLock.ts` wraps the Screen Wake Lock API in a small controller. The provider asks for the lock whenever *a timer is running and Keep screen on is enabled*. Browsers drop the lock when the page is hidden, so the controller takes it again on `visibilitychange`. Requests already in flight are released if the lock stops being wanted, and duplicate requests are never stacked. It does nothing where the API is missing.

### Rest notifications
`src/lib/timerNotify.ts` shows the notification through the service worker registration when there is one. This is required on Android Chrome, where `new Notification()` from a page throws. Without a service worker (local dev) it falls back to the page API. 

**Backup timer in the service worker.** Phones pause a background page, so the page's own timer can miss the moment rest ends (the cause of missed notifications). When a rest starts, is adjusted, paused or reset, the page sends the end time to the service worker (`rest:schedule` / `rest:cancel` messages). The worker holds the timer with `event.waitUntil` and shows the notification itself unless an app window is visible. Browsers keep the worker alive for this for a few minutes, so it is reliable for rests up to about 5 minutes, best on Android Chrome. If the page is awake when rest ends while hidden, it waits 1.5 s and shows its own notification only if the worker didn't (both use the id `rest-<endsAt>`). If the page was paused and the user comes back after rest ended, an in-app toast says "Rest finished 1m 20s ago".

`public/sw-notifications.js` is pulled into the generated service worker via `workbox.importScripts` in `vite.config.ts`, and handles notification taps. It only *focuses* an open window, deliberately not navigating it, so an unsaved workout draft is never reloaded away.

### Debug logging
`src/lib/timerLogger.ts` provides a small logger with no new dependency:

- It always keeps the last 200 events in memory (`getTimerLog()`, `formatTimerLog()`).
- It prints `[timer] …` debug lines in development, or in production after you run `localStorage.setItem('gym-tracker:debug', 'timers')` in the console and reload.
- While debugging is on, `window.__gymTrackerTimerLog()` returns the buffer as text you can paste into an issue.
- Warnings and errors (storage or audio failures) always reach the console.
- Wake lock and notifications log `wakelock.acquired` / `wakelock.released` / `wakelock.request_failed` and `notify.permission` / `notify.worker_scheduled` / `notify.rest_done` / `notify.rest_done_skipped` / `notify.test_scheduled` / `notify.show_failed`.
- Logged events include every action (`rest/start`, `interval/skip`, …), transitions (`rest.finished`, `interval.phase` with `lateMs`), audio scheduling and unlocks, and `workout.saved_with_stopwatch`.

---

## Files changed

### New
| File | Purpose |
| --- | --- |
| `src/lib/timerEngine.ts` | Pure timestamp-based logic: rest / stopwatch / interval state, interval plan, sound cue times, persistence parsing, reducer. |
| `src/lib/timerEngine.test.ts` | 27 unit tests (accuracy after sleep, pause/resume, ±15s, interval phases and cues, persistence round-trip, corrupt data). |
| `src/lib/timerSound.ts` | Web Audio tones per phase, cue pre-scheduling, audio unlock, vibration patterns. |
| `src/lib/timerLogger.ts` | Debug logger described above. |
| `src/lib/workoutTimer.ts` | Links the stopwatch to the workout editor (which workout it belongs to, what to write on save). |
| `src/lib/workoutTimer.test.ts` | 11 tests: stopwatch → workout duration, edit round-trip, logger buffer. |
| `src/contexts/timer-context.ts` | Context types and storage key (no components, per the react-refresh convention in BUILD_LOG). |
| `src/contexts/TimerProvider.tsx` | State, clock tick, persistence, cross-tab sync, audio scheduling, announcements. |
| `src/hooks/useTimers.ts` | `useTimerState()` / `useTimerActions()`. |
| `src/pages/TimerPage.tsx` | Timer page with Rest / Stopwatch / Intervals tabs (`?mode=`) and Alerts settings. Lazy-loaded. |
| `src/components/timer/*` | `RestTimerPanel`, `StopwatchPanel`, `IntervalTimerPanel`, `TimerReadout` (ring + digits), `TimerControls` (`BigButton`, `Switch`), `MiniTimerPill`. |
| `src/components/workout/WorkoutSessionTimer.tsx` | Duration row in the editor, linked to the stopwatch. |
| `src/components/timer/TimerAlertsCard.tsx` | Sound / vibration / keep screen on / notifications settings, including the permission flow. |
| `src/lib/wakeLock.ts`, `src/lib/wakeLock.test.ts` | Wake lock controller and 5 tests (acquire/release, no stacking, re-acquire after the page is hidden, late grant, unsupported). |
| `src/lib/timerNotify.ts` | Permission request and watcher, worker scheduling, show/clear the rest-finished notification, test notification. |
| `public/sw-notifications.js` | Service-worker backup rest timer, and focusing the app when a notification is tapped. |

### Modified
| File | Change |
| --- | --- |
| `src/main.tsx` | Wraps the router in `TimerProvider`. |
| `src/App.tsx` | Adds the lazy `/timer` route. |
| `src/lib/navigation.ts`, `src/types/navigation.ts`, `src/components/MobileNav.tsx` | Adds Timer (third item). New `mobile?: false` flag on nav items; Settings is hidden from the phone bottom bar (still in the sidebar and the avatar menu). |
| `src/layouts/AppLayout.tsx` | Renders `MiniTimerPill`. |
| `src/components/workout/SetTable.tsx` | Hourglass "start rest" button on every set row (new grid column). |
| `src/hooks/useWorkoutDraft.ts` | `activeDurationSeconds` on the draft, `patchSession` action, keeps a stored stopwatch duration when editing. |
| `src/lib/workoutPayload.ts` | Saves `activeDurationSeconds` as `durationSeconds` when present, otherwise end − start as before. |
| `src/pages/WorkoutEditorPage.tsx` | Uses `WorkoutSessionTimer`. Links the stopwatch to the new workout id on first auto-save. On save, writes the stopwatch time and resets it. |
| `vite.config.ts` | `workbox.importScripts: ['sw-notifications.js']`. |
| `BUILD_LOG.txt` | Timer milestone entry. |

No database migration is needed: `workouts.duration_seconds` already exists.

---

## Known limitations
- **Phone locked by hand:** *Keep screen on* stops the phone locking itself, but if you press the power button, iOS (and some Android power modes) suspend the page, including audio, so a beep due while locked may not play. The timer is still correct the moment you return. Some battery-saver modes also refuse the wake lock.
- **Rest notifications** use the service-worker backup timer, which browsers keep alive for a few minutes: reliable on Android Chrome for rests up to about 5 minutes. Longer rests, battery saver, "Do not disturb" or the browser being force-closed can still hold one back. The web has no way to schedule an OS alarm. iPhone needs the app added to the Home Screen (iOS 16.4+), and you install it as a PWA.
- **Vibration** isn't available in iPhone Safari (no Web Vibration API).
- Changing the device clock while a timer runs shifts it (see *Accuracy*).
