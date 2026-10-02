/**
 * Sound and vibration cues for the Timer feature, with no audio files and no
 * extra dependencies: tones are synthesised with the Web Audio API.
 *
 * Cues are *pre-scheduled* on the AudioContext clock instead of being played
 * from a JS interval. Browsers throttle timers in background tabs (to once a
 * second, or once a minute after a while), but the audio clock keeps running,
 * so a scheduled beep still lands on time. Schedules are rebuilt whenever the
 * timer state changes (start, pause, ±15s, skip…), and refreshed periodically
 * so long sessions only keep a short window of oscillators queued.
 *
 * Browsers only allow audio after a user gesture. `unlockAudio()` is called
 * from every timer button, and once from the first tap anywhere after a reload.
 */

import type { Cue, CueKind } from '@/lib/timerEngine';
import { timerLog } from '@/lib/timerLogger';

type Channel = 'rest' | 'interval';

interface Tone {
  /** Offset from the cue time, in seconds. */
  offset: number;
  freq: number;
  /** Optional end frequency for a slide. */
  freqEnd?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

/** Each phase has its own recognisable pattern. */
const TONES: Record<CueKind, Tone[]> = {
  // Short neutral blip for the 3-2-1 countdown.
  tick: [{ offset: 0, freq: 880, duration: 0.09, type: 'sine', gain: 0.35 }],
  // Work: urgent double high beep.
  work: [
    { offset: 0, freq: 1320, duration: 0.12, type: 'square', gain: 0.22 },
    { offset: 0.16, freq: 1320, duration: 0.22, type: 'square', gain: 0.22 },
  ],
  // Rest: one long, low, soft tone.
  rest: [{ offset: 0, freq: 440, duration: 0.45, type: 'sine', gain: 0.45 }],
  // Warm-up: gentle rising slide.
  warmup: [{ offset: 0, freq: 520, freqEnd: 780, duration: 0.4, type: 'triangle', gain: 0.4 }],
  // Cool-down: gentle falling slide.
  cooldown: [{ offset: 0, freq: 780, freqEnd: 440, duration: 0.5, type: 'triangle', gain: 0.4 }],
  // Session complete: ascending three-note arpeggio.
  done: [
    { offset: 0, freq: 660, duration: 0.15, type: 'triangle', gain: 0.4 },
    { offset: 0.18, freq: 880, duration: 0.15, type: 'triangle', gain: 0.4 },
    { offset: 0.36, freq: 1320, duration: 0.35, type: 'triangle', gain: 0.4 },
  ],
  // Rest timer finished: three bright beeps.
  restDone: [
    { offset: 0, freq: 988, duration: 0.14, type: 'square', gain: 0.2 },
    { offset: 0.22, freq: 988, duration: 0.14, type: 'square', gain: 0.2 },
    { offset: 0.44, freq: 1318, duration: 0.3, type: 'square', gain: 0.2 },
  ],
};

/** Vibration patterns (ms on/off). Ignored where the API is unsupported (e.g. iOS Safari). */
export const VIBRATION: Record<CueKind, number[]> = {
  tick: [40],
  work: [120, 80, 120],
  rest: [300],
  warmup: [200],
  cooldown: [200],
  done: [200, 100, 200, 100, 400],
  restDone: [250, 120, 250, 120, 400],
};

/** Only keep this far ahead queued on the audio clock. */
export const SCHEDULE_HORIZON_MS = 5 * 60 * 1000;

let ctx: AudioContext | null = null;
const scheduled: Record<Channel, OscillatorNode[]> = { rest: [], interval: [] };
let unlockListener: (() => void) | null = null;

/** Called whenever audio becomes playable, so pending cues can be (re)scheduled. */
export function setAudioUnlockListener(listener: (() => void) | null): void {
  unlockListener = listener;
}

/** The context only if it already exists and is allowed to play. */
function runningContext(): AudioContext | null {
  return ctx && ctx.state === 'running' ? ctx : null;
}

/** Create the context lazily. Only call this from a user gesture. */
function getContext(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) {
    timerLog.warn('audio.unsupported');
    return null;
  }
  try {
    ctx = new Ctor();
    return ctx;
  } catch (error) {
    timerLog.warn('audio.create_failed', { error: String(error) });
    return null;
  }
}

/** Create/resume the AudioContext. Call from a user gesture. */
export function unlockAudio(): void {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === 'running') return;
  audio
    .resume()
    .then(() => {
      timerLog.debug('audio.unlocked');
      unlockListener?.();
    })
    .catch((error: unknown) => {
      timerLog.warn('audio.resume_failed', { error: String(error) });
    });
}

function playTones(audio: AudioContext, kind: CueKind, startAt: number): OscillatorNode[] {
  return TONES[kind].map((tone) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const t0 = startAt + tone.offset;
    const t1 = t0 + tone.duration;
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.freqEnd) osc.frequency.linearRampToValueAtTime(tone.freqEnd, t1);
    // Short attack/release envelope avoids clicks.
    const peak = tone.gain ?? 0.3;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
    return osc;
  });
}

function cancel(channel: Channel): void {
  for (const osc of scheduled[channel]) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // Already stopped — nothing to do.
    }
  }
  scheduled[channel] = [];
}

/**
 * Replace every queued sound on a channel with the given cues.
 * Cues in the past or beyond the horizon are skipped.
 */
export function scheduleCues(channel: Channel, cues: Cue[], enabled: boolean): void {
  cancel(channel);
  if (!enabled || cues.length === 0) return;
  // Never create or schedule onto a locked context: its clock is frozen, so the
  // cues would land late. The unlock listener reschedules once audio is allowed.
  const audio = runningContext();
  if (!audio) {
    timerLog.debug('audio.schedule_deferred', { channel, reason: ctx ? ctx.state : 'no-context' });
    return;
  }

  const nowEpoch = Date.now();
  const nowAudio = audio.currentTime;
  let count = 0;
  for (const cue of cues) {
    const delta = cue.at - nowEpoch;
    if (delta <= 0 || delta > SCHEDULE_HORIZON_MS) continue;
    scheduled[channel].push(...playTones(audio, cue.kind, nowAudio + delta / 1000));
    count += 1;
  }
  timerLog.debug('audio.scheduled', { channel, cues: count, contextState: audio.state });
}

/** Play a cue right now (used for previews and as a fallback). */
export function playCueNow(kind: CueKind, enabled: boolean): void {
  if (!enabled) return;
  const audio = runningContext();
  if (!audio) return;
  playTones(audio, kind, audio.currentTime + 0.01);
}

export function vibrate(kind: CueKind, enabled: boolean): void {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  // Browsers block vibration until the user has interacted with the page.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(VIBRATION[kind]);
  } catch (error) {
    timerLog.warn('vibrate.failed', { error: String(error) });
  }
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Stop everything (e.g. when the provider unmounts). */
export function cancelAllCues(): void {
  cancel('rest');
  cancel('interval');
}
