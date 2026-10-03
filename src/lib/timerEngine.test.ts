import { describe, expect, it } from 'vitest';
import {
  adjustRest,
  buildIntervalPlan,
  ceilSeconds,
  createInitialTimerState,
  formatTimer,
  intervalCues,
  intervalSnapshot,
  intervalTotalMs,
  parseTimerState,
  pauseInterval,
  pauseRest,
  pauseStopwatch,
  presetLabel,
  restCues,
  restRemainingMs,
  resumeInterval,
  resumeRest,
  sanitizeIntervalConfig,
  serializeTimerState,
  settleInterval,
  settleRest,
  skipIntervalSegment,
  spokenDuration,
  startInterval,
  startRest,
  startStopwatch,
  stopwatchElapsedMs,
  timerReducer,
  type IntervalConfig,
} from '@/lib/timerEngine';

const T0 = 1_750_000_000_000; // arbitrary fixed epoch
const s = (n: number) => n * 1000;
const initial = () => createInitialTimerState();

describe('formatting', () => {
  it('formats clock strings', () => {
    expect(formatTimer(0)).toBe('0:00');
    expect(formatTimer(65)).toBe('1:05');
    expect(formatTimer(3723)).toBe('1:02:03');
  });

  it('rounds countdowns up so 0 only shows at the end', () => {
    expect(ceilSeconds(1)).toBe(1);
    expect(ceilSeconds(1000)).toBe(1);
    expect(ceilSeconds(1001)).toBe(2);
    expect(ceilSeconds(0)).toBe(0);
    expect(ceilSeconds(-50)).toBe(0);
  });

  it('builds spoken durations and preset labels', () => {
    expect(spokenDuration(90)).toBe('1 minute 30 seconds');
    expect(spokenDuration(60)).toBe('1 minute');
    expect(spokenDuration(1)).toBe('1 second');
    expect(spokenDuration(0)).toBe('0 seconds');
    expect([30, 60, 90, 120, 180].map(presetLabel)).toEqual(['30s', '60s', '90s', '2m', '3m']);
  });
});

describe('rest timer', () => {
  it('derives remaining time from timestamps, not ticks', () => {
    const r = startRest(initial().rest, 90, T0);
    expect(restRemainingMs(r, T0)).toBe(s(90));
    // A 40s gap (e.g. phone asleep) is reflected exactly on the next read.
    expect(restRemainingMs(r, T0 + s(40))).toBe(s(50));
    expect(restRemainingMs(r, T0 + s(500))).toBe(0);
  });

  it('pauses and resumes without losing or gaining time', () => {
    let r = startRest(initial().rest, 60, T0);
    r = pauseRest(r, T0 + s(10));
    expect(r.status).toBe('paused');
    expect(restRemainingMs(r, T0 + s(300))).toBe(s(50)); // frozen while paused
    r = resumeRest(r, T0 + s(300));
    expect(restRemainingMs(r, T0 + s(320))).toBe(s(30));
  });

  it('adds and removes 15 seconds while running or paused', () => {
    let r = startRest(initial().rest, 60, T0);
    r = adjustRest(r, 15, T0 + s(10));
    expect(restRemainingMs(r, T0 + s(10))).toBe(s(65));
    expect(r.durationMs).toBe(s(75));
    r = adjustRest(r, -15, T0 + s(10));
    expect(restRemainingMs(r, T0 + s(10))).toBe(s(50));

    let p = pauseRest(startRest(initial().rest, 30, T0), T0);
    p = adjustRest(p, 15, T0 + s(99));
    expect(p.status).toBe('paused');
    expect(restRemainingMs(p, T0 + s(999))).toBe(s(45));
  });

  it('finishes immediately when −15s takes it past zero', () => {
    const r = adjustRest(startRest(initial().rest, 30, T0), -15, T0 + s(20));
    expect(r.status).toBe('finished');
    expect(restRemainingMs(r, T0 + s(20))).toBe(0);
  });

  it('ignores adjustments when idle', () => {
    const r = initial().rest;
    expect(adjustRest(r, 15, T0)).toBe(r);
  });

  it('settles into finished at the exact end time', () => {
    const r = startRest(initial().rest, 30, T0);
    expect(settleRest(r, T0 + s(29)).status).toBe('running');
    const done = settleRest(r, T0 + s(45));
    expect(done.status).toBe('finished');
    expect(done.finishedAt).toBe(T0 + s(30));
  });

  it('remembers the last length for one-tap starts and clamps bad input', () => {
    const r = startRest(initial().rest, 120, T0);
    expect(r.lastDurationMs).toBe(s(120));
    expect(startRest(initial().rest, -5, T0).durationMs).toBe(s(1));
    expect(startRest(initial().rest, 99_999, T0).durationMs).toBe(s(3600));
  });

  it('emits a single end cue while running', () => {
    const r = startRest(initial().rest, 60, T0);
    expect(restCues(r, T0)).toEqual([{ at: T0 + s(60), kind: 'restDone' }]);
    expect(restCues(pauseRest(r, T0 + s(1)), T0 + s(1))).toEqual([]);
  });
});

describe('stopwatch', () => {
  it('excludes paused time and keeps the first start time', () => {
    let sw = startStopwatch(initial().stopwatch, T0);
    expect(stopwatchElapsedMs(sw, T0 + s(30))).toBe(s(30));
    sw = pauseStopwatch(sw, T0 + s(30));
    expect(stopwatchElapsedMs(sw, T0 + s(600))).toBe(s(30));
    sw = startStopwatch(sw, T0 + s(600));
    expect(stopwatchElapsedMs(sw, T0 + s(615))).toBe(s(45));
    expect(sw.firstStartedAt).toBe(T0);
  });

  it('is idempotent for repeated start / pause', () => {
    const sw = startStopwatch(initial().stopwatch, T0);
    expect(startStopwatch(sw, T0 + s(5))).toBe(sw);
    const paused = pauseStopwatch(sw, T0 + s(5));
    expect(pauseStopwatch(paused, T0 + s(9))).toBe(paused);
  });

  it('links to a workout and resets cleanly', () => {
    let st = timerReducer(initial(), { type: 'stopwatch/start', now: T0 });
    st = timerReducer(st, { type: 'stopwatch/link', workoutId: 'w1' });
    expect(st.stopwatch.linkedWorkoutId).toBe('w1');
    st = timerReducer(st, { type: 'stopwatch/reset' });
    expect(st.stopwatch).toEqual(initial().stopwatch);
  });
});

describe('interval timer', () => {
  const cfg: IntervalConfig = {
    warmupSec: 10,
    workSec: 20,
    restSec: 10,
    rounds: 3,
    cooldownSec: 15,
  };

  it('builds warm-up → work/rest rounds (no trailing rest) → cool-down', () => {
    const plan = buildIntervalPlan(cfg);
    expect(plan.map((p) => `${p.kind}${p.round || ''}`)).toEqual([
      'warmup',
      'work1',
      'rest1',
      'work2',
      'rest2',
      'work3',
      'cooldown',
    ]);
    expect(intervalTotalMs(cfg)).toBe(s(10 + 20 * 3 + 10 * 2 + 15));
  });

  it('skips zero-length optional phases', () => {
    const plan = buildIntervalPlan({ ...cfg, warmupSec: 0, cooldownSec: 0, restSec: 0 });
    expect(plan.map((p) => p.kind)).toEqual(['work', 'work', 'work']);
  });

  it('reports phase, round and time left from elapsed time', () => {
    const st = startInterval(cfg, T0);
    let snap = intervalSnapshot(st, T0 + s(5));
    expect(snap.segment?.kind).toBe('warmup');
    expect(snap.segmentRemainingMs).toBe(s(5));

    snap = intervalSnapshot(st, T0 + s(10 + 20 + 10 + 7)); // 7s into work round 2
    expect(snap.segment).toMatchObject({ kind: 'work', round: 2 });
    expect(snap.segmentRemainingMs).toBe(s(13));
    expect(snap.totalRounds).toBe(3);

    snap = intervalSnapshot(st, T0 + s(10_000));
    expect(snap.status).toBe('finished');
    expect(snap.segment).toBeNull();
  });

  it('freezes while paused and continues on resume', () => {
    let st = startInterval(cfg, T0);
    st = pauseInterval(st, T0 + s(12));
    expect(intervalSnapshot(st, T0 + s(500)).segmentRemainingMs).toBe(s(18));
    st = resumeInterval(st, T0 + s(500));
    expect(intervalSnapshot(st, T0 + s(503)).segmentRemainingMs).toBe(s(15));
  });

  it('skips to the next phase and finishes on the last one', () => {
    let st = startInterval(cfg, T0);
    st = skipIntervalSegment(st, T0 + s(2)); // skip warm-up
    expect(intervalSnapshot(st, T0 + s(2)).segment).toMatchObject({ kind: 'work', round: 1 });
    const total = intervalTotalMs(cfg);
    const nearEnd = { ...st, accumulatedMs: total - s(1), runningSince: T0 + s(2) };
    expect(skipIntervalSegment(nearEnd, T0 + s(2)).status).toBe('finished');
  });

  it('settles to finished with the exact finish time', () => {
    const st = startInterval(cfg, T0);
    const total = intervalTotalMs(cfg);
    expect(settleInterval(st, T0 + total - 1).status).toBe('running');
    const done = settleInterval(st, T0 + total + s(30));
    expect(done.status).toBe('finished');
    expect(done.finishedAt).toBe(T0 + total);
  });

  it('schedules 3-2-1 ticks and a distinct cue for each phase change', () => {
    const st = startInterval(
      { warmupSec: 5, workSec: 4, restSec: 2, rounds: 2, cooldownSec: 0 },
      T0,
    );
    const cues = intervalCues(st, T0);
    expect(cues.map((c) => [(c.at - T0) / 1000, c.kind])).toEqual([
      [2, 'tick'],
      [3, 'tick'],
      [4, 'tick'],
      [5, 'work'],
      [6, 'tick'],
      [7, 'tick'],
      [8, 'tick'],
      [9, 'rest'],
      // rest is only 2s long: ticks never start before the segment itself
      [10, 'tick'],
      [11, 'work'],
      [12, 'tick'],
      [13, 'tick'],
      [14, 'tick'],
      [15, 'done'],
    ]);
    // Past cues are dropped, and a paused session schedules nothing.
    expect(intervalCues(st, T0 + s(9.5))[0]).toEqual({ at: T0 + s(10), kind: 'tick' });
    expect(intervalCues(pauseInterval(st, T0 + s(1)), T0 + s(1))).toEqual([]);
  });

  it('sanitises configuration values', () => {
    expect(
      sanitizeIntervalConfig({ workSec: 0, restSec: -3, rounds: 500, warmupSec: Number.NaN }),
    ).toEqual({ warmupSec: 0, workSec: 1, restSec: 0, rounds: 99, cooldownSec: 0 });
  });

  it('only accepts configuration changes when not running', () => {
    let st = timerReducer(initial(), { type: 'interval/configure', config: { rounds: 5 } });
    expect(st.interval.config.rounds).toBe(5);
    st = timerReducer(st, { type: 'interval/start', now: T0 });
    const after = timerReducer(st, { type: 'interval/configure', config: { rounds: 9 } });
    expect(after).toBe(st);
  });
});

describe('persistence', () => {
  it('round-trips through JSON so a refresh resumes exactly', () => {
    let st = initial();
    st = timerReducer(st, { type: 'rest/start', durationSec: 90, now: T0 });
    st = timerReducer(st, { type: 'stopwatch/start', now: T0 - s(600) });
    st = timerReducer(st, { type: 'interval/start', now: T0 });
    const restored = parseTimerState(serializeTimerState(st));
    expect(restored).toEqual(st);
    // After a "reload" 20s later the remaining time is still correct.
    expect(restRemainingMs(restored.rest, T0 + s(20))).toBe(s(70));
    expect(stopwatchElapsedMs(restored.stopwatch, T0 + s(20))).toBe(s(620));
  });

  it('falls back to defaults for missing, corrupt or old-version data', () => {
    expect(parseTimerState(null)).toEqual(initial());
    expect(parseTimerState('{not json')).toEqual(initial());
    expect(parseTimerState(JSON.stringify({ version: 0 }))).toEqual(initial());
  });

  it('repairs inconsistent fields instead of crashing', () => {
    const raw = JSON.stringify({
      version: 1,
      rest: { status: 'running', endsAt: null },
      stopwatch: { status: 'running', runningSince: null, accumulatedMs: 5000 },
      interval: { status: 'bogus', config: { rounds: 'x' } },
      settings: { sound: false },
    });
    const st = parseTimerState(raw);
    expect(st.rest.status).toBe('idle');
    expect(st.stopwatch.status).toBe('paused');
    expect(st.interval.status).toBe('idle');
    expect(st.interval.config.rounds).toBe(8);
    expect(st.settings).toEqual({
      sound: false,
      vibration: true,
      keepAwake: true,
      notifications: false,
    });
  });
});

describe('settle action', () => {
  it('returns the same object when nothing changed (no needless re-renders)', () => {
    const st = timerReducer(initial(), { type: 'rest/start', durationSec: 60, now: T0 });
    expect(timerReducer(st, { type: 'settle', now: T0 + s(1) })).toBe(st);
    expect(timerReducer(st, { type: 'settle', now: T0 + s(61) }).rest.status).toBe('finished');
  });
});
