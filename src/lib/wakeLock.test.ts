import { describe, expect, it, vi } from 'vitest';
import { createWakeLockController, type WakeLockEnv } from '@/lib/wakeLock';

/** Minimal stand-in for a WakeLockSentinel that can be released externally. */
function fakeSentinel() {
  const listeners: (() => void)[] = [];
  const sentinel = {
    released: false,
    release: vi.fn(async () => {
      sentinel.released = true;
      listeners.forEach((l) => l());
    }),
    addEventListener: (_type: string, l: () => void) => listeners.push(l),
    /** Simulate the browser dropping the lock (page hidden). */
    drop: () => {
      sentinel.released = true;
      listeners.forEach((l) => l());
    },
  };
  return sentinel;
}

function setup(visible = true) {
  const sentinels: ReturnType<typeof fakeSentinel>[] = [];
  let isVisible = visible;
  const env: WakeLockEnv = {
    request: vi.fn(async () => {
      const s = fakeSentinel();
      sentinels.push(s);
      return s as unknown as WakeLockSentinel;
    }),
    isVisible: () => isVisible,
  };
  const controller = createWakeLockController(env);
  return { env, controller, sentinels, setVisible: (v: boolean) => (isVisible = v) };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('wake lock controller', () => {
  it('acquires when wanted and releases when not', async () => {
    const { controller, sentinels } = setup();
    controller.setWanted(true);
    await flush();
    expect(controller.isHeld()).toBe(true);
    controller.setWanted(false);
    expect(controller.isHeld()).toBe(false);
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('does not stack requests when asked repeatedly', async () => {
    const { controller, env } = setup();
    controller.setWanted(true);
    controller.setWanted(true);
    await flush();
    controller.setWanted(true);
    expect(env.request).toHaveBeenCalledTimes(1);
  });

  it('re-acquires after the browser drops the lock and the page is visible again', async () => {
    const { controller, env, sentinels, setVisible } = setup();
    controller.setWanted(true);
    await flush();
    setVisible(false);
    sentinels[0].drop();
    expect(controller.isHeld()).toBe(false);
    controller.onVisible(); // still hidden: no request
    expect(env.request).toHaveBeenCalledTimes(1);
    setVisible(true);
    controller.onVisible();
    await flush();
    expect(env.request).toHaveBeenCalledTimes(2);
    expect(controller.isHeld()).toBe(true);
  });

  it('releases a lock that arrives after it stopped being wanted', async () => {
    const { controller, sentinels } = setup();
    controller.setWanted(true);
    controller.setWanted(false); // before the request resolves
    await flush();
    expect(controller.isHeld()).toBe(false);
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('is a no-op when the API is unsupported', () => {
    const controller = createWakeLockController({ request: null, isVisible: () => true });
    controller.setWanted(true);
    expect(controller.isHeld()).toBe(false);
  });
});
