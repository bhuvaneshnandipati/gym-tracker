import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Runs public/sw-notifications.js in a fake service-worker global and checks
 * when the backup rest timer shows its notification.
 */
type Listener = (event: unknown) => void;

function loadWorker(windowVisible: boolean) {
  const listeners: Record<string, Listener[]> = {};
  const shown: { title: string; options: { data?: { restId?: string } } }[] = [];
  const self = {
    addEventListener: (type: string, fn: Listener) => {
      (listeners[type] ??= []).push(fn);
    },
    clients: {
      matchAll: async () => [{ visibilityState: windowVisible ? 'visible' : 'hidden' }],
      openWindow: async () => null,
    },
    registration: {
      getNotifications: async () => shown.map((n) => ({ data: n.options.data })),
      showNotification: async (title: string, options: { data?: { restId?: string } }) => {
        shown.push({ title, options });
      },
    },
  };
  const source = readFileSync(path.resolve(__dirname, '../../public/sw-notifications.js'), 'utf8');
  vm.runInNewContext(source, { self, setTimeout, clearTimeout, Date, Promise });

  const pending: Promise<unknown>[] = [];
  const post = (data: Record<string, unknown>) => {
    for (const fn of listeners.message ?? []) {
      fn({ data, waitUntil: (p: Promise<unknown>) => pending.push(p) });
    }
  };
  return { post, shown, settle: () => Promise.all(pending) };
}

describe('sw-notifications backup rest timer', () => {
  beforeEach(() => vi.useFakeTimers({ now: 1_000_000 }));
  afterEach(() => vi.useRealTimers());

  it('shows "Rest finished" at the end time when the app is in the background', async () => {
    const w = loadWorker(false);
    w.post({ type: 'rest:schedule', id: 'rest-1060000', at: 1_060_000 });
    await vi.advanceTimersByTimeAsync(59_000);
    expect(w.shown).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1_000);
    await w.settle();
    expect(w.shown).toHaveLength(1);
    expect(w.shown[0].title).toBe('Rest finished');
    expect(w.shown[0].options.data?.restId).toBe('rest-1060000');
  });

  it('leaves a real rest to the page while the app is on screen', async () => {
    const w = loadWorker(true);
    w.post({ type: 'rest:schedule', id: 'rest-1001000', at: 1_001_000 });
    await vi.advanceTimersByTimeAsync(1_000);
    await w.settle();
    expect(w.shown).toHaveLength(0);
  });

  it('always shows the test notification, even with the app on screen', async () => {
    const w = loadWorker(true);
    w.post({
      type: 'rest:schedule',
      id: 'test-1010000',
      at: 1_010_000,
      title: 'Test: rest finished',
      always: true,
    });
    await vi.advanceTimersByTimeAsync(10_000);
    await w.settle();
    expect(w.shown.map((n) => n.title)).toEqual(['Test: rest finished']);
  });

  it('does not fire after the rest is cancelled', async () => {
    const w = loadWorker(false);
    w.post({ type: 'rest:schedule', id: 'rest-1005000', at: 1_005_000 });
    w.post({ type: 'rest:cancel' });
    await vi.advanceTimersByTimeAsync(10_000);
    await w.settle();
    expect(w.shown).toHaveLength(0);
  });
});
