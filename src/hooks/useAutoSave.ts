import { useCallback, useEffect, useRef, useState } from 'react';

/** Lifecycle of the auto-save indicator. */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Status reported once a flush has settled (never 'saving'). */
export type SettledStatus = Exclude<SaveStatus, 'saving'>;

interface UseAutoSaveOptions<T> {
  /** The value to persist, or null when there is nothing valid to save yet. */
  data: T | null;
  /** Fingerprint of `data`. A change here is what schedules a save. */
  signature: string | null;
  /** Persists the value. Rejections surface as a 'Save failed' status. */
  save: (data: T) => Promise<void>;
  /** Debounce window in milliseconds. */
  delay?: number;
  /** When false, nothing is scheduled or flushed. */
  enabled?: boolean;
}

export interface AutoSaveController {
  status: SaveStatus;
  /** True when the current value has not been persisted yet. */
  dirty: boolean;
  /** Persist immediately, bypassing the debounce. Resolves with the outcome. */
  flush: () => Promise<SettledStatus>;
  /** Forget the persisted fingerprint (e.g. after starting a new record). */
  reset: () => void;
}

/**
 * Debounced auto-save.
 *
 * - Saves at most one payload at a time; edits made mid-flight are coalesced
 *   into a single follow-up write.
 * - Skips the write entirely when the fingerprint matches what was last
 *   persisted, so no duplicate database writes are issued.
 * - Saves go to the on-device store, so they work the same online or
 *   offline; reaching the database is left to "Sync to cloud".
 * - Flushes on tab hide / pagehide, and warns on unload while still dirty.
 */
export function useAutoSave<T>({
  data,
  signature,
  save,
  delay = 800,
  enabled = true,
}: UseAutoSaveOptions<T>): AutoSaveController {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [dirty, setDirty] = useState(false);

  const dataRef = useRef<T | null>(data);
  const signatureRef = useRef<string | null>(signature);
  const savedSignatureRef = useRef<string | null>(null);
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);
  const runningRef = useRef<Promise<SettledStatus> | null>(null);
  const queuedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  dataRef.current = data;
  signatureRef.current = signature;
  saveRef.current = save;
  enabledRef.current = enabled;

  const isDirty = useCallback(
    () => signatureRef.current != null && signatureRef.current !== savedSignatureRef.current,
    [],
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(async (): Promise<SettledStatus> => {
    clearTimer();

    if (!enabledRef.current) return 'idle';

    // Coalesce: wait for any in-flight write, then persist the newest value.
    while (runningRef.current) {
      queuedRef.current = true;
      await runningRef.current;
      clearTimer();
    }

    const signatureToSave = signatureRef.current;
    const payload = dataRef.current;

    if (signatureToSave == null || payload == null) return 'idle';
    if (signatureToSave === savedSignatureRef.current) return 'saved';

    setStatus('saving');

    const run = (async (): Promise<SettledStatus> => {
      try {
        await saveRef.current(payload);
        savedSignatureRef.current = signatureToSave;
        const stillDirty = signatureRef.current !== signatureToSave;
        setDirty(stillDirty);
        setStatus('saved');
        return 'saved';
      } catch {
        setStatus('error');
        return 'error';
      } finally {
        runningRef.current = null;
      }
    })();

    runningRef.current = run;
    const outcome = await run;

    // Only chase further changes after a success; a failure waits for the next
    // edit or reconnect so a broken save can never spin.
    if (outcome === 'saved' && (queuedRef.current || isDirty())) {
      queuedRef.current = false;
      timerRef.current = window.setTimeout(() => void flush(), 0);
    } else {
      queuedRef.current = false;
    }

    return outcome;
  }, [clearTimer, isDirty]);

  // Schedule a save whenever the value changes.
  useEffect(() => {
    if (!enabled) return;
    if (signature == null) {
      setDirty(false);
      return;
    }
    if (signature === savedSignatureRef.current) {
      setDirty(false);
      return;
    }

    setDirty(true);

    timerRef.current = window.setTimeout(() => void flush(), delay);
    return clearTimer;
  }, [signature, enabled, delay, flush, clearTimer]);

  // Best-effort flush when the tab is hidden or the page is going away.
  useEffect(() => {
    if (!enabled) return;

    const flushIfDirty = () => {
      if (isDirty()) void flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushIfDirty();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty()) return;
      void flush();
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushIfDirty);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushIfDirty);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [enabled, flush, isDirty]);

  useEffect(() => clearTimer, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    queuedRef.current = false;
    savedSignatureRef.current = null;
    setDirty(false);
    setStatus('idle');
  }, [clearTimer]);

  return { status, dirty, flush, reset };
}
