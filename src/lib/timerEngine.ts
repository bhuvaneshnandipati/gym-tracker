/**
 * Pure, timestamp-based timer logic for the Timer feature.
 *
 * Nothing in here counts ticks. Every timer stores *when* it started (or when it
 * will end) as an epoch timestamp plus the time already banked before the last
 * pause. The remaining/elapsed time is then derived from `now` on demand, so a
 * throttled background tab, a sleeping phone or a full page reload never makes a
 * timer drift — the next read simply computes the correct value.
 *
 * `Date.now()` is used rather than `performance.now()` because the state is
 * persisted to localStorage: `performance.now()` restarts from zero on every
 * page load, so it cannot describe a moment that happened before a refresh.
 *
 * Every function takes `now` explicitly, which keeps the module side-effect free
 * and lets the tests drive time deterministically.
 */

// ---------------------------------------------------------------- constants

export const SECOND = 1000;

/** Quick rest presets, in seconds. */
export const REST_PRESETS_SEC = [30, 60, 90, 120, 180] as const;

/** Step used by the +15s / −15s buttons. */
export const REST_ADJUST_SEC = 15;

export const DEFAULT_REST_SEC = 90;

/** Longest rest the custom input accepts (60 minutes). */
export const MAX_REST_SEC = 60 * 60;

/** Bounds for interval settings. */
export const INTERVAL_LIMITS = {
  phaseSec: { min: 0, max: 60 * 60 },
  workSec: { min: 1, max: 60 * 60 },
  rounds: { min: 1, max: 99 },
} as const;

/** Bump when the persisted shape changes; older payloads are discarded. */
export const TIMER_STATE_VERSION = 1;

// -------------------------------------------------------------------- types

export type RestStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface RestState {
  status: RestStatus;
  /** Length of the countdown as it was started (plus any ± adjustments). */
  durationMs: number;
  /** Epoch ms when the countdown reaches zero. Set only while running. */
  endsAt: number | null;
  /** Time left when paused. Set only while paused. */
  remainingMs: number | null;
  /** The last length the user picked; reused by the one-tap set button. */
  lastDurationMs: number;
  /** Epoch ms the countdown hit zero (set once finished). */
  finishedAt: number | null;
}

export type StopwatchStatus = 'idle' | 'running' | 'paused';

export interface StopwatchState {
  status: StopwatchStatus;
  /** Epoch ms the current running stretch began. Set only while running. */
  runningSince: number | null;
  /** Time banked from earlier running stretches (i.e. before the last pause). */
  accumulatedMs: number;
  /** Epoch ms of the very first start — used to fill a workout's start time. */
  firstStartedAt: number | null;
  /** Saved workout this session belongs to, once the editor has linked it. */
  linkedWorkoutId: string | null;
}

export interface IntervalConfig {
  warmupSec: number;
  workSec: number;
  restSec: number;
  rounds: number;
  cooldownSec: number;
}

export type IntervalStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface IntervalState {
  status: IntervalStatus;
  config: IntervalConfig;
  runningSince: number | null;
  accumulatedMs: number;
  finishedAt: number | null;
}

export interface TimerSettings {
  sound: boolean;
  vibration: boolean;
}

export interface TimerState {
  version: typeof TIMER_STATE_VERSION;
  rest: RestState;
  stopwatch: StopwatchState;
  interval: IntervalState;
  settings: TimerSettings;
}

export type PhaseKind = 'warmup' | 'work' | 'rest' | 'cooldown';

export interface IntervalSegment {
  kind: PhaseKind;
  /** 1-based round number (0 for warm-up / cool-down). */
  round: number;
  startMs: number;
  durationMs: number;
}

export interface IntervalSnapshot {
  status: IntervalStatus;
  /** Index into the segment list, or -1 once finished / when idle. */
  segmentIndex: number;
  segment: IntervalSegment | null;
  /** Time left in the current segment. */
  segmentRemainingMs: number;
  elapsedMs: number;
  totalMs: number;
  totalRounds: number;
}

/** A sound that should play at a point in time (used to pre-schedule audio). */
export type CueKind = 'tick' | 'warmup' | 'work' | 'rest' | 'cooldown' | 'done' | 'restDone';

export interface Cue {
  at: number;
  kind: CueKind;
}

// ------------------------------------------------------------------ helpers

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Whole seconds for display, rounding *up* so a countdown shows 1 until it really ends. */
export function ceilSeconds(ms: number): number {
  return Math.max(0, Math.ceil(ms / SECOND - 1e-9));
}

/** Whole seconds for an elapsed display (rounds down). */
export function floorSeconds(ms: number): number {
  return Math.max(0, Math.floor(ms / SECOND));
}

/** "1:05", "12:00", "1:02:03". */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Screen-reader friendly duration: "1 minute 30 seconds". */
export function spokenDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  const parts: string[] = [];
  if (h) parts.push(part(h, 'hour'));
  if (m) parts.push(part(m, 'minute'));
  if (sec || parts.length === 0) parts.push(part(sec, 'second'));
  return parts.join(' ');
}

/** Short preset label: 30s, 60s, 90s, 2m, 3m. */
export function presetLabel(sec: number): string {
  return sec >= 120 && sec % 60 === 0 ? `${sec / 60}m` : `${sec}s`;
}

export const PHASE_LABELS: Record<PhaseKind, string> = {
  warmup: 'Warm-up',
  work: 'Work',
  rest: 'Rest',
  cooldown: 'Cool-down',
};

// ------------------------------------------------------------ initial state

export const DEFAULT_INTERVAL_CONFIG: IntervalConfig = {
  warmupSec: 0,
  workSec: 40,
  restSec: 20,
  rounds: 8,
  cooldownSec: 0,
};

export function createInitialTimerState(): TimerState {
  return {
    version: TIMER_STATE_VERSION,
    rest: {
      status: 'idle',
      durationMs: DEFAULT_REST_SEC * SECOND,
      endsAt: null,
      remainingMs: null,
      lastDurationMs: DEFAULT_REST_SEC * SECOND,
      finishedAt: null,
    },
    stopwatch: {
      status: 'idle',
      runningSince: null,
      accumulatedMs: 0,
      firstStartedAt: null,
      linkedWorkoutId: null,
    },
    interval: {
      status: 'idle',
      config: { ...DEFAULT_INTERVAL_CONFIG },
      runningSince: null,
      accumulatedMs: 0,
      finishedAt: null,
    },
    settings: { sound: true, vibration: true },
  };
}

// --------------------------------------------------------------- rest timer

export function restRemainingMs(rest: RestState, now: number): number {
  switch (rest.status) {
    case 'running':
      return Math.max(0, (rest.endsAt ?? now) - now);
    case 'paused':
      return Math.max(0, rest.remainingMs ?? 0);
    case 'finished':
      return 0;
    default:
      return rest.durationMs;
  }
}

export function startRest(rest: RestState, durationSec: number, now: number): RestState {
  const durationMs = clamp(Math.round(durationSec), 1, MAX_REST_SEC) * SECOND;
  return {
    ...rest,
    status: 'running',
    durationMs,
    endsAt: now + durationMs,
    remainingMs: null,
    lastDurationMs: durationMs,
    finishedAt: null,
  };
}

export function pauseRest(rest: RestState, now: number): RestState {
  if (rest.status !== 'running') return rest;
  return { ...rest, status: 'paused', remainingMs: restRemainingMs(rest, now), endsAt: null };
}

export function resumeRest(rest: RestState, now: number): RestState {
  if (rest.status !== 'paused') return rest;
  return { ...rest, status: 'running', endsAt: now + (rest.remainingMs ?? 0), remainingMs: null };
}

/**
 * Add (or with a negative delta, remove) time from a running or paused rest.
 * Taking off more than is left finishes the timer immediately.
 */
export function adjustRest(rest: RestState, deltaSec: number, now: number): RestState {
  if (rest.status !== 'running' && rest.status !== 'paused') return rest;
  const deltaMs = deltaSec * SECOND;
  const remaining = restRemainingMs(rest, now) + deltaMs;
  const durationMs = Math.max(SECOND, rest.durationMs + deltaMs);
  if (remaining <= 0) {
    return {
      ...rest,
      status: 'finished',
      durationMs,
      endsAt: null,
      remainingMs: null,
      finishedAt: now,
    };
  }
  const capped = Math.min(remaining, MAX_REST_SEC * SECOND);
  return rest.status === 'running'
    ? { ...rest, durationMs, endsAt: now + capped }
    : { ...rest, durationMs, remainingMs: capped };
}

export function resetRest(rest: RestState): RestState {
  return { ...rest, status: 'idle', endsAt: null, remainingMs: null, finishedAt: null };
}

/** Mark a running rest as finished once its end time has passed. */
export function settleRest(rest: RestState, now: number): RestState {
  if (rest.status === 'running' && rest.endsAt != null && now >= rest.endsAt) {
    return { ...rest, status: 'finished', endsAt: null, finishedAt: rest.endsAt };
  }
  return rest;
}

// ---------------------------------------------------------------- stopwatch

export function stopwatchElapsedMs(sw: StopwatchState, now: number): number {
  const live = sw.status === 'running' && sw.runningSince != null ? now - sw.runningSince : 0;
  return Math.max(0, sw.accumulatedMs + Math.max(0, live));
}

export function startStopwatch(sw: StopwatchState, now: number): StopwatchState {
  if (sw.status === 'running') return sw;
  return {
    ...sw,
    status: 'running',
    runningSince: now,
    firstStartedAt: sw.firstStartedAt ?? now,
  };
}

export function pauseStopwatch(sw: StopwatchState, now: number): StopwatchState {
  if (sw.status !== 'running') return sw;
  return {
    ...sw,
    status: 'paused',
    accumulatedMs: stopwatchElapsedMs(sw, now),
    runningSince: null,
  };
}

export function resetStopwatch(): StopwatchState {
  return {
    status: 'idle',
    runningSince: null,
    accumulatedMs: 0,
    firstStartedAt: null,
    linkedWorkoutId: null,
  };
}

// ----------------------------------------------------------- interval timer

export function sanitizeIntervalConfig(config: Partial<IntervalConfig>): IntervalConfig {
  const base = DEFAULT_INTERVAL_CONFIG;
  const int = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return {
    warmupSec: clamp(int(config.warmupSec, base.warmupSec), 0, INTERVAL_LIMITS.phaseSec.max),
    workSec: clamp(int(config.workSec, base.workSec), 1, INTERVAL_LIMITS.workSec.max),
    restSec: clamp(int(config.restSec, base.restSec), 0, INTERVAL_LIMITS.phaseSec.max),
    rounds: clamp(int(config.rounds, base.rounds), 1, INTERVAL_LIMITS.rounds.max),
    cooldownSec: clamp(int(config.cooldownSec, base.cooldownSec), 0, INTERVAL_LIMITS.phaseSec.max),
  };
}

/**
 * Expand a config into an ordered list of segments:
 * [warm-up] → work/rest × rounds (no rest after the final round) → [cool-down].
 * Zero-length phases are skipped.
 */
export function buildIntervalPlan(config: IntervalConfig): IntervalSegment[] {
  const segments: IntervalSegment[] = [];
  let cursor = 0;
  const push = (kind: PhaseKind, round: number, sec: number) => {
    if (sec <= 0) return;
    segments.push({ kind, round, startMs: cursor, durationMs: sec * SECOND });
    cursor += sec * SECOND;
  };
  push('warmup', 0, config.warmupSec);
  for (let r = 1; r <= config.rounds; r += 1) {
    push('work', r, config.workSec);
    if (r < config.rounds) push('rest', r, config.restSec);
  }
  push('cooldown', 0, config.cooldownSec);
  return segments;
}

export function intervalTotalMs(config: IntervalConfig): number {
  const plan = buildIntervalPlan(config);
  const last = plan[plan.length - 1];
  return last ? last.startMs + last.durationMs : 0;
}

export function intervalElapsedMs(state: IntervalState, now: number): number {
  const live =
    state.status === 'running' && state.runningSince != null ? now - state.runningSince : 0;
  return Math.max(0, state.accumulatedMs + Math.max(0, live));
}

export function intervalSnapshot(state: IntervalState, now: number): IntervalSnapshot {
  const plan = buildIntervalPlan(state.config);
  const totalMs = intervalTotalMs(state.config);
  const elapsedMs = Math.min(intervalElapsedMs(state, now), totalMs);
  const base = { totalMs, totalRounds: state.config.rounds, elapsedMs };

  if (state.status === 'idle') {
    return {
      ...base,
      status: 'idle',
      segmentIndex: -1,
      segment: plan[0] ?? null,
      segmentRemainingMs: plan[0]?.durationMs ?? 0,
      elapsedMs: 0,
    };
  }
  if (state.status === 'finished' || elapsedMs >= totalMs) {
    return { ...base, status: 'finished', segmentIndex: -1, segment: null, segmentRemainingMs: 0 };
  }

  const index = plan.findIndex((s) => elapsedMs < s.startMs + s.durationMs);
  const segment = plan[index];
  return {
    ...base,
    status: state.status,
    segmentIndex: index,
    segment,
    segmentRemainingMs: segment.startMs + segment.durationMs - elapsedMs,
  };
}

export function startInterval(config: IntervalConfig, now: number): IntervalState {
  return {
    status: 'running',
    config: sanitizeIntervalConfig(config),
    runningSince: now,
    accumulatedMs: 0,
    finishedAt: null,
  };
}

export function pauseInterval(state: IntervalState, now: number): IntervalState {
  if (state.status !== 'running') return state;
  return {
    ...state,
    status: 'paused',
    accumulatedMs: intervalElapsedMs(state, now),
    runningSince: null,
  };
}

export function resumeInterval(state: IntervalState, now: number): IntervalState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running', runningSince: now };
}

export function resetInterval(state: IntervalState): IntervalState {
  return { ...state, status: 'idle', runningSince: null, accumulatedMs: 0, finishedAt: null };
}

/** Skip straight to the start of the next segment (or finish on the last one). */
export function skipIntervalSegment(state: IntervalState, now: number): IntervalState {
  if (state.status !== 'running' && state.status !== 'paused') return state;
  const snap = intervalSnapshot(state, now);
  if (!snap.segment) return state;
  const target = snap.segment.startMs + snap.segment.durationMs;
  const accumulatedMs = Math.min(target, snap.totalMs);
  if (accumulatedMs >= snap.totalMs) {
    return { ...state, status: 'finished', runningSince: null, accumulatedMs, finishedAt: now };
  }
  return state.status === 'running'
    ? { ...state, accumulatedMs, runningSince: now }
    : { ...state, accumulatedMs };
}

export function settleInterval(state: IntervalState, now: number): IntervalState {
  if (state.status !== 'running') return state;
  const totalMs = intervalTotalMs(state.config);
  const elapsed = intervalElapsedMs(state, now);
  if (elapsed < totalMs) return state;
  const finishedAt = (state.runningSince ?? now) + (totalMs - state.accumulatedMs);
  return { ...state, status: 'finished', runningSince: null, accumulatedMs: totalMs, finishedAt };
}

// --------------------------------------------------------------------- cues

/**
 * Upcoming sounds for a running interval session, as absolute timestamps.
 * Each segment boundary gets a phase cue (or "done" at the very end), preceded
 * by 3-2-1 ticks. Cues already in the past are dropped.
 */
export function intervalCues(state: IntervalState, now: number): Cue[] {
  if (state.status !== 'running' || state.runningSince == null) return [];
  const origin = state.runningSince - state.accumulatedMs; // epoch ms of elapsed = 0
  const plan = buildIntervalPlan(state.config);
  const cues: Cue[] = [];
  plan.forEach((seg, i) => {
    const end = seg.startMs + seg.durationMs;
    // 3-2-1 ticks before the boundary, never earlier than the segment's start.
    for (let n = 3; n >= 1; n -= 1) {
      const at = end - n * SECOND;
      if (at > seg.startMs) cues.push({ at: origin + at, kind: 'tick' });
    }
    const next = plan[i + 1];
    cues.push({ at: origin + end, kind: next ? next.kind : 'done' });
  });
  return cues.filter((c) => c.at >= now - 50);
}

export function restCues(rest: RestState, now: number): Cue[] {
  if (rest.status !== 'running' || rest.endsAt == null || rest.endsAt < now - 50) return [];
  return [{ at: rest.endsAt, kind: 'restDone' }];
}

// -------------------------------------------------------------- persistence

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const numOr = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;

/**
 * Parse persisted JSON defensively. Anything malformed falls back to defaults
 * field-by-field so one bad value never wipes the rest of the state.
 */
export function parseTimerState(raw: string | null): TimerState {
  const fallback = createInitialTimerState();
  if (!raw) return fallback;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!isObj(data) || data.version !== TIMER_STATE_VERSION) return fallback;

  const r = isObj(data.rest) ? data.rest : {};
  const sw = isObj(data.stopwatch) ? data.stopwatch : {};
  const iv = isObj(data.interval) ? data.interval : {};
  const st = isObj(data.settings) ? data.settings : {};

  const rest: RestState = {
    status: oneOf(r.status, ['idle', 'running', 'paused', 'finished'] as const, 'idle'),
    durationMs: numOr(r.durationMs, fallback.rest.durationMs),
    endsAt: numOrNull(r.endsAt),
    remainingMs: numOrNull(r.remainingMs),
    lastDurationMs: numOr(r.lastDurationMs, fallback.rest.lastDurationMs),
    finishedAt: numOrNull(r.finishedAt),
  };
  if (rest.status === 'running' && rest.endsAt == null) rest.status = 'idle';
  if (rest.status === 'paused' && rest.remainingMs == null) rest.status = 'idle';

  const stopwatch: StopwatchState = {
    status: oneOf(sw.status, ['idle', 'running', 'paused'] as const, 'idle'),
    runningSince: numOrNull(sw.runningSince),
    accumulatedMs: Math.max(0, numOr(sw.accumulatedMs, 0)),
    firstStartedAt: numOrNull(sw.firstStartedAt),
    linkedWorkoutId: typeof sw.linkedWorkoutId === 'string' ? sw.linkedWorkoutId : null,
  };
  if (stopwatch.status === 'running' && stopwatch.runningSince == null) {
    stopwatch.status = stopwatch.accumulatedMs > 0 ? 'paused' : 'idle';
  }

  const interval: IntervalState = {
    status: oneOf(iv.status, ['idle', 'running', 'paused', 'finished'] as const, 'idle'),
    config: sanitizeIntervalConfig(isObj(iv.config) ? (iv.config as Partial<IntervalConfig>) : {}),
    runningSince: numOrNull(iv.runningSince),
    accumulatedMs: Math.max(0, numOr(iv.accumulatedMs, 0)),
    finishedAt: numOrNull(iv.finishedAt),
  };
  if (interval.status === 'running' && interval.runningSince == null) interval.status = 'paused';

  return {
    version: TIMER_STATE_VERSION,
    rest,
    stopwatch,
    interval,
    settings: {
      sound: typeof st.sound === 'boolean' ? st.sound : true,
      vibration: typeof st.vibration === 'boolean' ? st.vibration : true,
    },
  };
}

export function serializeTimerState(state: TimerState): string {
  return JSON.stringify(state);
}

// ------------------------------------------------------------------ reducer

export type TimerAction =
  | { type: 'rest/start'; durationSec: number; now: number }
  | { type: 'rest/pause'; now: number }
  | { type: 'rest/resume'; now: number }
  | { type: 'rest/adjust'; deltaSec: number; now: number }
  | { type: 'rest/reset' }
  | { type: 'stopwatch/start'; now: number }
  | { type: 'stopwatch/pause'; now: number }
  | { type: 'stopwatch/reset' }
  | { type: 'stopwatch/link'; workoutId: string }
  | { type: 'interval/configure'; config: Partial<IntervalConfig> }
  | { type: 'interval/start'; now: number }
  | { type: 'interval/pause'; now: number }
  | { type: 'interval/resume'; now: number }
  | { type: 'interval/skip'; now: number }
  | { type: 'interval/reset' }
  | { type: 'settings/set'; settings: Partial<TimerSettings> }
  | { type: 'settle'; now: number }
  | { type: 'hydrate'; state: TimerState };

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'rest/start':
      return { ...state, rest: startRest(state.rest, action.durationSec, action.now) };
    case 'rest/pause':
      return { ...state, rest: pauseRest(state.rest, action.now) };
    case 'rest/resume':
      return { ...state, rest: resumeRest(state.rest, action.now) };
    case 'rest/adjust':
      return { ...state, rest: adjustRest(state.rest, action.deltaSec, action.now) };
    case 'rest/reset':
      return { ...state, rest: resetRest(state.rest) };

    case 'stopwatch/start':
      return { ...state, stopwatch: startStopwatch(state.stopwatch, action.now) };
    case 'stopwatch/pause':
      return { ...state, stopwatch: pauseStopwatch(state.stopwatch, action.now) };
    case 'stopwatch/reset':
      return { ...state, stopwatch: resetStopwatch() };
    case 'stopwatch/link':
      if (state.stopwatch.linkedWorkoutId === action.workoutId) return state;
      return { ...state, stopwatch: { ...state.stopwatch, linkedWorkoutId: action.workoutId } };

    case 'interval/configure':
      if (state.interval.status === 'running' || state.interval.status === 'paused') return state;
      return {
        ...state,
        interval: {
          ...resetInterval(state.interval),
          config: sanitizeIntervalConfig({ ...state.interval.config, ...action.config }),
        },
      };
    case 'interval/start':
      return {
        ...state,
        interval: startInterval(state.interval.config, action.now),
      };
    case 'interval/pause':
      return { ...state, interval: pauseInterval(state.interval, action.now) };
    case 'interval/resume':
      return { ...state, interval: resumeInterval(state.interval, action.now) };
    case 'interval/skip':
      return { ...state, interval: skipIntervalSegment(state.interval, action.now) };
    case 'interval/reset':
      return { ...state, interval: resetInterval(state.interval) };

    case 'settings/set':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'settle': {
      const rest = settleRest(state.rest, action.now);
      const interval = settleInterval(state.interval, action.now);
      return rest === state.rest && interval === state.interval
        ? state
        : { ...state, rest, interval };
    }

    case 'hydrate':
      return action.state;

    default:
      return state;
  }
}
